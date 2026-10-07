import assert from "node:assert/strict";
import { test } from "node:test";
import crypto from "node:crypto";
import type { PendingPayment } from "../shared/schema";
import { HypProvider, GrowProvider, AllPayProvider, PaymeProvider } from "../server/lib/payment-providers";
import { publicPaymentConfig } from "../server/lib/payment-providers/public-config";
import { checkoutVerification, merchantFingerprint, money, type VerificationInput } from "../server/lib/payment-providers/verification";

function input(payload: Record<string, any>, source: "callback" | "webhook" = "webhook"): VerificationInput {
  return {
    pending: { token: "known-token", transactionId: null, orderData: { totalAmount: "10" },
      verification: { provider: "test", merchant: "merchant", amountInAgorot: 1000, j5: false,
        notifySecret: "private-notification-secret", saleId: "trusted-sale" },
    } as PendingPayment,
    payload, source, notifySecret: "private-notification-secret",
  };
}
// Independent implementation of the documented scalar notification signing example.
function allPaySign(body: Record<string, any>, key = "allpay-private-key") {
  const values = Object.keys(body).filter(k => k !== "sign" && body[k] !== "" && body[k] != null)
    .sort().map(k => String(body[k]));
  return crypto.createHash("sha256").update([...values, key].join(":")).digest("hex");
}
function signed(body: Record<string, any>, key?: string) {
  return { ...body, sign: allPaySign(body, key) };
}
async function withFetch(run: () => Promise<void>, response: (url: string, opts?: RequestInit) => Response) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, opts) => response(String(url), opts);
  try { await run(); } finally { globalThis.fetch = original; }
}

test("AllPay requires a valid whole-payload signature and exact token, sum, currency, merchant and charge type", async () => {
  const provider = new AllPayProvider("merchant-login", "allpay-private-key");
  const payload = { order_id: "known-token", add_field_1: "known-token", status: 1, amount: 10, currency: "ILS" };
  assert.equal(await provider.verifyPayment(input(signed(payload))), "known-token");
  for (const payloadChange of [
    { sign: undefined }, { sign: "f".repeat(64) }, { sign: "א".repeat(64) },
    { amount: 1 }, { order_id: "another-order" }, { currency: "USD" }, { status: 0 },
  ]) {
    await assert.rejects(provider.verifyPayment(input({ ...signed(payload), ...payloadChange })));
  }
  for (const change of [
    { amount: 1 }, { order_id: "another-order" }, { add_field_1: "another-order" },
    { currency: "USD" }, { login: "another-merchant" }, { type: "chargeback_revert" },
    { subscription_create: 0 }, { status: 0 },
  ]) await assert.rejects(provider.verifyPayment(input(signed({ ...payload, ...change }))));
  await assert.rejects(provider.verifyPayment(input(signed(payload, "another-store-key"))));
  const replay = input(signed(payload));
  replay.pending.transactionId = "different-transaction";
  await assert.rejects(provider.verifyPayment(replay));
});

test("AllPay browser return queries the merchant API, never trusts redirect status", async () => {
  const provider = new AllPayProvider("merchant-login", "allpay-private-key");
  let response = { order_id: "known-token", status: 0, amount: 10, currency: "ILS" };
  await withFetch(async () => {
    await assert.rejects(provider.verifyPayment(input({ status: 1 }, "callback")));
    response.status = 1;
    assert.equal(await provider.verifyPayment(input({}, "callback")), "known-token");
    response.amount = 1;
    await assert.rejects(provider.verifyPayment(input({}, "callback")));
  }, (url, opts) => {
    assert.equal(url, "https://allpay.to/app/?show=paymentstatus&mode=api12");
    const body = JSON.parse(String(opts?.body));
    assert.equal(body.login, "merchant-login");
    assert.equal(body.order_id, "known-token");
    assert.equal(body.sign, allPaySign(body));
    return Response.json(response);
  });
});

