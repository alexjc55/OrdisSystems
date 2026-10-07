import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import express from "express";
import type { Server } from "node:http";
import type { StoreSettings } from "../shared/schema";

if (process.env.PAYMENT_TEST_CLUSTER !== "isolated" ||
    !process.env.PGHOST?.startsWith("/tmp/payment-tests.")) {
  throw new Error("Only run via npm run test:payments (disposable database required)");
}

let pool: typeof import("../server/db").pool;
let storage: typeof import("../server/storage").storage;
let secondStorage: typeof storage;
let server: Server;
let baseUrl: string;
let productId: number;
const mail: { to: string; html?: string }[] = [];

before(async () => {
  const db = await import("../server/db");
  await db.getDB();
  pool = db.pool;
  const module = await import("../server/storage");
  storage = module.storage;
  secondStorage = new module.DatabaseStorage();
  // Exercise the actual additive migration against the old schema, then rerun it.
  await pool.query("ALTER TABLE pending_payments DROP COLUMN order_id");
  const migration = await readFile("migrations/0007_payment_order_link.sql", "utf8");
  await pool.query(migration);
  await pool.query(migration);
  const product = await pool.query(
    "INSERT INTO products (name, price, price_per_kg) VALUES ('Тестовый продукт', 10, 10) RETURNING id",
  );
  productId = product.rows[0].id;

  const settings = {
    emailNotificationsEnabled: true, orderNotificationEmail: "admin@example.test",
    orderNotificationFromEmail: "shop@example.test", orderNotificationFromName: "Shop",
    storeName: "Shop", defaultLanguage: "ru", paymentProviderConfig: { active: "none" },
  } as StoreSettings;
  // Keep real database finalization, item joins, routes and mail templates;
  // replace only store config and the external mail transport.
  storage.getStoreSettings = async () => settings;
  const { emailService } = await import("../server/email-service");
  emailService.updateSettings = async () => {};
  emailService.sendEmail = async params => { mail.push(params); return true; };
  const { default: paymentRoutes } = await import("../server/routes/payment.routes");
  const app = express();
  app.use(express.json());
  app.use("/api", paymentRoutes);
  await new Promise<void>(resolve => { server = app.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  });
  await pool?.end();
});

async function makePayment(userId: string | null = null, invalidItem = false) {
  return storage.createPendingPayment({
    token: randomUUID(), userId, status: "pending",
    expiresAt: new Date(Date.now() + 3600000),
    orderData: {
      totalAmount: "10.00", guestName: "Покупатель", guestEmail: "guest@example.test",
      orderLanguage: "ru", deliveryFee: "0.00",
    },
    orderItems: [{
      productId: invalidItem ? -1 : productId, quantity: "1",
      pricePerKg: "10.00", totalPrice: "10.00",
    }],
  });
}

function callback(token: string, transactionId = token, legacy = false) {
  return fetch(`${baseUrl}/api/payment/${legacy ? "hyp/" : ""}callback?Order=${token}&CCode=0&Id=${transactionId}`,
    { redirect: "manual" });
}

function webhook(token: string, transactionId = token, success = true, legacy = false) {
  return fetch(`${baseUrl}/api/payment/${legacy ? "hyp/" : ""}webhook`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Order: token, CCode: success ? "0" : "1", Id: transactionId }),
  });
}

async function counts() {
  const result = await pool.query(
    "SELECT (SELECT COUNT(*)::int FROM orders) AS orders, (SELECT COUNT(*)::int FROM order_items) AS items",
  );
  return result.rows[0] as { orders: number; items: number };
}

