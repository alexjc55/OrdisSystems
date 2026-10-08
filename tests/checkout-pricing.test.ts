import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import express from "express";
import type { Server } from "node:http";
import { calculateTotal, effectiveProductPrice } from "../shared/product-pricing";
import { registerCheckoutAccount } from "../client/src/lib/register-checkout-account";
import { HypProvider } from "../server/lib/payment-providers";

if (process.env.PAYMENT_TEST_CLUSTER !== "isolated" ||
    !process.env.PGHOST?.startsWith("/tmp/payment-tests.")) {
  throw new Error("Checkout pricing tests require the disposable payment test database");
}
process.env.BRANCHES_ENABLED = "true";
let pool: typeof import("../server/db").pool;
let storage: typeof import("../server/storage").storage;
let server: Server;
let baseUrl: string;
let registrationServer: Server;
let registrationUrl: string;
let productId: number;
let giftId: number;
let branchId: number;
const customerId = "checkout-pricing-customer";

before(async () => {
  const db = await import("../server/db");
  await db.getDB();
  pool = db.pool;
  storage = (await import("../server/storage")).storage;
  productId = (await pool.query(
    "INSERT INTO products (name, price, price_per_kg, unit) VALUES ('Товар', 10, 999, 'piece') RETURNING id",
  )).rows[0].id;
  giftId = (await pool.query(
    "INSERT INTO products (name, price, price_per_kg, unit) VALUES ('Подарок', 20, 20, 'piece') RETURNING id",
  )).rows[0].id;
  const categoryId = (await pool.query("INSERT INTO categories (name) VALUES ('Категория') RETURNING id")).rows[0].id;
  await pool.query("INSERT INTO product_categories (product_id, category_id) VALUES ($1, $3), ($2, $3)",
    [productId, giftId, categoryId]);
  branchId = (await pool.query("INSERT INTO branches (name) VALUES ('Филиал') RETURNING id")).rows[0].id;
  await storage.upsertUser({
    id: customerId, username: customerId, email: "buyer@pricing.example.test",
    password: "test-only", firstName: "Buyer", role: "customer",
  });
  await storage.upsertUser({
    id: "checkout-pricing-admin", username: "checkout-pricing-admin",
    password: "test-only", role: "admin",
  });
  // Only identity middleware and external push delivery are replaced.
  // Catalog, discounts, persistence, snapshot preparation and routes remain real.
  const push = (await import("../server/push-notifications")).PushNotificationService;
  push.notifyNewOrder = async () => {};
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const id = req.headers["x-test-user"];
    req.isAuthenticated = () => Boolean(id);
    req.user = id ? { id } : undefined;
    next();
  });
  app.use("/api", (await import("../server/routes/orders.routes")).default);
  app.use("/api", (await import("../server/routes/admin/orders.routes")).default);
  await new Promise<void>(resolve => { server = app.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
  await pool.query(`CREATE TABLE IF NOT EXISTS session (
    sid varchar PRIMARY KEY, sess json NOT NULL, expire timestamp NOT NULL
  )`);
  const registrationApp = express();
  registrationApp.use(express.json());
  (await import("../server/auth")).setupAuth(registrationApp);
  registrationApp.use("/api", (await import("../server/routes/profile.routes")).default);
  registrationApp.use("/api", (await import("../server/routes/orders.routes")).default);
  registrationApp.use("/api", (await import("../server/routes/payment.routes")).default);
  await new Promise<void>(resolve => { registrationServer = registrationApp.listen(0, "127.0.0.1", resolve); });
  const registrationAddress = registrationServer.address();
  assert.ok(registrationAddress && typeof registrationAddress !== "string");
  registrationUrl = `http://127.0.0.1:${registrationAddress.port}`;
});

beforeEach(async () => {
  await storage.updateStoreSettings({
    deliveryFee: "15.00", freeDeliveryFrom: "50.00",
    loyaltyDiscountEnabled: false, loyaltyDiscountPercent: "10",
    giftEnabled: false, giftProductId: giftId, giftProductQuantity: "2", giftMinOrderAmount: "10",
    emailNotificationsEnabled: true, orderNotificationEmail: "admin@pricing.example.test",
    facebookConversionsApiEnabled: false,
  });
  await pool.query(`UPDATE products SET price = 10, unit = 'piece', is_active = true, is_available = true,
    availability_status = 'available', is_special_offer = false, discount_type = NULL,
    discount_value = NULL, min_order_quantity = NULL, max_order_quantity = NULL WHERE id = $1`, [productId]);
  await pool.query("DELETE FROM product_volume_discounts WHERE product_id = $1", [productId]);
  await pool.query("DELETE FROM product_branch_availability WHERE branch_id = $1", [branchId]);
  await pool.query("UPDATE branches SET is_active = true WHERE id = $1", [branchId]);
});

