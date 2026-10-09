// Isolated interaction coverage of the actual admin StoreSettingsForm.
// No running application, authentication, store data, secrets or database needed.
// npm run test:settings-payments
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { launchChromium } from "./helpers/chromium-session";
import {
  createStoreSettingsHarness, paymentConfigFixture, fixtureLogoUrls, type Availability,
} from "./helpers/store-settings-harness";
import { PAYMENT_PROVIDER_NAMES, type PaymentProviderName } from "../shared/payment-provider-availability";

const labels = { hyp: "HYP", grow: "Grow (Meshulam)", allpay: "AllPay", payme: "PayMe" };
const languages = {
  ru: { heading: "Онлайн-оплата", none: "Отключено", dir: "ltr", suffix: "" },
  en: { heading: "Online Payment", none: "None", dir: "ltr", suffix: "En" },
  he: { heading: "תשלום מקוון", none: "מושבת", dir: "rtl", suffix: "He" },
  ar: { heading: "الدفع الإلكتروني", none: "معطل", dir: "rtl", suffix: "Ar" },
};
const credentials = {
  hyp: { hypMasof: paymentConfigFixture.hyp.masof, hypPassP: paymentConfigFixture.hyp.passP, hypKey: paymentConfigFixture.hyp.key },
  grow: { growUserId: paymentConfigFixture.grow.userId, growApiKey: paymentConfigFixture.grow.apiKey, growPageCode: paymentConfigFixture.grow.pageCode },
  allpay: { allpayLogin: paymentConfigFixture.allpay.login, allpayApiKey: paymentConfigFixture.allpay.apiKey },
  payme: { paymeSellerPaymeId: paymentConfigFixture.payme.sellerPaymeId },
};
const flagsFor = (enabled: readonly PaymentProviderName[]): Availability =>
  Object.fromEntries(PAYMENT_PROVIDER_NAMES.map(name => [name, enabled.includes(name)])) as Availability;