test("parallel browser callback/webhook commit one order and send one pair of emails; repeats return the same order", async () => {
  for (const legacy of [false, true]) {
    const pending = await makePayment();
    const initial = await counts();
    const mailStart = mail.length;
    const original = storage.finalizePendingPayment.bind(storage);
    let entered = 0;
    let release!: () => void;
    const bothEntered = new Promise<void>(resolve => { release = resolve; });
    // Ensure both handlers have read the pending status before either finalizes.
    storage.finalizePendingPayment = async (...args) => {
      if (++entered === 2) release();
      await bothEntered;
      return original(...args);
    };
    let responses: Response[];
    try {
      responses = await Promise.all([
        callback(pending.token, "txn-" + pending.token, legacy),
        webhook(pending.token, "txn-" + pending.token, true, legacy),
      ]);
    } finally {
      storage.finalizePendingPayment = original;
    }
    const saved = await storage.getPendingPaymentByToken(pending.token);
    assert.equal(saved?.status, "completed");
    assert.ok(saved?.orderId);
    assert.equal(responses[0].headers.get("location"), `/thanks?payment=success&orderId=${saved.orderId}`);
    assert.equal(await responses[1].text(), "OK");
    assert.deepEqual(await counts(), { orders: initial.orders + 1, items: initial.items + 1 });
    assert.deepEqual(mail.slice(mailStart).map(m => m.to).sort(), ["admin@example.test", "guest@example.test"]);
    const order = await storage.getOrderById(saved.orderId);
    assert.ok(order?.guestAccessToken);
    assert.ok(order?.guestClaimToken);
    assert.equal(order?.transactionId, "txn-" + pending.token);
    assert.equal(order?.items[0].productId, productId);
    assert.equal(order?.items[0].totalPrice, "10.00");
    for (let n = 0; n < 3; n++) {
      const repeated = await callback(pending.token, "different-txn", legacy);
      assert.equal(repeated.headers.get("location"), responses[0].headers.get("location"));
      assert.equal(await (await webhook(pending.token, "different-txn", true, legacy)).text(), "OK");
    }
    assert.equal(mail.length, mailStart + 2);
    assert.deepEqual(await counts(), { orders: initial.orders + 1, items: initial.items + 1 });
    assert.equal((await storage.getPendingPaymentByToken(pending.token))?.transactionId, "txn-" + pending.token);
  }
});

test("independent storage instances serialize finalization and preserve registered customer without guest credentials", async () => {
  await storage.upsertUser({
    id: "payment-customer", username: "payment-customer", password: "unused-test-hash",
  });
  const pending = await makePayment("payment-customer");
  const initial = await counts();
  const results = await Promise.all(Array.from({ length: 8 }, (_, n) =>
    (n % 2 ? storage : secondStorage).finalizePendingPayment(pending.token, "registered-txn")));
  assert.equal(results.filter(result => result.created).length, 1);
  assert.equal(new Set(results.map(result => result.orderId)).size, 1);
  assert.deepEqual(await counts(), { orders: initial.orders + 1, items: initial.items + 1 });
  const order = await storage.getOrderById(results[0].orderId!);
  assert.equal(order?.userId, "payment-customer");
  assert.equal(order?.guestAccessToken, null);
  assert.equal(order?.guestClaimToken, null);
});

test("item insert failure rolls back order/payment; provider retry creates exactly one order and email pair", async () => {
  const pending = await makePayment(null, true);
  const initial = await counts();
  const mailStart = mail.length;
  const failed = await webhook(pending.token);
  assert.equal(failed.status, 500);
  assert.deepEqual(await counts(), initial);
  const saved = await storage.getPendingPaymentByToken(pending.token);
  assert.equal(saved?.status, "pending");
  assert.equal(saved?.orderId, null);
  assert.equal(saved?.transactionId, null);
  assert.equal(mail.length, mailStart);
  await pool.query("UPDATE pending_payments SET order_items = $1 WHERE token = $2", [
    JSON.stringify([{ productId, quantity: "1", pricePerKg: "10", totalPrice: "10" }]), pending.token,
  ]);
  assert.equal((await webhook(pending.token)).status, 200);
  const completed = await storage.getPendingPaymentByToken(pending.token);
  assert.equal(completed?.status, "completed");
  assert.ok(completed?.orderId);
  assert.equal(mail.length, mailStart + 2);
  assert.equal((await callback(pending.token)).headers.get("location"),
    `/thanks?payment=success&orderId=${completed.orderId}`);
  assert.equal(mail.length, mailStart + 2);
  assert.deepEqual(await counts(), { orders: initial.orders + 1, items: initial.items + 1 });
});