function body(guest: boolean, total = "25.00", quantity = "1") {
  return {
    items: [{ productId, quantity, pricePerKg: "10", totalPrice: "10" }],
    totalAmount: total, language: "he", branchId,
    ...(guest ? { guestInfo: {
      firstName: "Guest", lastName: "Buyer", phone: "123", address: "Address",
      email: "guest@pricing.example.test", deliveryFee: "15", paymentMethod: "cash",
    } } : { deliveryAddress: "Address", deliveryFee: "15", paymentMethod: "cash" }),
  } as Record<string, any>;
}

async function post(guest: boolean, payload: Record<string, any>, identity = guest ? null : customerId) {
  return fetch(`${baseUrl}/api/orders${guest ? "/guest" : ""}`, {
    method: "POST", headers: {
      "Content-Type": "application/json", ...(identity ? { "x-test-user": identity } : {}),
    }, body: JSON.stringify(payload),
  });
}

async function saved(guest: boolean, payload: Record<string, any>) {
  const response = await post(guest, payload);
  assert.equal(response.status, guest ? 201 : 200, await response.clone().text());
  const result = await response.json();
  const id = result.orderId ?? result.id;
  const order = await storage.getOrderById(id);
  assert.ok(order);
  const snapshots = (await pool.query(
    "SELECT checkout_snapshot FROM payment_email_outbox WHERE order_id = $1", [id],
  )).rows.map((row: { checkout_snapshot: any }) => row.checkout_snapshot);
  assert.equal(snapshots.length, guest ? 2 : 1);
  for (const snapshot of snapshots) {
    assert.equal(Number(snapshot.totalAmount), Number(order.totalAmount));
    assert.equal(snapshot.deliveryFee, Number(order.deliveryFee));
    assert.deepEqual(snapshot.details.items.map((item: any) => Number(item.totalPrice)),
      order.items.map(item => Number(item.totalPrice)));
  }
  return order;
}

async function counts() {
  return (await pool.query(`SELECT (SELECT COUNT(*)::int FROM orders) AS orders,
    (SELECT COUNT(*)::int FROM order_items) AS items,
    (SELECT COUNT(*)::int FROM payment_email_outbox) AS emails`)).rows[0];
}

test("guest and session customer cannot forge all four monetary fields at once", async () => {
  for (const guest of [true, false]) {
    const payload = body(guest, "0.01");
    payload.items[0].pricePerKg = "0.01";
    payload.items[0].totalPrice = "0.01";
    (guest ? payload.guestInfo : payload).deliveryFee = "0";
    const initial = await counts();
    const response = await post(guest, payload);
    assert.equal(response.status, 409, await response.clone().text());
    assert.equal((await response.json()).code, "CART_PRICE_CHANGED");
    assert.deepEqual(await counts(), initial, "rejection must leave no order, lines or emails");
  }
});

test("correct guest and authenticated orders preserve totals and ignore forged line prices and delivery", async () => {
  for (const guest of [true, false]) {
    const correct = await saved(guest, body(guest));
    const payload = body(guest);
    payload.items[0].pricePerKg = "0.01";
    payload.items[0].totalPrice = "0.01";
    (guest ? payload.guestInfo : payload).deliveryFee = "-100";
    Object.assign(payload, { status: "delivered", loyaltyDiscount: "999", couponDiscount: "999", discountDetails: { fake: 999 } });
    const order = await saved(guest, payload);
    assert.equal(order.totalAmount, correct.totalAmount);
    assert.equal(Number(order.totalAmount), 25);
    assert.equal(Number(order.deliveryFee), 15);
    assert.equal(Number(order.items[0].pricePerKg), 10);
    assert.equal(Number(order.items[0].totalPrice), 10);
    assert.equal(order.status, "pending");
    assert.equal(Number(order.loyaltyDiscount), 0);
    assert.deepEqual(order.discountDetails, {});
    assert.equal(order.userId, guest ? null : customerId);
    if (guest) assert.ok(order.guestAccessToken && order.guestClaimToken && order.guestAccessTokenExpires);
  }
});

