import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import express from "express";
import type { Server } from "node:http";
import type { InsertOrder } from "../shared/schema";
import { quoteCheckout } from "../server/checkout-quote";

if (process.env.PAYMENT_TEST_CLUSTER !== "isolated" ||
    !process.env.PGHOST?.startsWith("/tmp/payment-tests.")) {
  throw new Error("Coupon tests require the disposable payment test database");
}

let pool: typeof import("../server/db").pool;
let storage: typeof import("../server/storage").storage;
let server: Server;
let baseUrl: string;
let productId: number;
const customerId = "coupon-race-customer";
const otherId = "coupon-race-other";

before(async () => {
  const db = await import("../server/db");
  await db.getDB();
  pool = db.pool;
  storage = (await import("../server/storage")).storage;
  productId = (await pool.query(
    "INSERT INTO products (name, price, price_per_kg, unit) VALUES ('Товар', 10, 10, 'piece') RETURNING id",
  )).rows[0].id;
  for (const id of [customerId, otherId]) {
    await storage.upsertUser({ id, username: id, email: `${id}@example.test`, password: "test-only", role: "customer" });
  }
  // Replace only session identity and external push delivery, not checkout/storage.
  (await import("../server/push-notifications")).PushNotificationService.notifyNewOrder = async () => {};
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const id = req.headers["x-test-user"];
    req.isAuthenticated = () => Boolean(id);
    req.user = id ? { id } : undefined;
    next();
  });
  app.use("/api", (await import("../server/routes/orders.routes")).default);
  await new Promise<void>(resolve => { server = app.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(async () => {
  await pool.query(`DELETE FROM coupon_uses; DELETE FROM payment_email_outbox;
    DELETE FROM pending_payments; DELETE FROM order_items; DELETE FROM orders; DELETE FROM coupons`);
  await storage.updateStoreSettings({
    deliveryFee: "0", freeDeliveryFrom: "0", loyaltyDiscountEnabled: false,
    giftEnabled: false, facebookConversionsApiEnabled: false,
    emailNotificationsEnabled: true, orderNotificationEmail: "admin@example.test",
  });
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  if (pool) await pool.end();
});

function body(guest: boolean, code = "RACE") {
  return {
    items: [{ productId, quantity: 1 }], totalAmount: "8", couponCode: code,
    ...(guest ? { guestInfo: {
      firstName: "Guest", lastName: "Buyer", phone: "123", address: "Address",
      email: "guest@example.test", paymentMethod: "cash",
    } } : { deliveryAddress: "Address", paymentMethod: "cash" }),
  };
}

async function post(identity: string | null, code = "RACE") {
  return fetch(`${baseUrl}/api/orders${identity ? "" : "/guest"}`, {
    method: "POST", headers: {
      "Content-Type": "application/json", ...(identity ? { "x-test-user": identity } : {}),
    }, body: JSON.stringify(body(!identity, code)),
  });
}

async function coupon(usageType: string, maxUses: number | null = null, code = "RACE") {
  await pool.query(`INSERT INTO coupons (code, discount_type, discount_value, usage_type, max_uses)
    VALUES ($1, 'fixed', 2, $2, $3)`, [code, usageType, maxUses]);
}

async function counts() {
  return (await pool.query(`SELECT (SELECT count(*)::int FROM orders) AS orders,
    (SELECT count(*)::int FROM order_items) AS items,
    (SELECT count(*)::int FROM payment_email_outbox) AS emails,
    (SELECT count(*)::int FROM coupon_uses) AS uses,
    (SELECT coalesce(sum(current_uses), 0)::int FROM coupons) AS counter`)).rows[0];
}

// Ensure every HTTP request finishes its advisory validation before any commit.
// This deterministically reproduces the former check-then-record race.
async function race(identities: Array<string | null>) {
  const original = storage.createOrder;
  let arrived = 0;
  let release!: () => void;
  const ready = new Promise<void>(resolve => { release = resolve; });
  storage.createOrder = async (...args) => {
    if (++arrived === identities.length) release();
    await ready;
    return original.apply(storage, args);
  };
  try {
    return await Promise.all(identities.map(id => post(id)));
  } finally {
    storage.createOrder = original;
  }
}

for (const identities of [[null, null, null], [customerId, customerId, customerId], [null, customerId, otherId]]) {
  test(`single: exactly one committed guest/auth order (${identities.join(",")})`, { timeout: 15000 }, async () => {
    await coupon("single");
    const responses = await race(identities);
    assert.equal(responses.filter(r => r.ok).length, 1);
    for (const response of responses.filter(r => !r.ok)) {
      assert.equal(response.status, 422);
      assert.equal((await response.json()).couponError, "coupon_max_uses");
    }
    const c = await counts();
    assert.deepEqual({ ...c, emails: undefined }, { orders: 1, items: 1, uses: 1, counter: 1, emails: undefined });
    assert.ok(c.emails === 1 || c.emails === 2);
    const saved = (await pool.query("SELECT total_amount, coupon_discount FROM orders")).rows[0];
    assert.equal(saved.total_amount, "8.00");
    assert.equal(saved.coupon_discount, "2.00");
  });
}

test("maxUses: mixed guest/auth requests cannot exceed the last two uses", { timeout: 15000 }, async () => {
  await coupon("multi", 3);
  assert.ok((await post(null)).ok); // One use already committed.
  const responses = await race([null, customerId, otherId, null, customerId]);
  assert.equal(responses.filter(r => r.ok).length, 2);
  for (const response of responses.filter(r => !r.ok)) {
    assert.equal(response.status, 422);
    assert.equal((await response.json()).couponError, "coupon_max_uses");
  }
  const c = await counts();
  assert.equal(c.orders, 3);
  assert.equal(c.uses, 3);
  assert.equal(c.counter, 3);
});

test("per_customer: concurrent repeats rejected, other customer allowed, guests ineligible", { timeout: 15000 }, async () => {
  await coupon("per_customer");
  const responses = await race([customerId, customerId, customerId]);
  assert.equal(responses.filter(r => r.ok).length, 1);
  for (const response of responses.filter(r => !r.ok)) {
    assert.equal(response.status, 422);
    assert.equal((await response.json()).couponError, "coupon_already_used");
  }
  assert.ok((await post(otherId)).ok);
  const guest = await post(null);
  assert.equal(guest.status, 422);
  assert.equal((await guest.json()).couponError, "coupon_not_eligible");
  assert.equal((await counts()).uses, 2);
  assert.equal((await counts()).counter, 2);
});

test("per_customer: different customers can commit concurrently, but still obey maxUses", { timeout: 15000 }, async () => {
  await coupon("per_customer");
  assert.equal((await race([customerId, otherId])).filter(r => r.ok).length, 2);
  await pool.query("DELETE FROM coupon_uses; DELETE FROM coupons");
  await coupon("per_customer", 1);
  assert.equal((await race([customerId, otherId])).filter(r => r.ok).length, 1);
  assert.equal((await counts()).counter, 1);
});

test("unlimited multi coupon permits all concurrent orders", { timeout: 15000 }, async () => {
  await coupon("multi");
  const responses = await race([null, customerId, otherId, null]);
  assert.equal(responses.filter(r => r.ok).length, 4);
  assert.equal((await counts()).counter, 4);
  assert.equal((await counts()).uses, 4);
});

async function pending(token: string, userId: string | null = null) {
  const payload = body(!userId);
  const quote = await quoteCheckout({
    ...payload, orderData: userId ? payload : {
      guestName: "Guest Buyer", guestEmail: "guest@example.test",
      deliveryAddress: "Address", paymentMethod: "online", couponCode: "RACE",
    },
  }, userId, false, storage);
  return storage.createPendingPayment({
    token, userId, orderData: quote.orderData, orderItems: quote.orderItems,
    status: "pending", expiresAt: new Date(Date.now() + 3600000),
  });
}

test("online: duplicate callbacks consume once and preserve the paid snapshot", async () => {
  await coupon("single");
  const saved = await pending("coupon-online");
  // The commit checks availability, not a new discount against a paid amount.
  await pool.query("UPDATE coupons SET discount_value = 9");
  const results = await Promise.all(Array.from({ length: 8 }, () => storage.finalizePendingPayment(saved.token, "tx-one")));
  assert.equal(results.filter(r => r.created).length, 1);
  assert.equal(new Set(results.map(r => r.orderId)).size, 1);
  assert.deepEqual(await counts(), { orders: 1, items: 1, emails: 2, uses: 1, counter: 1 });
  const order = await storage.getOrderById(results[0].orderId!);
  assert.equal(order?.totalAmount, (saved.orderData as InsertOrder).totalAmount);
  assert.equal(order?.couponDiscount, (saved.orderData as InsertOrder).couponDiscount);
});

test("online and ordinary orders share the same single-use limit", async () => {
  await coupon("single");
  const first = await pending("coupon-first");
  const second = await pending("coupon-second", customerId);
  const results = await Promise.allSettled([
    storage.finalizePendingPayment(first.token, "tx-first"),
    storage.finalizePendingPayment(second.token, "tx-second"),
    post(null),
  ]);
  const successful = results.filter(r => r.status === "fulfilled" &&
    ("created" in r.value ? r.value.created : r.value.ok));
  assert.equal(successful.length, 1);
  assert.equal((await counts()).uses, 1);
  assert.equal((await counts()).orders, 1);
  for (const result of results) {
    if (result.status === "rejected") assert.equal(result.reason.couponError, "coupon_max_uses");
    else if ("ok" in result.value && !result.value.ok) assert.equal(result.value.status, 422);
  }
});

test("online: per-customer and maxUses apply across distinct pending payments", async () => {
  for (const usageType of ["per_customer", "multi"]) {
    await pool.query("DELETE FROM coupon_uses; DELETE FROM coupons");
    await coupon(usageType, usageType === "multi" ? 1 : null);
    const first = await pending(`first-${usageType}`, customerId);
    const second = await pending(`second-${usageType}`, customerId);
    const results = await Promise.allSettled([
      storage.finalizePendingPayment(first.token), storage.finalizePendingPayment(second.token),
    ]);
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    const failure = results.find(r => r.status === "rejected");
    assert.ok(failure?.status === "rejected");
    assert.equal(failure.reason.couponError, usageType === "multi" ? "coupon_max_uses" : "coupon_already_used");
    const unfinished = await storage.getPendingPaymentByToken(
      results[0].status === "rejected" ? first.token : second.token,
    );
    assert.equal(unfinished?.status, "pending");
    assert.equal(unfinished?.orderId, null);
  }
});

for (const [change, expected] of [
  ["UPDATE coupons SET is_active = false", "coupon_inactive"],
  ["UPDATE coupons SET expires_at = now() - interval '1 minute'", "coupon_expired"],
  ["UPDATE coupons SET target_customer_email = 'other@example.test'", "coupon_not_eligible"],
  ["DELETE FROM coupons", "coupon_not_found"],
]) {
  test(`online commit rechecks ${expected} without creating a discounted order`, async () => {
    await coupon("single");
    const saved = await pending(`changed-${expected}`);
    await pool.query(change);
    const initial = await counts();
    await assert.rejects(storage.finalizePendingPayment(saved.token),
      (error: any) => error.isCouponError && error.couponError === expected);
    assert.deepEqual(await counts(), initial);
    const unfinished = await storage.getPendingPaymentByToken(saved.token);
    assert.equal(unfinished?.status, "pending");
    assert.equal(unfinished?.orderId, null);
  });
}

for (const failureTable of ["coupon_uses", "coupons", "payment_email_outbox"]) {
  test(`failure writing ${failureTable} rolls back orders, uses, counter, email and online status`, async () => {
    await coupon("single");
    const saved = await pending(`failure-${failureTable}`);
    await pool.query(`CREATE FUNCTION reject_coupon_write() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'injected coupon test failure'; END $$;
      CREATE TRIGGER reject_coupon_write BEFORE ${failureTable === "coupons" ? "UPDATE" : "INSERT"}
      ON ${failureTable} FOR EACH ROW EXECUTE FUNCTION reject_coupon_write()`);
    try {
      const initial = await counts();
      for (const identity of [null, customerId]) {
        assert.equal((await post(identity)).status, 500);
        assert.deepEqual(await counts(), initial);
      }
      await assert.rejects(storage.finalizePendingPayment(saved.token), /injected coupon test failure/);
      assert.deepEqual(await counts(), initial);
      const unfinished = await storage.getPendingPaymentByToken(saved.token);
      assert.equal(unfinished?.status, "pending");
      assert.equal(unfinished?.orderId, null);
    } finally {
      await pool.query(`DROP TRIGGER reject_coupon_write ON ${failureTable}; DROP FUNCTION reject_coupon_write()`);
    }
    assert.ok((await post(null)).ok, "a rolled-back attempt must not consume the coupon");
  });
}