test("failure races and delayed failed notifications cannot overwrite successful finalization", async () => {
  const pending = await makePayment();
  const [result] = await Promise.all([
    storage.finalizePendingPayment(pending.token),
    secondStorage.updatePendingPaymentStatus(pending.token, "failed", "failed-txn"),
  ]);
  assert.equal((await storage.getPendingPaymentByToken(pending.token))?.status, "completed");
  assert.equal(await storage.updatePendingPaymentStatus(pending.token, "failed"), undefined);
  assert.equal((await webhook(pending.token, "late-failure", false)).status, 200);
  const saved = await storage.getPendingPaymentByToken(pending.token);
  assert.equal(saved?.status, "completed");
  assert.equal(saved?.orderId, result.orderId);
});

test("legacy completed payment with no link is never recreated or mailed", async () => {
  const pending = await makePayment();
  await pool.query("UPDATE pending_payments SET status = 'completed' WHERE token = $1", [pending.token]);
  const initial = await counts();
  const mailStart = mail.length;
  assert.deepEqual(await storage.finalizePendingPayment(pending.token), { orderId: null, created: false });
  assert.equal((await callback(pending.token)).headers.get("location"), "/thanks?payment=success");
  assert.equal((await webhook(pending.token)).status, 200);
  assert.deepEqual(await counts(), initial);
  assert.equal(mail.length, mailStart);
});

test("unknown payment token fails explicitly without creating orders", async () => {
  const initial = await counts();
  await assert.rejects(storage.finalizePendingPayment(randomUUID()), /Pending payment not found/);
  assert.deepEqual(await counts(), initial);
});

test("failure while recording completion rolls back order and items, then retry succeeds", async () => {
  const pending = await makePayment();
  const initial = await counts();
  await pool.query(`
    CREATE FUNCTION reject_payment_completion() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.status = 'completed' THEN RAISE EXCEPTION 'Injected completion failure'; END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER reject_payment_completion BEFORE UPDATE ON pending_payments
      FOR EACH ROW EXECUTE FUNCTION reject_payment_completion();
  `);
  try {
    await assert.rejects(storage.finalizePendingPayment(pending.token), /Injected completion failure/);
    assert.deepEqual(await counts(), initial);
    const saved = await storage.getPendingPaymentByToken(pending.token);
    assert.equal(saved?.status, "pending");
    assert.equal(saved?.orderId, null);
  } finally {
    await pool.query("DROP TRIGGER reject_payment_completion ON pending_payments; DROP FUNCTION reject_payment_completion()");
  }
  const result = await storage.finalizePendingPayment(pending.token);
  assert.equal(result.created, true);
  assert.deepEqual(await storage.finalizePendingPayment(pending.token), { ...result, created: false });
  assert.deepEqual(await counts(), { orders: initial.orders + 1, items: initial.items + 1 });
});

test("migration recovers only unambiguous historical order links without duplicating orders", async () => {
  const known = await makePayment();
  const ambiguous = await makePayment();
  const knownResult = await storage.finalizePendingPayment(known.token, "known-historical-txn");
  await storage.finalizePendingPayment(ambiguous.token, "ambiguous-historical-txn");
  await pool.query("INSERT INTO orders (total_amount, payment_method, transaction_id) VALUES (10, 'online', 'ambiguous-historical-txn')");
  await pool.query("UPDATE pending_payments SET order_id = NULL WHERE token = ANY($1)", [[known.token, ambiguous.token]]);
  const initial = await counts();
  const migration = await readFile("migrations/0007_payment_order_link.sql", "utf8");
  await pool.query(migration);
  await pool.query(migration);
  assert.equal((await storage.getPendingPaymentByToken(known.token))?.orderId, knownResult.orderId);
  assert.equal((await storage.getPendingPaymentByToken(ambiguous.token))?.orderId, null);
  assert.equal((await storage.finalizePendingPayment(ambiguous.token)).created, false);
  assert.deepEqual(await counts(), initial);
});