test("HYP verifies the signed legacy callback with merchant credentials; Amount is ILS, not agorot", async () => {
  const provider = new HypProvider("terminal", "password", "key");
  const payload = { Id: "real-id", CCode: "0", Amount: "10.00", Order: "known-token", Sign: "gateway-signature" };
  let answer = "CCode=200";
  let calls = 0;
  await withFetch(async () => {
    await assert.rejects(provider.verifyPayment(input(payload, "callback")));
    answer = "CCode=0";
    assert.equal(await provider.verifyPayment(input(payload, "callback")), "real-id");
    assert.equal(await provider.verifyPayment(input(payload)), "real-id");
    const legacy = input({ ...payload, Amount: "1000.00" });
    legacy.pending.verification = null;
    assert.equal(await provider.verifyPayment(legacy), "real-id");
    await assert.rejects(provider.verifyPayment(input({ ...payload, Amount: "1000.00" })));
    answer = "<html>CCode=0</html>";
    await assert.rejects(provider.verifyPayment(input(payload)));
    const previous = calls;
    for (const change of [{ Sign: undefined }, { Amount: "1" }, { Masof: "other-terminal" },
      { Order: "other-token" }, { Coin: "2" }, { CCode: "1" }, { Id: undefined }]) {
      await assert.rejects(provider.verifyPayment(input({ ...payload, ...change })));
    }
    assert.equal(calls, previous, "invalid local facts never reach the gateway");
  }, (url) => {
    calls++;
    const params = new URL(url).searchParams;
    assert.equal(params.get("What"), "VERIFY");
    assert.equal(params.get("KEY"), "key");
    assert.equal(params.get("Masof"), "terminal");
    assert.deepEqual([...params.keys()].slice(-5), ["Id", "CCode", "Amount", "Order", "Sign"]);
    return new Response(answer);
  });
  await withFetch(async () => {
    const result = await provider.initiate({ token: "known-token", amountInAgorot: 1000,
      successUrl: "https://shop.test/success", errorUrl: "https://shop.test/error" });
    assert.ok(result.redirectUrl.startsWith("https://pay.hyp.co.il/"));
  }, url => {
    assert.equal(new URL(url).searchParams.get("Amount"), "10.00");
    return new Response("Amount=10.00&Order=known-token&Sign=signed-request");
  });
});

test("Grow reconciles its own persisted process, paid status, transaction ID and amount (including J5)", async () => {
  const provider = new GrowProvider("user", "key", "page", true);
  const evidence = { transactionId: "real-id", statusCode: "2", sum: "10.00" };
  const i = input({ transactionCode: "real-id" }, "callback");
  i.pending.verification!.processId = "private-process";
  i.pending.verification!.processToken = "private-process-token";
  let status = 1;
  await withFetch(async () => {
    assert.equal(await provider.verifyPayment(i), "real-id");
    await assert.rejects(provider.verifyPayment({ ...i, payload: { transactionCode: "forged-id" } }));
    evidence.sum = "1";
    await assert.rejects(provider.verifyPayment(i));
    evidence.sum = "10";
    evidence.statusCode = "0";
    await assert.rejects(provider.verifyPayment(i));
    evidence.statusCode = "11";
    await assert.rejects(provider.verifyPayment(i));
    i.pending.verification!.j5 = true;
    assert.equal(await provider.verifyPayment(i), "real-id");
    status = 0;
    await assert.rejects(provider.verifyPayment(i));
  }, (url, opts) => {
    assert.equal(url, "https://sandbox.meshulam.co.il/api/light/server/1.0/getPaymentProcessInfo");
    const params = new URLSearchParams(String(opts?.body));
    assert.equal(params.get("processId"), "private-process");
    assert.equal(params.get("processToken"), "private-process-token");
    assert.equal(params.get("pageCode"), "page");
    return Response.json({ status, data: {
      processId: "private-process", processToken: "private-process-token", transactions: [evidence],
    } });
  });
});

test("Grow older transaction pair is verified remotely and bound to the original token", async () => {
  const provider = new GrowProvider("user", "key", "page");
  const i = input({ transactionId: "real-id", transactionToken: "provider-token" });
  i.pending.verification = null;
  const t = { ...i.payload, description: "known-token", statusCode: 2, sum: "10" };
  await withFetch(async () => {
    assert.equal(await provider.verifyPayment(i), "real-id");
    t.description = "another-order";
    await assert.rejects(provider.verifyPayment(i));
  }, (_url, opts) => {
    const params = new URLSearchParams(String(opts?.body));
    assert.equal(params.get("pageCode"), "page");
    assert.equal(params.get("transactionId"), "real-id");
    return Response.json({ status: 1, data: t });
  });
});

