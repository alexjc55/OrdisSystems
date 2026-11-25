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
      // Simulate an already declined browser notification permission. The forced
      // timeout below otherwise accelerates the unrelated notification overlay.
      if ('Notification' in window) {
        Object.defineProperty(Notification, 'permission', { value: 'denied', configurable: true });
      }
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
    await page.click('[role="tab"][id$="-trigger-themes"]');
    await page.wait("!!document.querySelector('[data-testid=\"theme-create\"]')");
    const setInput = async (selector: string, value: string) => {
      await page.evaluate(`(() => {
        const input = document.querySelector(${JSON.stringify(selector)});
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
      })()`);
    };
    const themeByName = (name: string) => `(async () => {
      const response = await fetch('/api/admin/themes');
      return (await response.json()).find(t => t.name === ${JSON.stringify(name)});
    })()`;
    // Save directly from the basic tab, without ever opening colors/visuals.
    await page.click('[data-testid="theme-create"]');
    await page.wait("!!document.querySelector('[role=\"dialog\"] #name')");
    await setInput('[role="dialog"] #name', "Basic fixture theme");
    await page.evaluate("document.querySelector('[role=\"dialog\"] form').requestSubmit()");
    await page.wait(themeByName("Basic fixture theme"));
    await page.wait("!document.querySelector('[role=\"dialog\"]')");
    // Fill controls, switch tabs and save; inactive controls must not disappear.
    await page.click('[data-testid="theme-create"]');
    await page.wait("!!document.querySelector('[role=\"dialog\"] #name')");
    await setInput('[role="dialog"] #name', "Color fixture theme");
    await page.click('[role="dialog"] [role="tab"][id$="-trigger-colors"]');
    await setInput('[role="dialog"] input[name="primaryColor"]', "#123456");
    await page.click('[role="dialog"] [role="tab"][id$="-trigger-basic"]');
    await page.evaluate("document.querySelector('[role=\"dialog\"] form').requestSubmit()");
    await page.wait(themeByName("Color fixture theme"));
    await page.wait("!document.querySelector('[role=\"dialog\"]')");
    const savedTheme = await page.evaluate(themeByName("Color fixture theme"));
    assert.equal(savedTheme.primaryColor, "hsl(210, 65%, 20%)");
    assert.equal(await page.evaluate(`(async () =>
      (await fetch('/api/admin/themes/${savedTheme.id}/activate', {method:'POST'})).status)()`),
      200, "Applying a newly saved theme must work on a clean schema");
    // Also exercise the API's exact 21-character standard value, not just HEX.
    const apiStatus = await page.evaluate(`(async () => {
      const body = ${JSON.stringify(savedTheme)};
      delete body.id;
      body.name = 'Default HSL API theme';
      body.primaryColor = 'hsl(24.6, 95%, 53.1%)';
      body.isActive = false;
      Object.assign(body, {guestPromoEnabled:false, guestPromoText:'',
        guestPromoText_en:'', guestPromoText_he:'', guestPromoText_ar:''});
      return (await fetch('/api/admin/themes', {method:'POST',
        headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)})).status;
    })()`);
    assert.equal(apiStatus, 201, "Standard HSL color must fit the actual database");
    await page.click(`[data-testid="theme-edit-${savedTheme.id}"]`);
    await page.wait("!!document.querySelector('[role=\"dialog\"] #edit-name')");
    await setInput('[role="dialog"] #edit-name', "Renamed fixture theme");
    // Name-only edit must preserve colors even without opening their tab.
    await page.evaluate("document.querySelector('[role=\"dialog\"] form').requestSubmit()");
    await page.wait(themeByName("Renamed fixture theme"));
    await page.wait("!document.querySelector('[role=\"dialog\"]')");
    await page.reload();
    await page.wait("document.body?.innerText.includes('Панель загружается медленно')");
    await page.wait("!!document.querySelector('[role=\"tab\"][id$=\"-trigger-themes\"]')");
    await page.click('[role="tab"][id$="-trigger-themes"]');
    await page.wait(`!!document.querySelector('[data-testid="theme-edit-${savedTheme.id}"]')`);
    await page.click(`[data-testid="theme-edit-${savedTheme.id}"]`);
    await page.wait("document.querySelector('[role=\"dialog\"] #edit-name')?.value === 'Renamed fixture theme'");
    const reloaded = await page.evaluate(themeByName("Renamed fixture theme"));
    assert.equal(reloaded.id, savedTheme.id);
    assert.equal(reloaded.primaryColor, savedTheme.primaryColor);
    // The existing update API canonicalizes HEX colors to HSL.
    assert.equal(savedTheme.secondaryColor, "#f8fafc");
    assert.equal(reloaded.secondaryColor, "hsl(210, 40%, 98%)");
    assert.deepEqual(browser.errors, []);
    if (process.env.CLEAN_INSTALL_SCREENSHOT) {
      writeFileSync(process.env.CLEAN_INSTALL_SCREENSHOT, Buffer.from(await page.screenshot(), "base64"));
    }
    console.log("Verified signed-in admin, settings, theme creation from basic/switched tabs, editing, color preservation and reload.");
  } finally { await page.close(); }
} finally { await browser.close(); }

function asyncReadyExpression() {
  return `(async () => {
    const response = await fetch('/api/settings');
    return response.ok && (await response.json()).storeName === 'Configured fixture shop';
  })()`;
}