test("real admin form preserves payment configurations across provider switches and four languages",
  { skip: process.env.SETTINGS_PAYMENT_BROWSER_TESTS !== "1", timeout: 180000 }, async t => {
    const harness = await createStoreSettingsHarness();
    let browser: Awaited<ReturnType<typeof launchChromium>> | undefined;
    try {
      browser = await launchChromium();
      for (const [language, translation] of Object.entries(languages)) {
        const admin = JSON.parse(readFileSync(`client/src/locales/${language}/admin.json`, "utf8"));
        // The saved-but-disabled case rotates through every provider, including
        // providers whose credentials and production/test defaults differ.
        const disabledStored = PAYMENT_PROVIDER_NAMES[Object.keys(languages).indexOf(language)];
        const scenarios = [
          { name: "all flags false", active: disabledStored, enabled: [] },
          ...PAYMENT_PROVIDER_NAMES.map(provider => ({
            name: `only ${provider} enabled`, active: provider, enabled: [provider],
          })),
          {
            name: `saved ${disabledStored} disabled, alternatives enabled`,
            active: disabledStored,
            enabled: PAYMENT_PROVIDER_NAMES.filter(provider => provider !== disabledStored),
          },
        ];
        for (const scenario of scenarios) {
          await t.test(`${language}: ${scenario.name}`, async () => {
            harness.reset(language, scenario.active, flagsFor(scenario.enabled));
            const initialConfig = structuredClone(harness.settings.paymentProviderConfig);
            const page = await browser!.page(harness.origin, fixtureLogoUrls);
            try {
              const online = `([...document.querySelectorAll('h3')].find(h => h.textContent.trim() === ${JSON.stringify(translation.heading)})?.parentElement.parentElement)`;
              const providerSelect = `${online}?.querySelector('[role="combobox"]')`;
              const field = (name: string) => `document.querySelector('input[name="${name}"]')`;
              const setInput = async (name: string, value: string) => {
                await page.evaluate(`(() => {
                  const input = ${field(name)};
                  if (!input) throw new Error('Missing input: ${name}');
                  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
                  input.dispatchEvent(new Event('input', {bubbles: true}));
                })()`);
              };
              const openDelivery = async () => {
                await page.wait("window.fixtureReady && !!document.querySelector('form')");
                await page.evaluate(`(() => {
                  const heading = [...document.querySelectorAll('h3')]
                    .find(h => h.textContent.trim() === ${JSON.stringify(admin.storeSettings.deliveryPayment)});
                  if (!heading) throw new Error('Missing delivery/payment section');
                  heading.closest('button').click();
                })()`);
                // Ensure a genuinely expanded section, not a passing assertion
                // caused by the containing accordion being closed.
                await page.wait("!!document.querySelector('[name=\"paymentInfo\"]')");
              };
              const assertSection = async (enabled: PaymentProviderName[]) => {
                assert.equal(await page.evaluate(`!!${online}`), enabled.length > 0, "entire online section visibility");
                assert.equal(await page.evaluate(`!!(${providerSelect})`), enabled.length > 0, "provider control visibility");
                assert.equal(await page.evaluate("document.documentElement.dir"), translation.dir);
                assert.equal(await page.evaluate("document.querySelector('form').classList.contains('rtl')"), translation.dir === "rtl");
                if (enabled.length) {
                  assert.equal(await page.evaluate(`${online}.firstElementChild.getAttribute('dir')`), translation.dir);
                }
              };
              const options = async () => {
                await page.evaluate(`${providerSelect}.click()`);
                await page.wait("!!document.querySelector('[role=\"option\"]')");
                return await page.evaluate("[...document.querySelectorAll('[role=\"option\"]')].map(o => o.textContent.trim())") as string[];
              };
              const choose = async (label: string) => {
                if (!await page.evaluate("!!document.querySelector('[role=\"option\"]')")) await options();
                await page.evaluate(`(() => {
                  const option = [...document.querySelectorAll('[role="option"]')]
                    .find(o => o.textContent.trim() === ${JSON.stringify(label)});
                  if (!option || option.getAttribute('aria-disabled') === 'true') throw new Error('Unavailable option');
                  option.click();
                })()`);
                await page.wait("!document.querySelector('[role=\"option\"]')");
                await page.wait(`${providerSelect}.textContent.trim() === ${JSON.stringify(label)}`);
              };
              const assertCredentials = async (selected?: PaymentProviderName) => {
                for (const provider of PAYMENT_PROVIDER_NAMES) {
                  for (const [name, value] of Object.entries(credentials[provider])) {
                    assert.equal(await page.evaluate(`!!${field(name)}`), selected === provider, `${name} visibility`);
                    if (selected === provider) assert.equal(await page.evaluate(`${field(name)}.value`), value, `${name} retained`);
                  }
                }
              };
              const save = async (expectedConfig?: Record<string, any>, preservedConfig = initialConfig) => {
                const count = harness.saves.length;
                assert.deepEqual(await page.evaluate(`([...document.querySelector('form').elements]
                  .filter(el => el.validity && !el.validity.valid)
                  .map(el => ({name:el.name, error:el.validationMessage})))`), [], "fixture must pass native form validation");
                await page.evaluate("document.querySelector('form button[type=\"submit\"]').click()");
                await page.wait(() => harness.saves.length === count + 1);
                await page.wait("!window.fixtureSaving && !document.querySelector('button[type=\"submit\"]').disabled");
                assert.equal(await page.evaluate("window.fixtureSaveError"), null);
                const payload = harness.saves[count];
                if (expectedConfig) {
                  // Deep comparison includes EVERY provider's fixture credentials,
                  // non-default switches and opaque forward-compatible fields.
                  assert.deepEqual(payload.paymentProviderConfig, expectedConfig);
                } else {
                  assert.equal(Object.hasOwn(payload, "paymentProviderConfig"), false,
                    "hidden or saved-disabled config must be omitted, not cleared or replaced with none");
                }
                assert.deepEqual(harness.settings.paymentProviderConfig, expectedConfig ?? preservedConfig);
                return payload;
              };

              await page.navigate(`/?lang=${language}`);
              await openDelivery();
              await assertSection(scenario.enabled);
              const selectedEnabled = scenario.enabled.includes(scenario.active);
              await assertCredentials(selectedEnabled ? scenario.active : undefined);
              if (scenario.enabled.length) {
                assert.equal(await page.evaluate(`${providerSelect}.textContent.trim()`),
                  selectedEnabled ? labels[scenario.active] : translation.none);
                assert.deepEqual(await options(),
                  [translation.none, ...scenario.enabled.map(provider => labels[provider])],
                  "dropdown must contain only none and enabled providers");
                // Escape closes the actual Radix portal without modifying selection.
                await page.evaluate("document.querySelector('[role=\"listbox\"]').dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true}))");
                await page.wait("!document.querySelector('[role=\"option\"]')");
              }
              // Save an unrelated multilingual setting without touching payment.
              await setInput("storeName", `Unrelated ${language} edit`);
              const unrelated = await save(selectedEnabled ? initialConfig : undefined);
              assert.equal(unrelated[`storeName${translation.suffix}`], `Unrelated ${language} edit`);
              await assertCredentials(selectedEnabled ? scenario.active : undefined);

              if (!scenario.enabled.length) {
                // An environment flag may later be re-enabled; saved credentials
                // must reappear unchanged after reload, including RTL cases.
                harness.setFlags(flagsFor([scenario.active]));
                await page.reload();
                await openDelivery();
                await assertSection([scenario.active]);
                assert.deepEqual(await options(), [translation.none, labels[scenario.active]]);
                await choose(labels[scenario.active]);
                await assertCredentials(scenario.active);
                await save(initialConfig);
              } else if (!selectedEnabled) {
                const next = scenario.enabled[0];
                await choose(labels[next]);
                await assertCredentials(next);
                await save({ ...initialConfig, active: next });
                await page.reload();
                await openDelivery();
                assert.equal(await page.evaluate(`${providerSelect}.textContent.trim()`), labels[next]);
                await assertCredentials(next);
              } else {
                // Explicit merchant disabling is different from environment
                // gating: active becomes none but all stored keys survive.
                await choose(translation.none);
                await assertCredentials();
                await save({ ...initialConfig, active: "none" });
                await page.reload();
                await openDelivery();
                assert.equal(await page.evaluate(`${providerSelect}.textContent.trim()`), translation.none);
                await assertCredentials();
                // Unrelated save while explicitly disabled must also retain keys.
                await setInput("storeName", `Disabled ${language} edit`);
                await save(undefined, { ...initialConfig, active: "none" });
                await choose(labels[scenario.active]);
                await assertCredentials(scenario.active);
                await save(initialConfig);
                await page.reload();
                await openDelivery();
                assert.equal(await page.evaluate(`${providerSelect}.textContent.trim()`), labels[scenario.active]);
                await assertCredentials(scenario.active);
              }
            } finally {
              await page.close();
            }
          });
        }
      }
      assert.deepEqual(browser.errors, [], "no browser exceptions or external requests");
      assert.deepEqual(harness.unexpectedRequests, [], "only whitelisted fixture API requests");
    } finally {
      try {
        await browser?.close();
      } finally {
        await harness.close();
      }
    }
  });