test("all units, special offers and upward ten-agorot rounding keep existing totals in both routes", async () => {
  for (const [unit, quantity] of [["piece", 3], ["portion", 2], ["kg", 0.375], ["100g", 375], ["100ml", 125]] as const) {
    for (const discountType of ["percentage", "fixed"] as const) {
      const product = { price: "3.33", isSpecialOffer: true, discountType, discountValue: discountType === "percentage" ? "15" : "1.25" };
      await pool.query("UPDATE products SET price = $2, unit = $3, is_special_offer = true, discount_type = $4, discount_value = $5 WHERE id = $1",
        [productId, product.price, unit, discountType, product.discountValue]);
      const lineTotal = calculateTotal(effectiveProductPrice(product), quantity, unit);
      for (const guest of [true, false]) {
        const payload = body(guest, (lineTotal + 15).toFixed(2), String(quantity));
        payload.items[0].totalPrice = String(lineTotal);
        const order = await saved(guest, payload);
        assert.equal(Number(order.items[0].totalPrice), lineTotal, `${guest}/${unit}/${discountType}`);
        assert.equal(Number(order.totalAmount), lineTotal + 15);
      }
    }
  }
});

test("volume, product coupon, loyalty stacking, gifts and delivery threshold use authoritative subtotals", async () => {
  await storage.updateStoreSettings({ loyaltyDiscountEnabled: true, freeDeliveryFrom: "30", giftEnabled: true });
  await pool.query(`INSERT INTO product_volume_discounts (product_id, min_quantity, discount_type, discount_value)
    VALUES ($1, 2, 'percentage', 20)`, [productId]);
  for (const stacks of [true, false]) {
    const code = `PRICING-${stacks}`.toUpperCase();
    await pool.query(`INSERT INTO coupons (code, discount_type, discount_value, scope, applicable_product_ids, stacks_with_loyalty)
      VALUES ($1, 'fixed', 5, 'product', $2, $3)`, [code, JSON.stringify([productId]), stacks]);
    for (const guest of [true, false]) {
      const expected = !guest && stacks ? 31 : 35;
      const payload = body(guest, String(expected), "5");
      Object.assign(payload, { couponCode: code, giftAccepted: true });
      payload.items[0].totalPrice = "50";
      const order = await saved(guest, payload);
      assert.equal(Number(order.totalAmount), expected);
      assert.equal(Number(order.deliveryFee), 0);
      assert.equal(Number(order.couponDiscount), 5);
      assert.equal(Number(order.loyaltyDiscount), !guest && stacks ? 4 : 0);
      assert.equal((order.discountDetails as any).volumeDiscount.totalAmount, 10);
      assert.equal(order.giftProductId, giftId);
      assert.equal(Number(order.items.find(item => item.productId === giftId)?.totalPrice), 0);
      const use = (await pool.query("SELECT user_id FROM coupon_uses WHERE order_id = $1", [order.id])).rows;
      assert.equal(use.length, 1);
      assert.equal(use[0].user_id, guest ? null : customerId);
    }
  }
});

test("delivery threshold is checked after loyalty discount, gifts require consent and threshold", async () => {
  await storage.updateStoreSettings({ loyaltyDiscountEnabled: true, giftEnabled: true });
  const order = await saved(false, body(false, "60", "5"));
  assert.equal(Number(order.deliveryFee), 15, "50 raw, 45 after loyalty is below free-delivery threshold");
  assert.equal(order.giftProductId, null);
  const low = body(true, "20", "0.5");
  low.giftAccepted = true;
  assert.equal((await saved(true, low)).giftProductId, null);
});

test("targeted guest coupons use contact email, not a forged user ID", async () => {
  await pool.query(`INSERT INTO coupons (code, discount_type, discount_value, target_customer_email)
    VALUES ('PRICING-TARGETED', 'fixed', 2, 'guest@pricing.example.test')`);
  const payload = body(true, "23");
  Object.assign(payload, { userId: customerId, couponCode: "PRICING-TARGETED" });
  assert.equal(Number((await saved(true, payload)).couponDiscount), 2);
  payload.guestInfo.email = "other@pricing.example.test";
  const initial = await counts();
  const response = await post(true, payload);
  assert.equal(response.status, 422);
  assert.deepEqual(await counts(), initial);
});

