import assert from "node:assert/strict";
import { test } from "node:test";
import { PAYMENT_PROVIDER_NAMES } from "../shared/payment-provider-availability";
import { getPaymentProviderAvailability, preserveDisabledPaymentConfig } from "../server/lib/payment-providers/availability";
import { getProvider, type PaymentProviderConfig } from "../server/lib/payment-providers";
import { publicPaymentConfig } from "../server/lib/payment-providers/public-config";

test("omitted flags preserve existing stores; each provider can be disabled independently", () => {
  assert.deepEqual(getPaymentProviderAvailability({}), { hyp: true, grow: true, allpay: true, payme: true });
  for (const provider of PAYMENT_PROVIDER_NAMES) {
    for (const value of ["false", "FALSE", "0", " false "]) {
      const availability = getPaymentProviderAvailability({ [`PAYMENT_${provider.toUpperCase()}_ENABLED`]: value });
      for (const name of PAYMENT_PROVIDER_NAMES) assert.equal(availability[name], name !== provider);
    }
  }
  assert.throws(() => getPaymentProviderAvailability({ PAYMENT_HYP_ENABLED: "maybe" }), /PAYMENT_HYP_ENABLED/);
  assert.throws(() => getPaymentProviderAvailability({ PAYMENT_PAYME_ENABLED: "" }), /PAYMENT_PAYME_ENABLED/);
});

test("disabled providers keep stored credentials and historical processing, but are unavailable publicly", () => {
  const keys = PAYMENT_PROVIDER_NAMES.map(name => `PAYMENT_${name.toUpperCase()}_ENABLED`);
  const originals = keys.map(key => process.env[key]);
  const config: PaymentProviderConfig = { active: "hyp", hyp: { masof: "fixture", passP: "fixture", key: "fixture" } };
  try {
    for (const key of keys) process.env[key] = "false";
    assert.deepEqual(getPaymentProviderAvailability(), { hyp: false, grow: false, allpay: false, payme: false });
    assert.deepEqual(publicPaymentConfig(config), { active: "hyp", configured: false });
    assert.equal(getProvider({ paymentProviderConfig: config })?.name, "hyp");
    assert.strictEqual(preserveDisabledPaymentConfig({ active: "none" }, config), config);
    process.env.PAYMENT_GROW_ENABLED = "true";
    assert.strictEqual(preserveDisabledPaymentConfig({ active: "hyp" }, config), config);
    assert.throws(() => preserveDisabledPaymentConfig({ active: "payme" }, config), /payment_provider_disabled/);
    const allowed = { active: "grow" };
    assert.strictEqual(preserveDisabledPaymentConfig(allowed, config), allowed);
  } finally {
    keys.forEach((key, index) => {
      if (originals[index] === undefined) delete process.env[key];
      else process.env[key] = originals[index];
    });
  }
});