test("PayMe MPL and older Grow notifications require a server-only per-payment secret, never browser success", async () => {
  const grow = new GrowProvider("user", "key", "page");
  const payme = new PaymeProvider("private-mpl");
  const g = input({ transactionCode: "real-id", paymentSum: "10", paymentDesc: "known-token" });
  const p = input({ transaction_id: "known-token", payme_sale_id: "trusted-sale", notify_type: "sale-complete",
    status_code: 0, price: 1000, currency: "ILS" });
  assert.equal(await grow.verifyPayment(g), "real-id");
  assert.equal(await payme.verifyPayment(p), "trusted-sale");
  for (const [provider, i] of [[grow, g], [payme, p]] as const) {
    for (const change of [{ notifySecret: undefined }, { notifySecret: "known-token" }, { source: "callback" as const }])
      await assert.rejects(provider.verifyPayment({ ...i, ...change }));
  }
  for (const change of [{ price: 1 }, { currency: "USD" }, { payme_sale_id: "other-sale" },
    { is_token_sale: 1 }, { notify_type: "sale-authorized" }, { status_code: 1 }, { transaction_id: "another-order" }])
    await assert.rejects(payme.verifyPayment({ ...p, payload: { ...p.payload, ...change } }));
  for (const change of [{ paymentSum: "1" }, { paymentDesc: "another-order" }, { statusCode: 0 }])
    await assert.rejects(grow.verifyPayment({ ...g, payload: { ...g.payload, ...change } }));
  p.pending.verification!.j5 = true;
  p.payload.notify_type = "sale-authorized";
  assert.equal(await payme.verifyPayment(p), "trusted-sale");
});

test("private notification URL is not returned to the buyer and existing URL queries remain valid", async () => {
  const params = { token: "known-token", amountInAgorot: 1000, successUrl: "https://shop.test/callback",
    errorUrl: "https://shop.test/callback?status=error", notifyUrl: "https://shop.test/webhook?proof=secret" };
  await withFetch(async () => {
    const grow = await new GrowProvider("user", "key", "page").initiate(params);
    assert.equal(grow.processToken, "process-secret");
    assert.equal(grow.redirectUrl, "https://gateway.test/payment");
    const payme = await new PaymeProvider("mpl").initiate(params);
    assert.equal(payme.saleId, "trusted-sale");
    assert.equal(payme.redirectUrl, "https://gateway.test/payment");
  }, (url, opts) => {
    if (url.endsWith("createPaymentProcess")) {
      const body = new URLSearchParams(String(opts?.body));
      assert.equal(new URL(body.get("notifyUrl")!).searchParams.get("proof"), "secret");
      assert.equal(new URL(body.get("cancelUrl")!).searchParams.get("status"), "error");
      assert.ok(!body.get("successUrl")!.includes("proof"));
      return Response.json({ status: 1, data: {
        url: "https://gateway.test/payment", processId: 123, processToken: "process-secret",
      } });
    }
    const body = JSON.parse(String(opts?.body));
    assert.equal(body.sale_callback_url, params.notifyUrl);
    assert.ok(!body.sale_return_url.includes("proof"));
    return Response.json({ sale_url: "https://gateway.test/payment", payme_sale_id: "trusted-sale" });
  });
});

test("checkout snapshot binds buffered amount and merchant identity, and public config contains no payment credentials", () => {
  const config = { active: "grow" as const, grow: {
    userId: "user", apiKey: "private-key", pageCode: "page", j5Enabled: true, j5BufferPercent: 10,
  } };
  const context = checkoutVerification(config, "grow", 1000);
  assert.equal(context.amountInAgorot, 1100);
  assert.equal(context.j5, true);
  assert.equal(context.notifySecret.length, 64);
  assert.equal(merchantFingerprint(config, "grow"), merchantFingerprint({
    ...config, grow: { ...config.grow, j5Enabled: false, j5BufferPercent: 0 },
  }, "grow"), "operational settings do not change merchant identity");
  assert.notEqual(context.merchant, merchantFingerprint({ ...config, grow: { ...config.grow, pageCode: "other-store" } }, "grow"));
  assert.deepEqual(publicPaymentConfig(config), { active: "grow", configured: true });
  assert.deepEqual(publicPaymentConfig({ active: "none" }), { active: "none", configured: false });
  for (const bad of ["0", "-1", "10x", "NaN", "1.001", {}, []]) assert.throws(() => money(bad));
});