test("guest and authenticated branch preorders preserve price and reject unavailable branches or products", async () => {
  await pool.query(`INSERT INTO product_branch_availability (product_id, branch_id, availability_status)
    VALUES ($1, $2, 'out_of_stock_today')`, [productId, branchId]);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  for (const guest of [true, false]) {
    const payload = body(guest);
    const initial = await counts();
    assert.equal((await post(guest, payload)).status, 400);
    assert.deepEqual(await counts(), initial);
    (guest ? payload.guestInfo : payload).deliveryDate = tomorrow;
    const order = await saved(guest, payload);
    assert.equal(order.branchId, branchId);
    assert.equal(Number(order.totalAmount), 25);
    assert.equal(order.deliveryDate, tomorrow);
  }
  await pool.query("UPDATE product_branch_availability SET is_available = false WHERE branch_id = $1", [branchId]);
  for (const guest of [true, false]) assert.equal((await post(guest, body(guest))).status, 400);
  await pool.query("UPDATE branches SET is_active = false WHERE id = $1", [branchId]);
  for (const guest of [true, false]) assert.equal((await post(guest, body(guest))).status, 400);
});

test("quantity limits and malformed input fail without orders or emails for both paths", async () => {
  await pool.query("UPDATE products SET unit = '100g', min_order_quantity = 0.25, max_order_quantity = 1 WHERE id = $1", [productId]);
  for (const guest of [true, false]) {
    for (const quantity of ["-1", "0", "NaN", "1junk", "0.0001", "100", "1001"]) {
      const initial = await counts();
      const response = await post(guest, body(guest, "25", quantity));
      assert.equal(response.status, 400, await response.clone().text());
      assert.deepEqual(await counts(), initial);
    }
  }
});

test("requested delivery override is preserved and forged identity cannot obtain loyalty", async () => {
  await storage.updateStoreSettings({ loyaltyDiscountEnabled: true });
  const payload = body(false);
  payload.userId = customerId;
  const response = await post(false, payload, null);
  assert.equal(response.status, 200);
  const guestLike = await storage.getOrderById((await response.json()).id);
  assert.equal(guestLike?.userId, null);
  assert.equal(Number(guestLike?.loyaltyDiscount), 0);
  payload.totalAmount = "24";
  payload.requestedDeliveryDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  payload.requestedDeliveryTime = "12:00-14:00";
  const order = await saved(false, payload);
  assert.equal(order.deliveryDate, payload.requestedDeliveryDate);
  assert.equal(order.deliveryTime, payload.requestedDeliveryTime);
});

test("free fully discounted ordinary orders remain valid; malformed totals fail as client errors", async () => {
  await storage.updateStoreSettings({ deliveryFee: "0" });
  await pool.query("INSERT INTO coupons (code, discount_type, discount_value) VALUES ('PRICING-FREE', 'percentage', 100)");
  for (const guest of [true, false]) {
    const payload = body(guest, "0");
    payload.couponCode = "PRICING-FREE";
    assert.equal(Number((await saved(guest, payload)).totalAmount), 0);
    payload.totalAmount = "NaN";
    assert.equal((await post(guest, payload)).status, 400);
  }
});

test("manual administrative orders still keep explicitly supplied amounts", async () => {
  const payload = body(false, "1");
  payload.items[0].pricePerKg = "1";
  payload.items[0].totalPrice = "1";
  payload.deliveryFee = "0";
  const response = await fetch(`${baseUrl}/api/admin/orders`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-test-user": "checkout-pricing-admin" },
    body: JSON.stringify(payload),
  });
  assert.equal(response.status, 201, await response.clone().text());
  const order = await storage.getOrderById((await response.json()).id);
  assert.equal(Number(order?.totalAmount), 1);
  assert.equal(Number(order?.items[0].totalPrice), 1);
  assert.equal(Number(order?.deliveryFee), 0);
  assert.equal((await pool.query("SELECT * FROM payment_email_outbox WHERE order_id = $1", [order?.id])).rows.length, 0);
});

