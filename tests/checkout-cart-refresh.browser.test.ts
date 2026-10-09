// Opt-in browser regression check. Uses the existing ws dependency and a local
// Chromium executable; every API response is intercepted, never store data.
// CHECKOUT_BROWSER_TESTS=1 node --import tsx --test tests/checkout-cart-refresh.browser.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import WebSocket from "ws";
import { readFileSync } from "node:fs";

test("checkout recovery preserves forms/date and requires explicit consent in four languages for guests and customers",
  { skip: process.env.CHECKOUT_BROWSER_TESTS !== "1", timeout: 180000 }, async t => {
    const browser = spawn(process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium", [
      "--headless", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=0",
      "--no-first-run", "--user-data-dir=/tmp/checkout-recovery-browser-" + process.pid,
    ]);
    let socket: WebSocket | undefined;
    try {
      const wsUrl = await new Promise<string>((resolve, reject) => {
        let log = "";
        browser.stderr.on("data", chunk => {
          log += chunk.toString();
          const match = log.match(/DevTools listening on (ws:\/\/[^\s]+)/);
          if (match) resolve(match[1]);
        });
        browser.on("error", reject);
        browser.on("exit", code => reject(new Error(`Chromium exited: ${code}`)));
      });
      socket = new WebSocket(wsUrl);
      await once(socket, "open");
      let id = 0;
      const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
      const interceptors = new Map<string, (params: any) => Promise<void>>();
      const send = (method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<any> =>
        new Promise((resolve, reject) => {
          const requestId = ++id;
          pending.set(requestId, { resolve, reject });
          socket!.send(JSON.stringify({ id: requestId, method, params, sessionId }));
        });
      socket.on("message", bytes => {
        const message = JSON.parse(bytes.toString());
        if (message.id) {
          const waiter = pending.get(message.id);
          pending.delete(message.id);
          if (message.error) waiter?.reject(new Error(JSON.stringify(message.error)));
          else waiter?.resolve(message.result);
        } else if (message.method === "Fetch.requestPaused") {
          void interceptors.get(message.sessionId)?.(message.params);
        }
      });
      for (const lang of (process.env.CHECKOUT_TEST_LANGUAGE ? [process.env.CHECKOUT_TEST_LANGUAGE] : ["ru", "en", "he", "ar"])) {
        for (const authenticated of [false, true]) {
          await t.test(`${lang}: ${authenticated ? "customer" : "guest"}`, async () => {
            const { targetId } = await send("Target.createTarget", { url: "about:blank" });
            const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
            await send("Page.enable", {}, sessionId);
            const evaluate = async (expression: string) => {
              const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
              if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
              return result.result.value;
            };
            const wait = async (expression: string | (() => boolean)) => {
              for (let retry = 0; retry < 150; retry++) {
                if (typeof expression === "string" ? await evaluate(expression) : expression()) return;
                await new Promise(resolve => setTimeout(resolve, 100));
              }
              throw new Error(`Timed out: ${expression}\n${await evaluate("document.body.innerText")}\nCart: ${await evaluate("localStorage.getItem('restaurant-cart-storage')")}`);
            };
            let refresh = false;
            let failRefresh = false;
            let emptyCatalog = false;
            let onlineProviderEnabled = true;
            const payments: any[] = [];
            const catalogRequests: string[] = [];
            const old = {
              id: 1, name: "Весовой товар", name_en: "Weighted item", name_he: "מוצר במשקל", name_ar: "منتج بالوزن",
              price: "4", pricePerKg: "40", unit: "100g", isActive: true, isAvailable: true,
              availabilityStatus: "available", isSpecialOffer: true, discountType: "percentage", discountValue: "50",
              minOrderQuantity: null, maxOrderQuantity: null,
            };
            const unavailable = { ...old, id: 2, name: "Удалённый товар" };
            const settings = {
              storeName: "Checkout test", checkoutGuestFirst: true, defaultLanguage: lang,
              enabledLanguages: ["ru", "en", "he", "ar"], deliveryTimeMode: "disabled",
              deliveryFee: "15", freeDeliveryFrom: "30", weekStartDay: "sunday",
              workingHours: Object.fromEntries(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map(day => [day, "00:00-23:59"])),
              paymentMethods: [], paymentProviderConfig: { active: "hyp", configured: true },
            };
            interceptors.set(sessionId, async ({ requestId, request }: any) => {
              const url = new URL(request.url);
              let status = 200;
              let body: any = [];
              if (url.pathname === "/api/auth/user") {
                status = authenticated ? 200 : 401;
                body = authenticated ? { id: "test-buyer", username: "Buyer", firstName: "Buyer", email: "buyer@example.test", phone: "0501234567", role: "customer" } : {};
              } else if (url.pathname === "/api/config") body = {
                branchesEnabled: true,
                paymentProviders: { hyp: onlineProviderEnabled, grow: false, allpay: false, payme: false },
              };
              else if (url.pathname === "/api/branches") body = [{ id: 7, name: "Test branch", isActive: true }];
              else if (url.pathname === "/api/settings") {
                status = failRefresh ? 503 : 200;
                body = { ...settings, deliveryFee: refresh ? "20" : "15" };
              } else if (url.pathname === "/api/loyalty/context") body = {
                loyaltyDiscountEnabled: true, loyaltyDiscountPercent: refresh ? 20 : 10, giftEnabled: false,
              };
              else if (url.pathname === "/api/products") {
                catalogRequests.push(url.search);
                body = emptyCatalog ? [] : refresh ? [{ ...old, price: "10", isSpecialOffer: false, discountType: null, discountValue: null, availabilityStatus: "out_of_stock_today" }] : [old, unavailable];
              } else if (url.pathname === "/api/products/volume-discounts") body = refresh
                ? { 1: [{ minQuantity: "250", discountType: "percentage", discountValue: "10" }] } : {};
              else if (url.pathname === "/api/payment/initiate") {
                payments.push(JSON.parse(request.postData));
                refresh = true;
                status = 409; body = { code: "CART_PRICE_CHANGED", message: "Cart price changed" };
              } else if (url.pathname === "/api/themes/active") body = null;
              await send("Fetch.fulfillRequest", {
                requestId, responseCode: status,
                responseHeaders: [{ name: "Content-Type", value: "application/json" }],
                body: Buffer.from(JSON.stringify(body)).toString("base64"),
              }, sessionId);
            });
            await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*", requestStage: "Request" }] }, sessionId);
            await send("Page.addScriptToEvaluateOnNewDocument", { source: `
              localStorage.setItem('language', ${JSON.stringify(lang)});
              localStorage.setItem('selectedBranchId', '7');
              localStorage.setItem('restaurant-cart-storage', JSON.stringify({
                state: { items: [
                  { product: ${JSON.stringify(old)}, quantity: 375, totalPrice: 7.5 },
                  { product: ${JSON.stringify(unavailable)}, quantity: 100, totalPrice: 2 }
                ] }, version: 0
              }));
            ` }, sessionId);
            const origin = process.env.CHECKOUT_TEST_ORIGIN || `https://${process.env.REPLIT_DEV_DOMAIN}`;
            await send("Page.navigate", { url: `${origin}/${lang}/checkout` }, sessionId);
            const addressSelector = authenticated ? "#address" : "#guestAddress";
            await wait(`!!document.querySelector(${JSON.stringify(addressSelector)})`);
            await evaluate(`(() => {
              for (const [selector, value] of ${JSON.stringify(authenticated
                ? [["#address", "Test address 12"], ["#phone", "0501234567"]]
                : [["#guestFirstName", "Buyer"], ["#guestLastName", "Test"], ["#guestEmail", "buyer@example.test"], ["#guestPhone", "0501234567"], ["#guestAddress", "Test address 12"]])}) {
                const input = document.querySelector(selector);
                if (!input) throw new Error('Missing input ' + selector);
                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
                input.dispatchEvent(new Event('input', { bubbles: true }));
              }
              const form = document.querySelector(${JSON.stringify(addressSelector)}).closest('form');
              form.querySelector('button[aria-haspopup="dialog"]').click();
            })()`);
            await wait(`!!document.querySelector('[role="dialog"] table')`);
            await evaluate(`(() => {
              const date = new Date(); date.setDate(date.getDate() + 1);
              const tomorrow = [...document.querySelectorAll('[role="dialog"] table button')]
                .find(button => button.textContent === String(date.getDate()) && !button.classList.contains('day-outside'));
              if (!tomorrow || tomorrow.disabled) throw new Error('Tomorrow is not selectable');
              tomorrow.click();
            })()`);
            const formExpression = `document.querySelector(${JSON.stringify(addressSelector)}).closest('form')`;
            await evaluate(`${formExpression}.querySelector('[role="combobox"]').click()`);
            await wait(`!!document.querySelector('[role="option"]')`);
            await evaluate(`[...document.querySelectorAll('[role="option"]')].at(-1).click()`);
            const dateBefore = await evaluate(`${formExpression}.querySelector('button[aria-haspopup="dialog"]').textContent`);
            await evaluate(`${formExpression}.requestSubmit()`);
            await wait(`!!document.querySelector('[data-testid="refresh-checkout-cart"]')`);
            assert.equal(payments.length, 1);
            assert.equal(await evaluate(`${formExpression}.querySelector('button[type="submit"]').disabled`), true);
            // One case verifies a failed request leaves the old cart/form intact and can be retried.
            if (lang === "en" && !authenticated) failRefresh = true;
            await evaluate(`document.querySelector('[data-testid="refresh-checkout-cart"]').click()`);
            if (failRefresh) {
              await wait(`!document.querySelector('[data-testid="refresh-checkout-cart"]').disabled`);
              assert.equal(await evaluate("JSON.parse(localStorage.getItem('restaurant-cart-storage')).state.items.length"), 2);
              assert.equal(await evaluate("!!document.querySelector('[data-testid=\"confirm-checkout-total\"]')"), false);
              failRefresh = false;
              await evaluate(`document.querySelector('[data-testid="refresh-checkout-cart"]').click()`);
            }
            await wait(`!!document.querySelector('[data-testid="confirm-checkout-total"]')`);
            assert.equal(payments.length, 1, "refresh must not initiate payment");
            assert.ok(catalogRequests.includes("?branchId=7"));
            assert.equal(await evaluate(`${formExpression}.querySelector('button[aria-haspopup="dialog"]').textContent`), dateBefore);
            assert.equal(await evaluate(`document.querySelector(${JSON.stringify(addressSelector)}).value`), "Test address 12");
            const saved = await evaluate("JSON.parse(localStorage.getItem('restaurant-cart-storage')).state.items");
            assert.equal(saved.length, 1);
            assert.equal(saved[0].quantity, 375);
            assert.equal(saved[0].totalPrice, 37.5);
            assert.equal(saved[0].product.isSpecialOffer, false);
            const translated = JSON.parse(readFileSync(`client/src/locales/${lang}/shop.json`, "utf8")).checkout;
            const total = authenticated ? "₪47.00" : "₪33.75";
            assert.ok((await evaluate(`document.querySelector('[data-testid="checkout-cart-refresh"]').textContent`))
              .includes(translated.cartRefreshTotal.replace("{{total}}", total)));
            await evaluate(`${formExpression}.requestSubmit()`);
            await new Promise(resolve => setTimeout(resolve, 100));
            assert.equal(payments.length, 1, "submit/Enter cannot bypass review");
            await evaluate(`document.querySelector('[data-testid="confirm-checkout-total"]').click()`);
            await wait(`!${formExpression}.querySelector('button[type="submit"]').disabled`);
            await evaluate(`${formExpression}.requestSubmit()`);
            await wait(() => payments.length === 2);
            await wait(`!!document.querySelector('[data-testid="refresh-checkout-cart"]') && ${formExpression}.querySelector('button[type="submit"]').disabled`);
            assert.equal(payments.length, 2);
            assert.equal(payments[1].totalAmount, authenticated ? "47.00" : "33.75");
            assert.equal(payments[1].orderData.deliveryDate, payments[0].orderData.deliveryDate);
            if (lang === "en" && !authenticated) {
              emptyCatalog = true;
              await evaluate(`document.querySelector('[data-testid="refresh-checkout-cart"]').click()`);
              await wait("JSON.parse(localStorage.getItem('restaurant-cart-storage')).state.items.length === 0");
              assert.equal(await evaluate(`document.querySelector(${JSON.stringify(addressSelector)}).value`), "Test address 12");
              assert.equal(await evaluate(`${formExpression}.querySelector('button[aria-haspopup="dialog"]').textContent`), dateBefore);
              assert.equal(await evaluate(`${formExpression}.querySelector('button[type="submit"]').disabled`), true);
            }
            if (lang === "en" && authenticated) {
              // A saved provider must not offer online payment when disabled.
              // An unrelated offline option must remain available.
              onlineProviderEnabled = false;
              settings.paymentMethods = [{ id: 1, name: "Cash", name_en: "Cash", name_he: "Cash", name_ar: "Cash" }] as any;
              await send("Page.reload", {}, sessionId);
              await wait(`!!document.querySelector('#address') && document.body.textContent.includes('Cash')`);
              assert.equal(await evaluate(`!!document.querySelector('[value="__online__"]')`), false);
              assert.equal(payments.length, 2);
            }
            await send("Target.closeTarget", { targetId });
            interceptors.delete(sessionId);
          });
        }
      }
    } finally {
      socket?.close();
      browser.kill("SIGTERM");
    }
  });
