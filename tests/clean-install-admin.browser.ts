// Full application + real authentication + disposable PostgreSQL, not a UI mock.
// Called by scripts/prepare-clean-install.mjs with only its synthetic session.
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { launchChromium } from "./helpers/chromium-session";

const origin = process.env.CLEAN_INSTALL_ORIGIN || "";
const cookie = process.env.CLEAN_INSTALL_COOKIE || "";
assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
assert.equal(process.env.CLEAN_INSTALL_TESTS, "1");
assert.ok(cookie.startsWith("connect.sid="));
const browser = await launchChromium();
try {
  const page = await browser.page(origin, [], {
    emptyStylesheetOrigins: ["https://fonts.googleapis.com"],
    viewport: { width: 1280, height: 900 },
    // Force the loading -> timeout -> ready path that used to violate hook order.
    delayRequest: url => new URL(url).pathname === "/api/settings" ? 1400 : 0,
    initScript: `
      localStorage.setItem('language', 'ru');
      const originalTimeout = window.setTimeout;
      window.setTimeout = function(callback, timeout, ...args) {
        return originalTimeout(callback, timeout === 30000 ? 150 : timeout, ...args);
      };
    `,
  });
  try {
    await page.setSessionCookie("connect.sid", cookie.slice("connect.sid=".length));
    await page.navigate("/admin");
    await page.wait("document.body?.innerText.includes('Панель загружается медленно')");
    await page.wait("!!document.querySelector('[role=\"tab\"][id$=\"-trigger-store-settings\"]')");
    assert.ok(!(await page.evaluate("document.body.innerText")).includes("Что-то пошло не так"));
    await page.reload();
    await page.wait("document.body?.innerText.includes('Панель загружается медленно')");
    await page.wait("!!document.querySelector('[role=\"tab\"][id$=\"-trigger-store-settings\"]')");
    await page.evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Не сейчас')?.click()");
    await page.click('[role="tab"][id$="-trigger-store-settings"]');
    await page.wait("!!document.querySelector('input[name=\"storeName\"]')");
    await page.evaluate(`(() => {
      const input = document.querySelector('input[name="storeName"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Configured fixture shop');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await page.evaluate("document.querySelector('input[name=\"storeName\"]').closest('form').requestSubmit()");
    await page.wait(asyncReadyExpression());
    assert.equal(await page.evaluate(`(async () => {
      const response = await fetch('/api/settings');
      return (await response.json()).storeName;
    })()`), "Configured fixture shop");
    await page.reload();
    await page.wait("document.body?.innerText.includes('Панель загружается медленно')");
    await page.wait("!!document.querySelector('[role=\"tab\"][id$=\"-trigger-store-settings\"]')");
    await page.click('[role="tab"][id$="-trigger-store-settings"]');
    await page.wait("document.querySelector('input[name=\"storeName\"]')?.value === 'Configured fixture shop'");
    assert.deepEqual(browser.errors, []);
    if (process.env.CLEAN_INSTALL_SCREENSHOT) {
      writeFileSync(process.env.CLEAN_INSTALL_SCREENSHOT, Buffer.from(await page.screenshot(), "base64"));
    }
    console.log("Verified signed-in admin rendering, delayed settings, timeout recovery, reload and saving settings.");
  } finally { await page.close(); }
} finally { await browser.close(); }

function asyncReadyExpression() {
  return `(async () => {
    const response = await fetch('/api/settings');
    return response.ok && (await response.json()).storeName === 'Configured fixture shop';
  })()`;
}