test("registration pauses for updated-price review, then real session can confirm ordinary or online checkout with loyalty", async () => {
  await storage.updateStoreSettings({
    loyaltyDiscountEnabled: true, loyaltyDiscountPercent: "10",
    // A new loyalty discount can also remove free delivery, increasing the total.
    freeDeliveryFrom: "50", deliveryFee: "15",
    paymentProviderConfig: { active: "hyp", hyp: { masof: "test", passP: "test", key: "test" } },
  });
  const originalInitiate = HypProvider.prototype.initiate;
  const gatewayAmounts: number[] = [];
  HypProvider.prototype.initiate = async params => {
    gatewayAmounts.push(params.amountInAgorot);
    return { redirectUrl: "https://gateway.example.test/pay" };
  };
  try {
    for (const online of [false, true]) {
      let cookie = "";
      const calls: string[] = [];
      const request = async (method: string, path: string, data: unknown) => {
        calls.push(path);
        const response = await fetch(`${registrationUrl}${path}`, {
          method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
          body: JSON.stringify(data),
        });
        const setCookie = response.headers.get("set-cookie");
        if (setCookie) cookie = setCookie.split(";")[0];
        assert.ok(response.ok, await response.clone().text());
        return response.json();
      };
      const initial = await counts();
      const pendingBefore = (await pool.query("SELECT COUNT(*)::int AS n FROM pending_payments")).rows[0].n;
      // Exercise the exact client registration helper and the real Passport
      // session, not the identity-injection middleware used by other tests.
      const user = await registerCheckoutAccount({
        firstName: "New", lastName: "Buyer", email: `registered-${online}@pricing.example.test`,
        phone: "0501234567", password: "test-password", address: "Saved address",
      }, request, "Home", error => assert.fail(String(error)));
      assert.ok(cookie);
      assert.deepEqual(calls, ["/api/register", "/api/addresses"]);
      assert.deepEqual(await counts(), initial, "registration must not create orders or mail before review");
      assert.equal((await pool.query("SELECT COUNT(*)::int AS n FROM pending_payments")).rows[0].n, pendingBefore);
      assert.equal(gatewayAmounts.length, 0, "registration must not initiate online payment before review");

      // The pre-registration amount was 50 (free delivery). The signed-in
      // summary is 45 after loyalty + 15 delivery = 60, so it needs new consent.
      const payload = body(false, "50", "5");
      payload.items[0].totalPrice = "50";
      payload.deliveryAddress = "Saved address";
      payload.customerPhone = user.phone;
      const checkoutPath = online ? "/api/payment/initiate" : "/api/orders";
      const submit = (total: string) => {
        const data = online
          ? { items: payload.items, totalAmount: total, branchId, language: "he",
            orderData: { ...payload, totalAmount: total } }
          : { ...payload, totalAmount: total };
        return fetch(`${registrationUrl}${checkoutPath}`, {
          method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie },
          body: JSON.stringify(data),
        });
      };
      const stale = await submit("50");
      assert.equal(stale.status, 409);
      assert.equal((await stale.json()).code, "CART_PRICE_CHANGED");
      assert.deepEqual(await counts(), initial);
      const subtotal = calculateTotal(10, 5, "piece");
      const displayedLoyalty = Math.round(subtotal * 10) / 100;
      const displayedTotal = subtotal - displayedLoyalty + 15;
      assert.equal(displayedTotal, 60);
      // This is the second, explicit confirmation after the registered
      // checkout displays its new discount and delivery total.
      const confirmed = await submit(displayedTotal.toFixed(2));
      assert.equal(confirmed.status, 200, await confirmed.clone().text());
      const result = await confirmed.json();
      if (online) {
        const pending = await storage.getPendingPaymentByToken(result.token);
        assert.equal(pending?.userId, user.id);
        assert.equal(Number((pending?.orderData as any).totalAmount), displayedTotal);
        assert.equal(Number((pending?.orderData as any).loyaltyDiscount), displayedLoyalty);
        assert.equal(gatewayAmounts.at(-1), 6000);
      } else {
        const order = await storage.getOrderById(result.id);
        assert.equal(order?.userId, user.id);
        assert.equal(Number(order?.totalAmount), displayedTotal);
        assert.equal(Number(order?.loyaltyDiscount), displayedLoyalty);
        assert.equal(Number(order?.deliveryFee), 15);
      }
    }
  } finally {
    HypProvider.prototype.initiate = originalInitiate;
  }
});

after(async () => {
  if (registrationServer) await new Promise<void>((resolve, reject) => registrationServer.close(error => error ? reject(error) : resolve()));
  if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  if (pool) await pool.end();
});
