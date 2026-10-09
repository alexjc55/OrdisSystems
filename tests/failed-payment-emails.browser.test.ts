// Opt-in interaction tests of the real component, never a store API or database.
// EMAIL_PANEL_BROWSER_TESTS=1 node --import tsx --test tests/failed-payment-emails.browser.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import WebSocket from "ws";

test("email panel collapses, counts all pages, retries, refreshes and supports RTL",
  { skip: process.env.EMAIL_PANEL_BROWSER_TESTS !== "1", timeout: 90000 }, async () => {
    const languages = ["ru", "en", "he", "ar"];
    const translations = Object.fromEntries(languages.map(lang => [
      lang, JSON.parse(readFileSync(`client/src/locales/${lang}/admin.json`, "utf8")).orders.failedPaymentEmails,
    ]));
    const bundle = await build({
      stdin: {
        contents: `import React from "react";
          import {createRoot} from "react-dom/client";
          import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
          import {FailedPaymentEmails} from "./client/src/components/admin/failed-payment-emails";
          const lang = new URLSearchParams(location.search).get("lang");
          createRoot(document.getElementById("root")).render(
            <QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>
              <FailedPaymentEmails isRTL={lang === "he" || lang === "ar"}/>
            </QueryClientProvider>);`,
        resolveDir: process.cwd(), loader: "tsx",
      },
      bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic",
      define: { "process.env.NODE_ENV": '"test"' },
      plugins: [{
        name: "isolated-panel-context",
        setup(builder) {
          builder.onResolve({ filter: /^@\/hooks\/(use-language|use-toast)$/ }, args => ({
            path: args.path, namespace: "panel-context",
          }));
          builder.onLoad({ filter: /.*/, namespace: "panel-context" }, args => ({
            contents: args.path.endsWith("use-toast")
              ? "export const useToast = () => ({toast: () => {}});"
              : `const dictionaries = ${JSON.stringify(translations)};
                export const useAdminTranslation = () => ({t: (key, options) => {
                  const lang = new URLSearchParams(location.search).get("lang");
                  return (dictionaries[lang][key.split(".").pop()] || key)
                    .replace(/{{count}}/g, String(options?.count ?? ""));
                }});`,
            loader: "js",
          }));
        },
      }],
    });
    let failed = new Set<number>();
    let unavailable = false;
    const server = createServer((req, res) => {
      const url = new URL(req.url!, "http://fixture.test");
      if (url.pathname === "/bundle.js") {
        res.setHeader("content-type", "text/javascript");
        res.end(bundle.outputFiles[0].text);
      } else if (url.pathname.startsWith("/api/")) {
        res.setHeader("content-type", "application/json");
        if (unavailable) { res.writeHead(503); res.end('{"message":"Queue unavailable"}'); return; }
        if (req.method === "POST") {
          failed.delete(Number(url.pathname.split("/").at(-2)));
          res.end('{"queued":true}');
          return;
        }
        const before = Number(url.searchParams.get("before") ?? Infinity);
        const ids = [...failed].filter(id => id < before).sort((a, b) => b - a);
        res.end(JSON.stringify({
          totalCount: failed.size,
          nextCursor: ids.length > 50 ? ids[49] : null,
          items: ids.slice(0, 50).map(id => ({ id, orderId: 1000 + id, audience: "guest", attempts: 8 })),
        }));
      } else {
        res.setHeader("content-type", "text/html");
        res.end('<div id="root"></div><script src="/bundle.js"></script>');
      }
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const port = (server.address() as { port: number }).port;
    const profile = await mkdtemp(join(tmpdir(), "email-panel-browser-"));
    const browser = spawn(process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium", [
      "--headless", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=0",
      "--no-first-run", `--user-data-dir=${profile}`,
    ]);
    let socket: WebSocket | undefined;
    try {
      const wsUrl = await new Promise<string>((resolve, reject) => {
        browser.stderr.on("data", chunk => {
          const match = chunk.toString().match(/DevTools listening on (ws:\/\/[^\s]+)/);
          if (match) resolve(match[1]);
        });
        browser.on("error", reject);
        browser.on("exit", code => reject(new Error(`Chromium exited: ${code}`)));
      });
      socket = new WebSocket(wsUrl);
      await once(socket, "open");
      let id = 0;
      const browserErrors: unknown[] = [];
      const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
      const send = (method: string, params: object = {}, sessionId?: string): Promise<any> =>
        new Promise((resolve, reject) => {
          pending.set(++id, { resolve, reject });
          socket!.send(JSON.stringify({ id, method, params, sessionId }));
        });
      socket.on("message", bytes => {
        const message = JSON.parse(bytes.toString());
        if (message.method === "Runtime.exceptionThrown") browserErrors.push(message.params.exceptionDetails);
        if (!message.id) return;
        const waiter = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) waiter?.reject(new Error(JSON.stringify(message.error)));
        else waiter?.resolve(message.result);
      });
      const { targetId } = await send("Target.createTarget", { url: "about:blank" });
      const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
      await send("Page.enable", {}, sessionId);
      await send("Runtime.enable", {}, sessionId);
      await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true }, sessionId);
      const evaluate = async (expression: string) => {
        const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
        if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
        return result.result.value;
      };
      const waitFor = async (expression: string) => {
        for (let i = 0; i < 150; i++) {
          if (await evaluate(expression)) return;
          await new Promise(resolve => setTimeout(resolve, 40));
        }
        throw new Error(`Timed out: ${expression}; browser errors: ${JSON.stringify(browserErrors)}`);
      };
      for (const lang of languages) {
        failed = new Set(Array.from({ length: 52 }, (_, i) => i + 1));
        unavailable = false;
        await send("Page.navigate", { url: `http://127.0.0.1:${port}/?lang=${lang}` }, sessionId);
        await waitFor(`document.querySelector('button[aria-expanded]')?.textContent.includes('52')`);
        assert.equal(await evaluate(`document.querySelector('button[aria-expanded]').getAttribute('aria-expanded')`), "false");
        assert.equal(await evaluate(`document.querySelector('table') === null`), true);
        assert.equal(await evaluate(`document.querySelector('[dir]').dir`), lang === "he" || lang === "ar" ? "rtl" : "ltr");
        await evaluate(`document.querySelector('button[aria-expanded]').click()`);
        await waitFor(`document.querySelectorAll('tbody tr').length === 50`);
        await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(translations[lang].next)}).click()`);
        await waitFor(`document.querySelectorAll('tbody tr').length === 2`);
        assert.equal(await evaluate(`document.querySelector('button[aria-expanded]').textContent.includes('52')`), true);
        await evaluate(`document.querySelector('tbody button').click()`);
        await waitFor(`document.querySelector('button[aria-expanded]').textContent.includes('51')`);
        await evaluate(`document.querySelector('button[aria-expanded]').click()`);
        assert.equal(await evaluate(`document.querySelector('table') === null`), true);
        failed.clear();
        await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(translations[lang].refresh)}).click()`);
        await waitFor(`!document.querySelector('button[aria-expanded] [aria-label]')`);
        unavailable = true;
        await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(translations[lang].refresh)}).click()`);
        await waitFor(`document.querySelector('[role=status]')?.textContent.includes(${JSON.stringify(translations[lang].countUnavailable)})`);
        assert.equal(await evaluate(`document.querySelector('button[aria-expanded]').getAttribute('aria-expanded')`), "false");
      }
    } finally {
      socket?.close();
      browser.kill();
      await once(browser, "exit").catch(() => {});
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
      await rm(profile, { recursive: true, force: true });
    }
  });
