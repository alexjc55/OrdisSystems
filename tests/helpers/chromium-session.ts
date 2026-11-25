import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import WebSocket from "ws";

// Small CDP client using the project's existing Chromium/ws test dependencies.
// Each run owns a disposable profile; errors and timeouts reject, never hang.
export async function launchChromium() {
  const profile = await mkdtemp(join(tmpdir(), "store-settings-browser-"));
  const browser = spawn(process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium", [
    "--headless", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=0",
    "--no-first-run", `--user-data-dir=${profile}`,
  ]);
  let socket: WebSocket | undefined;
  let id = 0;
  const pending = new Map<number, {
    resolve: (result: any) => void; reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();
  const listeners = new Map<string, (params: any) => void>();
  const errors: string[] = [];
  const close = async () => {
    for (const waiter of pending.values()) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error("Browser closed"));
    }
    pending.clear();
    socket?.close();
    if (browser.exitCode === null && browser.signalCode === null) {
      const exited = once(browser, "exit");
      browser.kill("SIGTERM");
      await exited;
    }
    // Chromium's helper processes can finish profile writes shortly after its
    // main process exits. Retry directory removal instead of leaking resources.
    await rm(profile, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  };
  try {
    const wsUrl = await new Promise<string>((resolve, reject) => {
      let log = "";
      const timer = setTimeout(() => reject(new Error("Chromium startup timed out")), 15000);
      browser.stderr.on("data", chunk => {
        log += chunk.toString();
        const match = log.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
      browser.on("error", error => { clearTimeout(timer); reject(error); });
      browser.on("exit", code => {
        clearTimeout(timer); reject(new Error(`Chromium exited: ${code}`));
      });
    });
    socket = new WebSocket(wsUrl);
    await once(socket, "open");
    socket.on("message", bytes => {
      const message = JSON.parse(bytes.toString());
      if (message.id) {
        const waiter = pending.get(message.id);
        if (!waiter) return;
        pending.delete(message.id);
        clearTimeout(waiter.timer);
        if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
        else waiter.resolve(message.result);
      } else {
        listeners.get(`${message.sessionId}:${message.method}`)?.(message.params);
      }
    });
    const send = (method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<any> =>
      new Promise((resolve, reject) => {
        const requestId = ++id;
        const timer = setTimeout(() => {
          pending.delete(requestId);
          reject(new Error(`CDP timed out: ${method}`));
        }, 15000);
        pending.set(requestId, { resolve, reject, timer });
        socket!.send(JSON.stringify({ id: requestId, method, params, sessionId }));
      });
    return {
      close,
      errors,
      async page(origin: string, imageFixtures: readonly string[] = [], options: {
        initScript?: string;
        delayRequest?: (url: string) => number;
        emptyStylesheetOrigins?: readonly string[];
        viewport?: { width: number; height: number };
      } = {}) {
        const errorOffset = errors.length;
        const { targetId } = await send("Target.createTarget", { url: "about:blank" });
        const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
        await send("Page.enable", {}, sessionId);
        await send("Runtime.enable", {}, sessionId);
        if (options.viewport) {
          await send("Emulation.setDeviceMetricsOverride", {
            ...options.viewport, deviceScaleFactor: 1, mobile: false,
          }, sessionId);
        }
        listeners.set(`${sessionId}:Runtime.exceptionThrown`, params => {
          errors.push(JSON.stringify(params.exceptionDetails));
        });
        // Block every non-fixture request, including external logos and APIs.
        let navigation = 0;
        listeners.set(`${sessionId}:Fetch.requestPaused`, params => {
          const requestNavigation = navigation;
          const url = new URL(params.request.url);
          if (params.resourceType === "Stylesheet" && options.emptyStylesheetOrigins?.includes(url.origin)) {
            void send("Fetch.fulfillRequest", {
              requestId: params.requestId, responseCode: 200,
              responseHeaders: [{ name: "Content-Type", value: "text/css" }], body: "",
            }, sessionId).catch(error => errors.push(String(error)));
            return;
          }
          if (params.resourceType === "Image" && imageFixtures.includes(params.request.url)) {
            void send("Fetch.fulfillRequest", {
              requestId: params.requestId, responseCode: 200,
              responseHeaders: [{ name: "Content-Type", value: "image/svg+xml" }],
              body: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"/>').toString("base64"),
            }, sessionId).catch(error => errors.push(String(error)));
            return;
          }
          const local = url.origin === origin;
          if (!local) errors.push(`Unexpected network request: ${url.origin}${url.pathname}`);
          const continueRequest = () => {
            // Reload invalidates paused interception IDs from the old document.
            if (requestNavigation !== navigation) return;
            void send(local ? "Fetch.continueRequest" : "Fetch.failRequest", {
              requestId: params.requestId,
              ...(!local ? { errorReason: "BlockedByClient" } : {}),
            }, sessionId).catch(error => {
              if (requestNavigation === navigation) errors.push(String(error));
            });
          };
          const delay = local ? options.delayRequest?.(params.request.url) || 0 : 0;
          if (delay) setTimeout(continueRequest, delay);
          else continueRequest();
        });
        if (options.initScript) {
          await send("Page.addScriptToEvaluateOnNewDocument", { source: options.initScript }, sessionId);
        }
        await send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] }, sessionId);
        const evaluate = async (expression: string) => {
          const result = await send("Runtime.evaluate", {
            expression, returnByValue: true, awaitPromise: true,
          }, sessionId);
          if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
          return result.result.value;
        };
        const wait = async (expression: string | (() => boolean)) => {
          for (let retry = 0; retry < 150; retry++) {
            if (errors.length > errorOffset) throw new Error(errors.slice(errorOffset).join("\n"));
            if (typeof expression === "string" ? await evaluate(expression) : expression()) return;
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          throw new Error(`Timed out: ${expression}\n${await evaluate("document.body.innerText")}\n${errors.join("\n")}`);
        };
        return {
          evaluate, wait,
          async click(selector: string) {
            const point = await evaluate(`(() => {
              const element = document.querySelector(${JSON.stringify(selector)});
              if (!element) throw new Error('Missing click target');
              element.scrollIntoView({block: 'center'});
              const rect = element.getBoundingClientRect();
              if (!rect.width || !rect.height) throw new Error('Hidden click target');
              return {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2};
            })()`);
            for (const type of ["mousePressed", "mouseReleased"]) {
              await send("Input.dispatchMouseEvent", {
                type, ...point, button: "left", clickCount: 1,
              }, sessionId);
            }
          },
          // Install a real, server-issued session in an isolated HTTP fixture.
          // Secure TLS transport is supplied by nginx in production, not here.
          setSessionCookie: (name: string, value: string) => send("Network.setCookie", {
            name, value, url: origin, httpOnly: true, secure: false,
          }, sessionId),
          screenshot: async () => (await send("Page.captureScreenshot", { format: "jpeg", quality: 75 }, sessionId)).data as string,
          navigate: (path: string) => {
            navigation++;
            return send("Page.navigate", { url: `${origin}${path}` }, sessionId);
          },
          reload: () => {
            navigation++;
            return send("Page.reload", {}, sessionId);
          },
          async close() {
            navigation++;
            await send("Target.closeTarget", { targetId });
            for (const key of listeners.keys()) {
              if (key.startsWith(`${sessionId}:`)) listeners.delete(key);
            }
          },
        };
      },
    };
  } catch (error) {
    await close();
    throw error;
  }
}
