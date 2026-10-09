import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { randomUUID, createHmac, createHash } from "node:crypto";
import express from "express";
import type { Server } from "node:http";
import type { StoreSettings, InsertOrder, InsertOrderItem } from "../shared/schema";
import { HypProvider, GrowProvider, AllPayProvider, PaymeProvider, type InitiateParams } from "../server/lib/payment-providers";
import { checkoutVerification } from "../server/lib/payment-providers/verification";

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
let processNext: typeof import("../server/payment-email-outbox").processNextPaymentEmail;
const originalFetch = globalThis.fetch;
const growEvidence = new Map<string, Record<string, any>>();
const hypConfig = { active: "hyp" as const, hyp: { masof: "test-terminal", passP: "test-password", key: "test-key" } };
function hypSign(token: string, id: string, amount = "10.00") {
  return createHmac("sha256", "test-gateway-only-signing-key").update(`${token}:${id}:${amount}:0`).digest("hex");
}

async function drainMail() {
  while (await processNext()) { /* drain committed delivery intents */ }
}

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
  await pool.query("DROP TABLE payment_email_outbox");
  const outboxMigration = await readFile("migrations/0008_payment_email_outbox.sql", "utf8");
  await pool.query(outboxMigration);
  await pool.query(outboxMigration);
  const checkoutMigration = await readFile("migrations/0010_checkout_email_snapshot.sql", "utf8");
  await pool.query(checkoutMigration);
  await pool.query(checkoutMigration);
  await pool.query("ALTER TABLE pending_payments DROP COLUMN provider_approval_required, DROP COLUMN provider_approved_at");
  const approvalMigration = await readFile("migrations/0009_payment_provider_approval.sql", "utf8");
  await pool.query(approvalMigration);
  await pool.query(approvalMigration);
  await pool.query("ALTER TABLE pending_payments DROP COLUMN provider_approval_attempted_at, DROP COLUMN provider_approval_reference");
  const historical = randomUUID();
  await pool.query(`INSERT INTO pending_payments
    (token, order_data, order_items, status, expires_at, provider_approval_required)
    VALUES ($1, '{}', '[]', 'completed', NOW(), true)`, [historical]);
  const reconciliationMigration = await readFile("migrations/0011_payment_approval_reconciliation.sql", "utf8");
  await pool.query(reconciliationMigration);
  const verificationMigration = await readFile("migrations/0012_payment_verification.sql", "utf8");
  await pool.query(verificationMigration);
  await pool.query(verificationMigration);
  await pool.query(reconciliationMigration);
  const migrated = await storage.getPendingPaymentByToken(historical);
  assert.ok(migrated?.providerApprovalAttemptedAt);
  assert.equal(migrated?.providerApprovedAt, null);
  await assert.rejects(storage.approvePendingPayment(historical, historical,
    async () => assert.fail("historical approval must not be replayed"), true), /outcome unknown/);
  const product = await pool.query(
    "INSERT INTO products (name, price, price_per_kg, unit) VALUES ('Тестовый продукт', 10, 10, 'piece') RETURNING id",
  );
  productId = product.rows[0].id;

  const settings = {
    emailNotificationsEnabled: true, orderNotificationEmail: "admin@example.test",
    orderNotificationFromEmail: "shop@example.test", orderNotificationFromName: "Shop",
    storeName: "Shop", defaultLanguage: "ru", paymentProviderConfig: hypConfig, feedToken: "test-feed-token",
    deliveryFee: "0.00", freeDeliveryFrom: null,
  } as StoreSettings;
  await storage.updateStoreSettings(settings);
  // Keep real database finalization, item joins, routes and mail templates;
  // replace only store config and the external mail transport.
  storage.getStoreSettings = async () => settings;
  // Only external gateway calls are replaced. Routes run their real verification.
  globalThis.fetch = async (url, options) => {
    const u = new URL(String(url));
    if (u.hostname === "pay.hyp.co.il" && u.searchParams.get("What") === "VERIFY") {
      const p = u.searchParams;
      const valid = p.get("Masof") === "test-terminal" && p.get("KEY") === "test-key" &&
        p.get("PassP") === "test-password" && p.get("Sign") ===
        hypSign(p.get("Order")!, p.get("Id")!, p.get("Amount")!);
      return new Response(valid ? "CCode=0" : "CCode=200");
    }
    if (u.pathname.endsWith("/getPaymentProcessInfo")) {
      const p = new URLSearchParams(String(options?.body));
      const pending = await storage.getPendingPaymentByToken(p.get("processId")!);
      const context = pending?.verification;
      if (!context || context.processToken !== p.get("processToken") || p.get("pageCode") !== "test-page")
        return Response.json({ status: 0 });
      return Response.json({ status: 1, data: {
        processId: context.processId, processToken: context.processToken, transactions: [{
          transactionId: pending!.token, statusCode: context.j5 ? 11 : 2,
          sum: context.amountInAgorot / 100,
          ...growEvidence.get(pending!.token),
        }],
      } });
    }
    return originalFetch(url, options);
  };
  const { emailService } = await import("../server/email-service");
  emailService.updateSettings = async () => {};
  emailService.sendEmail = async params => { mail.push(params); return true; };
  processNext = (await import("../server/payment-email-outbox")).processNextPaymentEmail;
  const { default: paymentRoutes } = await import("../server/routes/payment.routes");
  const app = express();
  app.use(express.json());
  // Test-only identity injection; production uses the session middleware.
  app.use((req: any, _res, next) => {
    req.isAuthenticated = () => Boolean(req.headers["x-test-role"]);
    req.user = req.headers["x-test-role"] ? {
      role: req.headers["x-test-role"], id: req.headers["x-test-user"],
    } : undefined;
    next();
  });
  app.use("/api", paymentRoutes);
  const { default: outboxRoutes } = await import("../server/routes/admin/payment-email-outbox.routes");
  app.use("/api", outboxRoutes);
  const { default: orderRoutes } = await import("../server/routes/orders.routes");
  app.use("/api", orderRoutes);
  const { default: settingsRoutes } = await import("../server/routes/admin/settings.routes");
  app.use("/api", settingsRoutes);
  const { default: systemRoutes } = await import("../server/routes/system.routes");
  app.use(systemRoutes);
  await new Promise<void>(resolve => { server = app.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(drainMail);

test("empty failed-email queue reports zero without requiring active orders", async () => {
  const response = await fetch(baseUrl + "/api/admin/payment-email-outbox", {
    headers: { "x-test-role": "admin" },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { items: [], totalCount: 0, nextCursor: null });
});

test("environment switches block both initiation paths without writes, but preserve verified in-flight payments", async () => {
  const keys = ["PAYMENT_HYP_ENABLED", "PAYMENT_GROW_ENABLED", "PAYMENT_ALLPAY_ENABLED", "PAYMENT_PAYME_ENABLED"];
  const originals = keys.map(key => process.env[key]);
  const pending = await makePayment();
  const initialPendingCount = Number((await pool.query("SELECT count(*) FROM pending_payments")).rows[0].count);
  const initial = await counts();
  try {
    for (const key of keys) process.env[key] = "false";
    const configResponse = await fetch(baseUrl + "/api/config");
    assert.equal(configResponse.status, 200);
    assert.deepEqual((await configResponse.json()).paymentProviders, {
      hyp: false, grow: false, allpay: false, payme: false,
    });
    assert.equal((await (await fetch(baseUrl + "/api/settings")).json()).paymentProviderConfig.configured, false);
    for (const path of ["/api/payment/initiate", "/api/payment/hyp/initiate"]) {
      const response = await fetch(baseUrl + path, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
      });
      assert.equal(response.status, 503);
      assert.equal((await response.json()).code, "payment_provider_disabled");
    }
    assert.equal(Number((await pool.query("SELECT count(*) FROM pending_payments")).rows[0].count), initialPendingCount);
    assert.deepEqual(await counts(), initial);
    const completed = await webhook(pending.token);
    assert.equal(completed.status, 200);
    assert.equal((await storage.getPendingPaymentByToken(pending.token))?.status, "completed");
  } finally {
    keys.forEach((key, index) => {
      if (originals[index] === undefined) delete process.env[key];
      else process.env[key] = originals[index];
    });
  }
});

test("both initiate routes reject simultaneous total and line-price tampering before writes or gateway calls", async () => {
  const original = HypProvider.prototype.initiate;
  let calls = 0;
  HypProvider.prototype.initiate = async () => { calls++; return { redirectUrl: "https://gateway.test/pay" }; };
  const count = async () => Number((await pool.query("SELECT COUNT(*) AS n FROM pending_payments")).rows[0].n);
  const before = await count();
  try {
    for (const path of ["/api/payment/initiate", "/api/payment/hyp/initiate"]) {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId, quantity: "1", pricePerKg: "0.01", totalPrice: "0.01" }],
          totalAmount: "0.01", orderData: { totalAmount: "0.01", deliveryFee: "0" },
        }),
      });
      assert.equal(response.status, 409);
      assert.equal((await response.json()).code, "CART_PRICE_CHANGED");
    }
    assert.equal(calls, 0);
    assert.equal(await count(), before);
  } finally { HypProvider.prototype.initiate = original; }
});

test("correct amount with forged lines produces a DB-priced snapshot and exact gateway amount", async () => {
  const original = HypProvider.prototype.initiate;
  let amount = 0;
  HypProvider.prototype.initiate = async params => {
    amount = params.amountInAgorot;
    return { redirectUrl: "https://gateway.test/pay" };
  };
  try {
    const response = await fetch(`${baseUrl}/api/payment/initiate`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ productId, quantity: "1", pricePerKg: "0.01", totalPrice: "0.01" }],
        totalAmount: "10", userId: "forged-user",
        orderData: { userId: "forged-user", status: "completed", totalAmount: "10",
          deliveryFee: "-100", discountDetails: { fake: 100 }, loyaltyDiscount: "100" },
      }),
    });
    assert.equal(response.status, 200);
    const pending = await storage.getPendingPaymentByToken((await response.json()).token);
    assert.equal(amount, 1000);
    assert.equal(pending?.verification?.amountInAgorot, 1000);
    assert.equal(pending?.userId, null);
    assert.ok(pending);
    const snapshot = pending.orderData as InsertOrder;
    const lines = pending.orderItems as InsertOrderItem[];
    assert.equal(snapshot.userId, null);
    assert.equal(snapshot.status, "pending");
    assert.equal(snapshot.deliveryFee, "0.00");
    assert.deepEqual(snapshot.discountDetails, {});
    assert.equal(lines[0].pricePerKg, "10.00");
    assert.equal(lines[0].totalPrice, "10.00");
  } finally { HypProvider.prototype.initiate = original; }
});

test("registered payment uses session identity and loyalty while guest cannot impersonate it", async () => {
  const original = HypProvider.prototype.initiate;
  const originalSettings = storage.getStoreSettings;
  const settings = await originalSettings();
  const id = randomUUID();
  await pool.query("INSERT INTO users (id, username, password, first_name, email) VALUES ($1, $1, 'test-only-not-a-real-password', 'Buyer', 'buyer@example.test')", [id]);
  storage.getStoreSettings = async () => ({
    ...settings, loyaltyDiscountEnabled: true, loyaltyDiscountPercent: "20", deliveryFee: "5", freeDeliveryFrom: "50",
  } as StoreSettings);
  HypProvider.prototype.initiate = async () => ({ redirectUrl: "https://gateway.test/pay" });
  const payload = {
    items: [{ productId, quantity: "1", pricePerKg: "0.01", totalPrice: "0.01" }],
    totalAmount: "13", userId: id, orderData: { userId: id, deliveryFee: "0" },
  };
  try {
    const registered = await fetch(`${baseUrl}/api/payment/initiate`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-test-role": "customer", "x-test-user": id },
      body: JSON.stringify(payload),
    });
    assert.equal(registered.status, 200);
    const pending = await storage.getPendingPaymentByToken((await registered.json()).token);
    assert.equal(pending?.userId, id);
    assert.ok(pending);
    const snapshot = pending.orderData as InsertOrder;
    assert.equal(snapshot.loyaltyDiscount, "2.00");
    assert.equal(snapshot.deliveryFee, "5.00");
    assert.equal(pending?.verification?.amountInAgorot, 1300);
    const guest = await fetch(`${baseUrl}/api/payment/initiate`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    assert.equal(guest.status, 409);
  } finally {
    HypProvider.prototype.initiate = original;
    storage.getStoreSettings = originalSettings;
  }
});

after(async () => {
  globalThis.fetch = originalFetch;
  if (server) await new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  });
  await pool?.end();
});

async function makePayment(userId: string | null = null, invalidItem = false) {
  const token = randomUUID();
  const config = (await storage.getStoreSettings())!.paymentProviderConfig as any;
  const verification = checkoutVerification(config, config.active, 1000);
  if (config.active === "grow") {
    verification.processId = token;
    verification.processToken = "private-process-" + token;
  }
  return storage.createPendingPayment({
    token, userId, status: "pending", verification,
    providerApprovalRequired: true,
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
  return fetch(`${baseUrl}/api/payment/${legacy ? "hyp/" : ""}callback?Order=${token}&CCode=0&Id=${transactionId}&Amount=10.00&Sign=${hypSign(token, transactionId)}`,
    { redirect: "manual" });
}

function webhook(token: string, transactionId = token, success = true, legacy = false) {
  return fetch(`${baseUrl}/api/payment/${legacy ? "hyp/" : ""}webhook`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Order: token, CCode: success ? "0" : "1", Id: transactionId,
      Amount: "10.00", Sign: hypSign(token, transactionId) }),
  });
}

async function counts() {
  const result = await pool.query(
    "SELECT (SELECT COUNT(*)::int FROM orders) AS orders, (SELECT COUNT(*)::int FROM order_items) AS items",
  );
  return result.rows[0] as { orders: number; items: number };
}

async function checkout(guest = true, email: string | null = "guest@example.test") {
  const customerId = "ordinary-checkout-customer";
  if (!guest) {
    await storage.upsertUser({
      id: customerId, username: customerId, email: "customer@example.test", password: "test-only",
      firstName: "Registered", lastName: "Customer", role: "customer", phone: "456",
    });
  }
  return fetch(`${baseUrl}/api/orders${guest ? "/guest" : ""}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(!guest ? { "x-test-role": "customer", "x-test-user": customerId } : {}),
    },
    body: JSON.stringify({
      totalAmount: "5", language: "he",
      items: [{ productId, quantity: "0.5", pricePerKg: "10", totalPrice: "5" }],
      ...(guest ? { guestInfo: {
        firstName: "Ordinary", lastName: "Guest", phone: "123",
        address: "Address", email, customerNotes: "Checkout note", paymentMethod: "cash",
      } } : { deliveryAddress: "Address", customerNotes: "Checkout note", paymentMethod: "cash" }),
    }),
  });
}

test("ordinary guest and registered checkout commit automatic intents without direct mail", async () => {
  for (const guest of [true, false]) {
    const mailStart = mail.length;
    const response = await checkout(guest);
    assert.equal(response.status, guest ? 201 : 200, await response.clone().text());
    const result = await response.json();
    const orderId = result.orderId ?? result.id;
    const intents = (await pool.query(
      "SELECT * FROM payment_email_outbox WHERE order_id = $1 ORDER BY audience", [orderId],
    )).rows;
    assert.equal(intents.length, guest ? 2 : 1);
    assert.equal(mail.length, mailStart, "HTTP handler must not send automatic emails");
    assert.ok(intents.every((row: { status: string; checkout_snapshot: unknown }) => row.status === "pending" && row.checkout_snapshot));
    assert.equal(intents[0].checkout_snapshot.details.customerNotes, "Checkout note");
    assert.equal(intents[0].checkout_snapshot.details.items[0].quantity, 0.5);
    await drainMail();
    assert.equal(mail.length - mailStart, guest ? 2 : 1);
    assert.equal(mail[mailStart].to, "admin@example.test");
    assert.ok(mail[mailStart].html?.includes(guest ? "Ordinary Guest" : "Registered Customer"));
    if (guest) {
      assert.equal(mail[mailStart + 1].to, "guest@example.test");
      assert.ok(mail[mailStart + 1].html?.includes(result.guestAccessToken));
    }
  }
});

test("ordinary guest without email, blank email, and disabled alerts preserve prior audience rules", async () => {
  for (const email of [null, "   "]) {
    const response = await checkout(true, email);
    assert.equal(response.status, 201);
    const result = await response.json();
    const intents = (await pool.query(
      "SELECT audience FROM payment_email_outbox WHERE order_id = $1", [result.orderId],
    )).rows;
    assert.deepEqual(intents, [{ audience: "admin" }]);
    await drainMail();
  }
  for (const missingRecipient of [false, true]) {
    await pool.query(missingRecipient
      ? "UPDATE store_settings SET order_notification_email = NULL"
      : "UPDATE store_settings SET email_notifications_enabled = false");
    try {
      const response = await checkout();
      assert.equal(response.status, 201);
      const result = await response.json();
      assert.equal((await pool.query(
        "SELECT COUNT(*)::int AS n FROM payment_email_outbox WHERE order_id = $1", [result.orderId],
      )).rows[0].n, 0);
    } finally {
      await pool.query("UPDATE store_settings SET email_notifications_enabled = true, order_notification_email = 'admin@example.test'");
    }
  }
});

test("ordinary outbox insertion failure rolls back the order and its items for both checkout paths", async () => {
  await pool.query(`
    CREATE FUNCTION reject_checkout_email() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'Injected checkout email failure'; END $$;
    CREATE TRIGGER reject_checkout_email BEFORE INSERT ON payment_email_outbox
    FOR EACH ROW EXECUTE FUNCTION reject_checkout_email();
  `);
  try {
    for (const guest of [true, false]) {
      const initial = await counts();
      const initialJobs = (await pool.query("SELECT COUNT(*)::int AS n FROM payment_email_outbox")).rows[0].n;
      assert.equal((await checkout(guest)).status, 500);
      assert.deepEqual(await counts(), initial);
      assert.equal((await pool.query("SELECT COUNT(*)::int AS n FROM payment_email_outbox")).rows[0].n, initialJobs);
    }
  } finally {
    await pool.query("DROP TRIGGER reject_checkout_email ON payment_email_outbox; DROP FUNCTION reject_checkout_email()");
  }
});

test("ordinary item insertion failure rolls back the order and leaves no mail intent", async () => {
  const initial = await counts();
  const { prepareCheckoutEmail } = await import("../server/checkout-order-email");
  const order = { totalAmount: "10", guestName: "Rollback", guestEmail: "guest@example.test" };
  const items = [{ productId: -1, quantity: "1", pricePerKg: "10", totalPrice: "10", orderId: 0 }];
  const snapshot = await prepareCheckoutEmail(order, items, {
    customerName: "Rollback", notifyGuest: true, deliveryFee: 0, volumeDiscount: 0,
  });
  const initialJobs = (await pool.query("SELECT COUNT(*)::int AS n FROM payment_email_outbox")).rows[0].n;
  await assert.rejects(storage.createOrder(order, items, snapshot));
  assert.deepEqual(await counts(), initial);
  assert.equal((await pool.query("SELECT COUNT(*)::int AS n FROM payment_email_outbox")).rows[0].n, initialJobs);
});

test("commit failure after ordinary intents were inserted rolls back both mail jobs and order", async () => {
  await pool.query(`
    CREATE FUNCTION reject_checkout_commit() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'Injected checkout commit failure'; END $$;
    CREATE CONSTRAINT TRIGGER reject_checkout_commit AFTER INSERT ON orders
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION reject_checkout_commit();
  `);
  try {
    const initial = await counts();
    const jobs = (await pool.query("SELECT COUNT(*)::int AS n FROM payment_email_outbox")).rows[0].n;
    assert.equal((await checkout()).status, 500);
    assert.deepEqual(await counts(), initial);
    assert.equal((await pool.query("SELECT COUNT(*)::int AS n FROM payment_email_outbox")).rows[0].n, jobs);
  } finally {
    await pool.query("DROP TRIGGER reject_checkout_commit ON orders; DROP FUNCTION reject_checkout_commit()");
  }
});

test("ordinary guest transport failure retries only the failed audience, retaining checkout data", async () => {
  const result = await (await checkout()).json();
  const mailStart = mail.length;
  assert.equal(await processNext(), true); // admin delivered
  const { emailService } = await import("../server/email-service");
  const original = emailService.sendEmail;
  try {
    emailService.sendEmail = async () => false;
    assert.equal(await processNext(), true);
    let job = (await pool.query(
      "SELECT * FROM payment_email_outbox WHERE order_id = $1 AND audience = 'guest'", [result.orderId],
    )).rows[0];
    assert.equal(job.status, "pending");
    assert.equal(job.attempts, 1);
    assert.equal(await processNext(), false);
    await pool.query("UPDATE payment_email_outbox SET available_at = now() WHERE id = $1", [job.id]);
    emailService.sendEmail = async () => { throw new Error("Private SMTP failure"); };
    await processNext();
    job = (await pool.query("SELECT * FROM payment_email_outbox WHERE id = $1", [job.id])).rows[0];
    assert.equal(job.attempts, 2);
    assert.equal(job.last_error, "Order email delivery failed");
    // Changing the order after checkout must not rewrite a delayed confirmation.
    await storage.updateOrder(result.orderId, { guestName: "Changed", customerNotes: "Changed" });
    await pool.query("UPDATE payment_email_outbox SET available_at = now() WHERE id = $1", [job.id]);
  } finally {
    emailService.sendEmail = original;
  }
  await drainMail();
  assert.equal(mail.length - mailStart, 2);
  assert.ok(mail[mailStart + 1].html?.includes("Ordinary Guest"));
  assert.ok(!mail[mailStart + 1].html?.includes("Changed"));
});

test("ordinary checkout survives creator death after commit and a new worker process delivers the intents", async () => {
  const marker = `checkout-recovery-${randomUUID()}`;
  const child = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
    const { storage } = await import("./server/storage.ts");
    const { prepareCheckoutEmail } = await import("./server/checkout-order-email.ts");
    const order = {
      totalAmount: "10", guestName: ${JSON.stringify(marker)}, guestEmail: "guest@example.test",
      guestAccessToken: "recovery-access", guestClaimToken: "recovery-claim", orderLanguage: "he"
    };
    const items = [{ productId: ${productId}, quantity: "1", pricePerKg: "10", totalPrice: "10", orderId: 0 }];
    const snapshot = await prepareCheckoutEmail(order, items, {
      customerName: order.guestName, notifyGuest: true, deliveryFee: 0, volumeDiscount: 0,
      baseUrl: "https://shop.example.test"
    });
    await storage.createOrder(order, items, snapshot);
    process.exit(0);
  `], { encoding: "utf8", timeout: 20_000 });
  assert.equal(child.status, 0, child.stderr);
  const orderId = (await pool.query("SELECT id FROM orders WHERE guest_name = $1", [marker])).rows[0].id;
  const before = (await pool.query("SELECT status FROM payment_email_outbox WHERE order_id = $1", [orderId])).rows;
  assert.equal(before.length, 2);
  assert.ok(before.every((row: { status: string }) => row.status === "pending"));
  const recovery = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
    const { emailService } = await import("./server/email-service.ts");
    emailService.updateSettings = () => {};
    emailService.sendEmail = async () => true;
    const { processNextPaymentEmail } = await import("./server/payment-email-outbox.ts");
    while (await processNextPaymentEmail()) {}
    process.exit(0);
  `], { encoding: "utf8", timeout: 20_000 });
  assert.equal(recovery.status, 0, recovery.stderr);
  assert.equal((await pool.query(
    "SELECT COUNT(*)::int AS n FROM payment_email_outbox WHERE order_id = $1 AND status = 'sent'", [orderId],
  )).rows[0].n, 2);
});

test("ordinary notification is locked through delivery and rolls back if its worker dies", async () => {
  const result = await (await checkout(false)).json();
  const orderId = result.id ?? result.orderId;
  const crash = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
    const { processNextPaymentEmail } = await import("./server/payment-email-outbox.ts");
    await processNextPaymentEmail(undefined, async () => process.exit(0));
  `], { encoding: "utf8", timeout: 20_000 });
  assert.equal(crash.status, 0, crash.stderr);
  const job = (await pool.query("SELECT status, attempts FROM payment_email_outbox WHERE order_id = $1", [orderId])).rows[0];
  assert.deepEqual(job, { status: "pending", attempts: 0 });
  let started!: () => void;
  let release!: () => void;
  const entered = new Promise<void>(resolve => { started = resolve; });
  const wait = new Promise<void>(resolve => { release = resolve; });
  let calls = 0;
  const first = processNext(undefined, async () => { calls++; started(); await wait; });
  await entered;
  try {
    assert.equal(await processNext(undefined, async () => { calls++; }), false);
  } finally {
    release();
  }
  await first;
  assert.equal(calls, 1);
  assert.equal((await pool.query("SELECT status FROM payment_email_outbox WHERE order_id = $1", [orderId])).rows[0].status, "sent");
});

test("explicit guest resend is independent of the automatic checkout queue", async () => {
  const result = await (await checkout()).json();
  const jobsBefore = (await pool.query(
    "SELECT * FROM payment_email_outbox WHERE order_id = $1 ORDER BY id", [result.orderId],
  )).rows;
  const mailStart = mail.length;
  const response = await fetch(`${baseUrl}/api/orders/guest/${result.guestAccessToken}/send-email`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "resend@example.test" }),
  });
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal(mail.length - mailStart, 1);
  assert.equal(mail[mailStart].to, "resend@example.test");
  assert.deepEqual((await pool.query(
    "SELECT * FROM payment_email_outbox WHERE order_id = $1 ORDER BY id", [result.orderId],
  )).rows, jobsBefore);
  await drainMail();
  assert.equal(mail.length - mailStart, 3);
});

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
    assert.equal(mail.length, mailStart, "HTTP callbacks only commit delivery intents");
    await Promise.all([drainMail(), drainMail()]);
    assert.deepEqual(mail.slice(mailStart).map(m => m.to).sort(), ["admin@example.test", "guest@example.test"]);
    const order = await storage.getOrderById(saved.orderId);
    assert.ok(order?.guestAccessToken);
    assert.ok(order?.guestClaimToken);
    assert.equal(order?.transactionId, "txn-" + pending.token);
    assert.equal(order?.items[0].productId, productId);
    assert.equal(order?.items[0].totalPrice, "10.00");
    for (let n = 0; n < 3; n++) {
      const repeated = await callback(pending.token, "txn-" + pending.token, legacy);
      assert.equal(repeated.headers.get("location"), responses[0].headers.get("location"));
      assert.equal(await (await webhook(pending.token, "txn-" + pending.token, true, legacy)).text(), "OK");
    }
    await drainMail();
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
  await drainMail();
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

async function withGrow(
  approve: (transactionId: string) => Promise<void>,
  run: () => Promise<void>,
  j5Enabled = false,
) {
  const originalSettings = storage.getStoreSettings;
  const originalApprove = GrowProvider.prototype.approveTransaction;
  const settings = await originalSettings.call(storage);
  storage.getStoreSettings = async () => ({
    ...settings,
    paymentProviderConfig: {
      active: "grow",
      grow: { userId: "test-user", apiKey: "test-key", pageCode: "test-page", j5Enabled },
    },
  } as StoreSettings);
  GrowProvider.prototype.approveTransaction = approve;
  try { await run(); } finally {
    storage.getStoreSettings = originalSettings;
    GrowProvider.prototype.approveTransaction = originalApprove;
  }
}

function growCallback(token: string, transactionId = token) {
  return fetch(`${baseUrl}/api/payment/callback?token=${token}&transactionCode=${transactionId}`,
    { redirect: "manual" });
}

async function growWebhook(token: string, transactionId = token, success = true) {
  const pending = await storage.getPendingPaymentByToken(token);
  return fetch(`${baseUrl}/api/payment/webhook?token=${token}&proof=${pending?.verification?.notifySecret || ""}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    // Exercise the token fallback in notifyUrl too.
    body: JSON.stringify(success ? { transactionCode: transactionId, paymentSum: "10" } : {}),
  });
}

test("Grow callback-first and webhook-first approve exactly once with one order and email pair", async () => {
  for (const browserFirst of [true, false]) {
    const approved: string[] = [];
    await withGrow(async id => { approved.push(id); }, async () => {
      const pending = await makePayment();
      const initial = await counts();
      const mailStart = mail.length;
      if (browserFirst) {
        assert.equal((await growCallback(pending.token)).status, 302);
        assert.equal((await storage.getPendingPaymentByToken(pending.token))?.providerApprovedAt, null);
      }
      assert.equal((await growWebhook(pending.token)).status, 200);
      assert.ok((await storage.getPendingPaymentByToken(pending.token))?.providerApprovedAt);
      const orderId = (await storage.getPendingPaymentByToken(pending.token))?.orderId;
      for (let i = 0; i < 3; i++) {
        assert.equal((await growCallback(pending.token)).headers.get("location"),
          `/thanks?payment=success&orderId=${orderId}`);
        assert.equal((await growWebhook(pending.token)).status, 200);
      }
      assert.deepEqual(approved, [pending.token]);
      assert.deepEqual(await counts(), { orders: initial.orders + 1, items: initial.items + 1 });
      await drainMail();
      assert.equal(mail.length, mailStart + 2);
      assert.equal((await growWebhook(pending.token, "late-failure", false)).status, 200);
      assert.equal((await storage.getPendingPaymentByToken(pending.token))?.status, "completed");
    });
  }
});

test("Grow concurrent callbacks and independent storage instances send at most one approval", async () => {
  let calls = 0;
  let entered!: () => void;
  let release!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const wait = new Promise<void>(resolve => { release = resolve; });
  const approve = async () => { calls++; entered(); await wait; };
  await withGrow(approve, async () => {
    const pending = await makePayment();
    const initial = await counts();
    const mailStart = mail.length;
    const requests = Promise.all([
      growCallback(pending.token),
      ...Array.from({ length: 5 }, () => growWebhook(pending.token)),
    ]);
    await started;
    await assert.rejects(secondStorage.approvePendingPayment(pending.token, pending.token, approve, true),
      /outcome unknown/);
    release();
    assert.ok((await requests).every(response => [200, 302, 500].includes(response.status)));
    assert.equal((await growWebhook(pending.token)).status, 200);
    assert.equal(calls, 1);
    await drainMail();
    assert.equal(mail.length, mailStart + 2);
    assert.deepEqual(await counts(), { orders: initial.orders + 1, items: initial.items + 1 });
  });
});

test("Grow lost response remains unknown; verified reconciliation makes repeats harmless without orders or emails", async () => {
  let calls = 0;
  await withGrow(async () => {
    calls++;
    throw new Error("Remote success followed by lost response");
  }, async () => {
    const pending = await makePayment();
    const initial = await counts();
    const mailStart = mail.length;
    assert.equal((await growWebhook(pending.token)).status, 500);
    const saved = await storage.getPendingPaymentByToken(pending.token);
    assert.equal(saved?.status, "completed");
    assert.equal(saved?.providerApprovedAt, null);
    assert.ok(saved?.providerApprovalAttemptedAt);
    await drainMail();
    assert.equal(mail.length, mailStart + 2);
    assert.equal((await growWebhook(pending.token)).status, 500);
    await storage.reconcilePendingPaymentApproval(pending.token, pending.token, "GROW-CASE-123");
    assert.ok((await storage.getPendingPaymentByToken(pending.token))?.providerApprovedAt);
    assert.equal((await growWebhook(pending.token)).status, 200);
    assert.equal(calls, 1);
    await drainMail();
    assert.equal(mail.length, mailStart + 2);
    assert.deepEqual(await counts(), { orders: initial.orders + 1, items: initial.items + 1 });
  });
});

test("Grow J5 never approves on webhook; saved mode survives configuration changes", async () => {
  let calls = 0;
  const approve = async () => { calls++; };
  for (const storedRequired of [null, false, true]) {
    await withGrow(approve, async () => {
      const pending = await makePayment();
      await pool.query("UPDATE pending_payments SET provider_approval_required = $1 WHERE token = $2",
        [storedRequired, pending.token]);
      assert.equal((await growCallback(pending.token)).status, 302);
      assert.equal((await growWebhook(pending.token)).status, 200);
      assert.equal((await growWebhook(pending.token)).status, 200);
      assert.equal((await storage.getPendingPaymentByToken(pending.token))?.providerApprovedAt, null);
    }, true);
  }
  assert.equal(calls, 0, "a verified J5 reservation must never be acknowledged as a normal charge");
  await withGrow(approve, async () => {
    const pending = await makePayment();
    await pool.query("UPDATE pending_payments SET provider_approval_required = false WHERE token = $1", [pending.token]);
    assert.equal((await growWebhook(pending.token)).status, 200);
  });
  assert.equal(calls, 0, "a saved J5 payment is not charged after J5 is disabled");
});

test("payment initiation persists Grow approval mode and webhook fills an absent transaction ID", async () => {
  const originalInitiate = GrowProvider.prototype.initiate;
  GrowProvider.prototype.initiate = async () => ({ redirectUrl: "https://gateway.example.test/pay" });
  let calls = 0;
  try {
    for (const j5 of [true, false]) {
      await withGrow(async () => { calls++; }, async () => {
        const response = await fetch(`${baseUrl}/api/payment/initiate`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [{ productId, quantity: "1", pricePerKg: "10", totalPrice: "10" }],
            totalAmount: "10",
            orderData: { totalAmount: "10", guestName: "Buyer", guestEmail: "guest@example.test" },
          }),
        });
        assert.equal(response.status, 200);
        const { token } = await response.json();
        assert.equal((await storage.getPendingPaymentByToken(token))?.providerApprovalRequired, !j5);
        // Older callbacks may have finalized without saving a transaction code.
        await storage.finalizePendingPayment(token);
        assert.equal((await growWebhook(token, "approved-" + token)).status, 200);
        if (!j5) {
          const saved = await storage.getPendingPaymentByToken(token);
          assert.equal(saved?.transactionId, "approved-" + token);
          assert.equal((await storage.getOrderById(saved!.orderId!))?.transactionId, "approved-" + token);
        }
      }, j5);
    }
  } finally { GrowProvider.prototype.initiate = originalInitiate; }
  assert.equal(calls, 1);
});

test("Grow rejects conflicting transactions; legacy completed payments require verified reconciliation", async () => {
  const approved: string[] = [];
  await withGrow(async id => { approved.push(id); }, async () => {
    const pending = await makePayment();
    await growCallback(pending.token);
    assert.equal((await growWebhook(pending.token, "other-transaction")).status, 400);
    assert.deepEqual(approved, []);
    assert.equal((await growWebhook(pending.token)).status, 200);
    assert.deepEqual(approved, [pending.token]);
    const legacy = await makePayment();
    await pool.query("UPDATE pending_payments SET status = 'completed', provider_approval_required = NULL WHERE token = $1", [legacy.token]);
    const initial = await counts();
    const mailStart = mail.length;
    assert.equal((await growWebhook(legacy.token)).status, 500);
    assert.equal((await storage.getPendingPaymentByToken(legacy.token))?.providerApprovalAttemptedAt, null);
    await secondStorage.reconcilePendingPaymentApproval(legacy.token, legacy.token, "GROW-CASE-LEGACY");
    assert.equal((await growWebhook(legacy.token)).status, 200);
    assert.deepEqual(await counts(), initial);
    assert.equal(mail.length, mailStart);
    assert.equal((await storage.getPendingPaymentByToken(legacy.token))?.orderId, null);
    assert.deepEqual(approved, [pending.token]);
  });
});

test("Grow process death preserves uncertain intent; a fresh process cannot repeat approval", async () => {
  const pending = await makePayment();
  await storage.finalizePendingPayment(pending.token, pending.token);
  const childCode = (approve: string) => `
    const { storage } = await import("./server/storage.ts");
    await storage.approvePendingPayment(${JSON.stringify(pending.token)}, ${JSON.stringify(pending.token)}, ${approve}, true);
    process.exit(0);
  `;
  const crash = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e",
    childCode("async () => process.exit(0)")], { encoding: "utf8", timeout: 20_000 });
  assert.equal(crash.status, 0, crash.stderr);
  assert.equal((await storage.getPendingPaymentByToken(pending.token))?.providerApprovedAt, null);
  assert.ok((await storage.getPendingPaymentByToken(pending.token))?.providerApprovalAttemptedAt);
  const recovery = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e",
    childCode("async () => {}")], { encoding: "utf8", timeout: 20_000 });
  assert.notEqual(recovery.status, 0);
  assert.match(recovery.stderr, /outcome unknown/);
  const reconcile = spawnSync(process.execPath, ["--import", "tsx", "scripts/reconcile-grow-approval.ts",
    "--token", pending.token, "--transaction-code", pending.token,
    "--grow-confirmation-reference", "GROW-CASE-CRASH", "--verified-non-j5-acknowledged"],
  { encoding: "utf8", timeout: 20_000 });
  assert.equal(reconcile.status, 0, reconcile.stderr);
  assert.ok((await storage.getPendingPaymentByToken(pending.token))?.providerApprovedAt);
  await secondStorage.approvePendingPayment(pending.token, pending.token,
    async () => assert.fail("persisted approval must not be repeated"), true);
});

test("Grow approval contract rejects HTTP, API, malformed JSON and network errors; only status 1 succeeds", async () => {
  const provider = new GrowProvider("test-user", "test-key", "test-page", true);
  const originalFetch = globalThis.fetch;
  try {
    for (const status of ["already-approved", "2", 2, true, [1], null, undefined]) {
      globalThis.fetch = async () => Response.json({ status, err: "Already approved" });
      await assert.rejects(provider.approveTransaction("txn"), /rejected/);
    }
    for (const response of [
      new Response("unavailable", { status: 503 }),
      new Response(JSON.stringify({ status: 0 })),
      new Response(JSON.stringify({})),
      new Response("not JSON"),
    ]) {
      globalThis.fetch = async () => response;
      await assert.rejects(provider.approveTransaction("txn"));
    }
    globalThis.fetch = async () => { throw new Error("network interrupted"); };
    await assert.rejects(provider.approveTransaction("txn"), /network interrupted/);
    globalThis.fetch = async (url, init) => {
      assert.ok(String(url).endsWith("/approveTransaction"));
      assert.ok(String(init?.body).includes("transactionCode=txn"));
      assert.ok(init?.signal, "approval has a bounded timeout");
      return new Response(JSON.stringify({ status: "1" }));
    };
    await provider.approveTransaction("txn");
    globalThis.fetch = async () => Response.json({ status: "1" });
    await provider.approveTransaction("txn");
    await provider.captureJ5("txn", 10);
  } finally { globalThis.fetch = originalFetch; }
});

test("Grow remote success then local commit failure never reissues approval", async () => {
  const pending = await makePayment();
  await storage.finalizePendingPayment(pending.token, pending.token);
  const initial = await counts();
  await drainMail();
  const mailStart = mail.length;
  let calls = 0;
  await pool.query(`CREATE FUNCTION reject_grow_commit() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.provider_approved_at IS NOT NULL THEN RAISE EXCEPTION 'Injected Grow commit failure'; END IF;
      RETURN NEW;
    END $$;
    CREATE CONSTRAINT TRIGGER reject_grow_commit AFTER UPDATE ON pending_payments
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION reject_grow_commit()`);
  try {
    await assert.rejects(storage.approvePendingPayment(pending.token, pending.token,
      async () => { calls++; }, true), /Injected Grow commit failure/);
    const saved = await storage.getPendingPaymentByToken(pending.token);
    assert.ok(saved?.providerApprovalAttemptedAt);
    assert.equal(saved?.providerApprovedAt, null);
    await assert.rejects(secondStorage.approvePendingPayment(pending.token, pending.token,
      async () => { calls++; }, true), /outcome unknown/);
    assert.equal(calls, 1);
  } finally {
    await pool.query("DROP TRIGGER reject_grow_commit ON pending_payments; DROP FUNCTION reject_grow_commit()");
  }
  await storage.reconcilePendingPaymentApproval(pending.token, pending.token, "GROW-CASE-COMMIT");
  await secondStorage.approvePendingPayment(pending.token, pending.token,
    async () => assert.fail("verified acknowledgment must not be repeated"), true);
  await drainMail();
  assert.equal(mail.length, mailStart);
  assert.deepEqual(await counts(), initial);
});

test("Grow reconciliation validates one completed non-J5 transaction and preserves the evidence on repeats", async () => {
  const pending = await makePayment();
  await assert.rejects(storage.reconcilePendingPaymentApproval(pending.token, pending.token, "GROW-CASE-VALID"),
    /Completed payment not found/);
  await storage.finalizePendingPayment(pending.token, pending.token);
  await assert.rejects(storage.reconcilePendingPaymentApproval(pending.token, "wrong-code", "GROW-CASE-VALID"),
    /mismatch/);
  await assert.rejects(storage.reconcilePendingPaymentApproval(pending.token, pending.token, ""),
    /reference/);
  await assert.rejects(storage.reconcilePendingPaymentApproval("missing", pending.token, "GROW-CASE-VALID"),
    /not found/);
  await pool.query("UPDATE pending_payments SET provider_approval_required = false WHERE token = $1", [pending.token]);
  await assert.rejects(storage.reconcilePendingPaymentApproval(pending.token, pending.token, "GROW-CASE-VALID"),
    /does not require/);
  await pool.query("UPDATE pending_payments SET provider_approval_required = true WHERE token = $1", [pending.token]);
  await Promise.all([
    storage.reconcilePendingPaymentApproval(pending.token, pending.token, "GROW-CASE-VALID"),
    secondStorage.reconcilePendingPaymentApproval(pending.token, pending.token, "GROW-CASE-VALID"),
  ]);
  const saved = await storage.getPendingPaymentByToken(pending.token);
  await secondStorage.reconcilePendingPaymentApproval(pending.token, pending.token, "GROW-CASE-OTHER");
  const repeated = await storage.getPendingPaymentByToken(pending.token);
  assert.deepEqual(repeated?.providerApprovedAt, saved?.providerApprovedAt);
  assert.equal(repeated?.providerApprovalReference, "GROW-CASE-VALID");
  const missingConsent = spawnSync(process.execPath, ["--import", "tsx", "scripts/reconcile-grow-approval.ts",
    "--token", pending.token, "--transaction-code", pending.token,
    "--grow-confirmation-reference", "GROW-CASE-OTHER"],
  { encoding: "utf8", timeout: 20_000 });
  assert.equal(missingConsent.status, 1);
  assert.equal((await storage.getPendingPaymentByToken(pending.token))?.providerApprovalReference, "GROW-CASE-VALID");
});

test("forged HYP success with a known token, mismatched amount/store and transaction never creates orders or emails", async () => {
  const pending = await makePayment();
  const initial = await counts();
  const mailStart = mail.length;
  const good = { Order: pending.token, CCode: "0", Id: pending.token, Amount: "10.00", Sign: hypSign(pending.token, pending.token) };
  for (const change of [
    { Sign: undefined }, { Sign: "forged" }, { Amount: "1.00" }, { Masof: "another-store" },
    { Coin: "2" }, { Id: "another-transaction" },
  ]) {
    const payload: Record<string, any> = { ...good, ...change };
    const q = new URLSearchParams(Object.entries(payload).filter(([, value]) => value !== undefined) as [string, string][]);
    const response = await fetch(`${baseUrl}/api/payment/callback?${q}`, { redirect: "manual" });
    assert.equal(response.headers.get("location"), "/checkout?payment=pending");
    assert.equal((await fetch(`${baseUrl}/api/payment/hyp/webhook`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    })).status, 400);
  }
  assert.deepEqual(await counts(), initial);
  assert.equal((await storage.getPendingPaymentByToken(pending.token))?.status, "pending");
  assert.equal(mail.length, mailStart);
  assert.equal((await webhook(pending.token)).status, 200);
  assert.equal((await webhook(pending.token, "other-transaction")).status, 400);
  await drainMail();
  assert.equal(mail.length, mailStart + 2);
});

test("known Grow token and claimed success cannot override unpaid status, wrong amount or merchant; approval follows verification", async () => {
  let approvals = 0;
  await withGrow(async () => { approvals++; }, async () => {
    const pending = await makePayment();
    const initial = await counts();
    const mailStart = mail.length;
    for (const evidence of [{ statusCode: 0 }, { sum: 1 }, { transactionId: "other-id" }]) {
      growEvidence.set(pending.token, evidence);
      assert.equal((await growCallback(pending.token)).headers.get("location"), "/checkout?payment=pending");
      assert.equal((await growWebhook(pending.token)).status, 400);
    }
    growEvidence.delete(pending.token);
    const settings = storage.getStoreSettings;
    storage.getStoreSettings = async () => {
      const s = await settings();
      return { ...s, paymentProviderConfig: { active: "grow", grow: {
        userId: "different-user", apiKey: "test-key", pageCode: "test-page",
      } } } as StoreSettings;
    };
    try { assert.equal((await growWebhook(pending.token)).status, 400); }
    finally { storage.getStoreSettings = settings; }
    assert.equal(approvals, 0);
    assert.deepEqual(await counts(), initial);
    assert.equal(mail.length, mailStart);
    const saved = await storage.getPendingPaymentByToken(pending.token);
    assert.equal(saved?.status, "pending");
    assert.equal(saved?.providerApprovalAttemptedAt, null);
    assert.equal((await growWebhook(pending.token)).status, 200);
    assert.equal(approvals, 1);
    assert.equal((await growWebhook(pending.token)).status, 200);
    assert.equal(approvals, 1);
  });
});

test("newer payments remain verifiable after changing active provider; signed legacy HYP payments need no new metadata", async () => {
  const pending = await makePayment();
  const original = storage.getStoreSettings;
  storage.getStoreSettings = async () => ({ ...await original(), paymentProviderConfig: { ...hypConfig, active: "none" } } as StoreSettings);
  try { assert.equal((await webhook(pending.token)).status, 200); }
  finally { storage.getStoreSettings = original; }
  const legacy = await makePayment();
  await pool.query("UPDATE pending_payments SET verification = NULL WHERE token = $1", [legacy.token]);
  assert.equal((await webhook(legacy.token, legacy.token, true, true)).status, 200);
  assert.equal((await callback(legacy.token, legacy.token, true)).headers.get("location"),
    `/thanks?payment=success&orderId=${(await storage.getPendingPaymentByToken(legacy.token))?.orderId}`);
});

test("public settings hide all payment credentials without hiding online-payment availability", async () => {
  const response = await fetch(`${baseUrl}/api/settings`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual((await response.json()).paymentProviderConfig, { active: "hyp", configured: true });
  const original = storage.getUser;
  storage.getUser = async () => ({ id: "admin-id", role: "admin" } as any);
  try {
    const admin = await fetch(`${baseUrl}/api/settings`, { headers: { "x-test-role": "admin", "x-test-user": "admin-id" } });
    assert.deepEqual((await admin.json()).paymentProviderConfig, hypConfig);
  } finally { storage.getUser = original; }
});

test("payment polling survives a database failure without exposing query details or crashing the server", async () => {
  const original = storage.getPendingPaymentByToken;
  storage.getPendingPaymentByToken = async () => { throw new Error("private database error"); };
  try {
    const response = await fetch(`${baseUrl}/api/payment/pending/known-token`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { message: "Payment status unavailable" });
  } finally { storage.getPendingPaymentByToken = original; }
  assert.equal((await fetch(`${baseUrl}/api/payment/pending/unknown-token`)).status, 404);
});

test("forged Host and forwarded headers cannot redirect provider-only notification secrets (all providers and legacy HYP)", async () => {
  const originalSettings = storage.getStoreSettings;
  const settings = await originalSettings();
  const payload = {
    items: [{ productId, quantity: "1", pricePerKg: "10", totalPrice: "10" }],
    totalAmount: "10", orderData: { totalAmount: "10", guestName: "Buyer", guestEmail: "guest@example.test" },
  };
  const configs = [
    { active: "hyp", hyp: hypConfig.hyp },
    { active: "grow", grow: { userId: "test-user", apiKey: "test-key", pageCode: "test-page" } },
    { active: "allpay", allpay: { login: "merchant", apiKey: "private-signing-key" } },
    { active: "payme", payme: { sellerPaymeId: "private-mpl" } },
  ];
  const classes = [HypProvider, GrowProvider, AllPayProvider, PaymeProvider];
  const canonical = process.env.REPLIT_APP_URL;
  process.env.REPLIT_APP_URL = "https://shop.example.test";
  try {
    for (const [n, config] of configs.entries()) {
      storage.getStoreSettings = async () => ({ ...settings, paymentProviderConfig: config } as StoreSettings);
      const prototype = classes[n].prototype;
      const originalInitiate = prototype.initiate;
      const destinations: InitiateParams[] = [];
      prototype.initiate = async params => {
        destinations.push(params);
        return { redirectUrl: "https://gateway.example.test/payment", saleId: "provider-sale" };
      };
      try {
        for (const route of n === 0 ? ["/api/payment/initiate", "/api/payment/hyp/initiate"] : ["/api/payment/initiate"]) {
          const response = await fetch(baseUrl + route, {
            method: "POST", headers: {
              "Content-Type": "application/json", Host: "attacker.example.test",
              Origin: "https://attacker.example.test", "X-Forwarded-Host": "attacker.example.test",
              "X-Forwarded-Proto": "http",
            }, body: JSON.stringify(payload),
          });
          assert.equal(response.status, 200);
          const body = await response.json();
          const sent = destinations.at(-1)!;
          const pending = await storage.getPendingPaymentByToken(body.token);
          for (const url of [sent.successUrl, sent.errorUrl, sent.notifyUrl!]) {
            assert.equal(new URL(url).origin, "https://shop.example.test");
            assert.ok(!url.includes("attacker"));
          }
          assert.equal(new URL(sent.notifyUrl!).searchParams.get("proof"), pending?.verification?.notifySecret);
          assert.ok(!sent.successUrl.includes("proof") && !sent.errorUrl.includes("proof"));
          assert.ok(!JSON.stringify(body).includes(pending!.verification!.notifySecret));
          assert.deepEqual(Object.keys(body).sort(), ["redirectUrl", "token"]);
        }
      } finally { prototype.initiate = originalInitiate; }
    }
  } finally {
    storage.getStoreSettings = originalSettings;
    if (canonical === undefined) delete process.env.REPLIT_APP_URL;
    else process.env.REPLIT_APP_URL = canonical;
  }
});

test("invalid or missing trusted payment origin fails before saving a session or contacting a provider", async () => {
  const originalInitiate = HypProvider.prototype.initiate;
  const previous = { app: process.env.REPLIT_APP_URL, allowed: process.env.ALLOWED_ORIGINS,
    domain: process.env.REPLIT_DEV_DOMAIN };
  let calls = 0;
  HypProvider.prototype.initiate = async () => { calls++; return { redirectUrl: "https://gateway.test/payment" }; };
  const count = async () => Number((await pool.query("SELECT COUNT(*) FROM pending_payments")).rows[0].count);
  const initial = await count();
  try {
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.REPLIT_DEV_DOMAIN;
    for (const configured of [undefined, "http://shop.test", "https://user:password@shop.test",
      "https://shop.test/path", "https://shop.test/?redirect=attacker.test", "https://shop.test/#fragment"]) {
      if (configured === undefined) delete process.env.REPLIT_APP_URL;
      else process.env.REPLIT_APP_URL = configured;
      const response = await fetch(`${baseUrl}/api/payment/initiate`, {
        method: "POST", headers: { "Content-Type": "application/json", Host: "attacker.example.test" },
        body: JSON.stringify({
          items: [{ productId, quantity: "1", pricePerKg: "10", totalPrice: "10" }],
          totalAmount: "10", orderData: { totalAmount: "10", guestName: "Buyer" },
        }),
      });
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { message: "A trusted HTTPS store origin is required for payments" });
    }
    assert.equal(calls, 0);
    assert.equal(await count(), initial);
  } finally {
    HypProvider.prototype.initiate = originalInitiate;
    for (const [key, value] of [["REPLIT_APP_URL", previous.app], ["ALLOWED_ORIGINS", previous.allowed],
      ["REPLIT_DEV_DOMAIN", previous.domain]] as const) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("AllPay and PayMe routes reject forged known-token notifications and accept authenticated notifications once", async () => {
  const original = storage.getStoreSettings;
  const baseSettings = await original();
  try {
    for (const name of ["allpay", "payme"] as const) {
      const config = name === "allpay"
        ? { active: name, allpay: { login: "merchant", apiKey: "private-signing-key" } }
        : { active: name, payme: { sellerPaymeId: "private-mpl" } };
      storage.getStoreSettings = async () => ({ ...baseSettings, paymentProviderConfig: config } as StoreSettings);
      const pending = await makePayment();
      const context = pending.verification!;
      context.saleId = "trusted-sale-" + pending.token;
      await storage.setPendingPaymentVerification(pending.token, context);
      const allPayPayload = { order_id: pending.token, add_field_1: pending.token, status: 1, amount: 10, currency: "ILS" };
      const authenticated = (p: Record<string, any>) => {
        const values = Object.keys(p).filter(k => k !== "sign" && p[k] !== "" && p[k] != null).sort().map(k => String(p[k]));
        return { ...p, sign: createHash("sha256").update([...values, "private-signing-key"].join(":")).digest("hex") };
      };
      const good = name === "allpay" ? authenticated(allPayPayload) : {
        transaction_id: pending.token, payme_sale_id: context.saleId, status_code: 0,
        notify_type: "sale-complete", price: 1000, currency: "ILS",
      };
      const send = (body: any, proof?: string) => fetch(`${baseUrl}/api/payment/webhook${proof ? `?proof=${proof}` : ""}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const initial = await counts();
      const mailStart = mail.length;
      assert.equal((await send(name === "allpay" ? allPayPayload : good)).status, 400);
      assert.equal((await send(name === "allpay" ? authenticated({ ...allPayPayload, amount: 1 }) :
        { ...good, price: 1 }, context.notifySecret)).status, 400);
      assert.deepEqual(await counts(), initial);
      assert.equal(mail.length, mailStart);
      if (name === "payme") {
        const returned = await fetch(`${baseUrl}/api/payment/callback?transaction_id=${pending.token}&payme_sale_id=${context.saleId}`, { redirect: "manual" });
        assert.equal(returned.headers.get("location"), "/checkout?payment=pending");
      }
      assert.equal((await send(good, context.notifySecret)).status, 200);
      assert.equal((await send(good, context.notifySecret)).status, 200);
      assert.deepEqual(await counts(), { orders: initial.orders + 1, items: initial.items + 1 });
      await drainMail();
      assert.equal(mail.length, mailStart + 2);
    }
  } finally { storage.getStoreSettings = original; }
});

test("Grow unverified already-approved reply is unknown, not successful or automatically repeated", async () => {
  const pending = await makePayment();
  await storage.finalizePendingPayment(pending.token, pending.token);
  const provider = new GrowProvider("test-user", "test-key", "test-page", true);
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({ status: 2, err: "Already approved" });
  };
  try {
    await assert.rejects(storage.approvePendingPayment(pending.token, pending.token,
      id => provider.approveTransaction(id), true), /rejected/);
    await assert.rejects(secondStorage.approvePendingPayment(pending.token, pending.token,
      id => provider.approveTransaction(id), true), /outcome unknown/);
    assert.equal(calls, 1);
    assert.equal((await storage.getPendingPaymentByToken(pending.token))?.providerApprovedAt, null);
  } finally { globalThis.fetch = originalFetch; }
});

test("death immediately after order commit is recovered by a new process, not a repeated callback", async () => {
  const pending = await makePayment();
  const child = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
    const { storage } = await import("./server/storage.ts");
    await storage.finalizePendingPayment(${JSON.stringify(pending.token)});
    process.exit(0);
  `], { encoding: "utf8", timeout: 20_000 });
  assert.equal(child.status, 0, child.stderr);
  const saved = await storage.getPendingPaymentByToken(pending.token);
  assert.ok(saved?.orderId);
  const intents = await pool.query("SELECT status FROM payment_email_outbox WHERE order_id = $1", [saved.orderId]);
  assert.equal(intents.rows.length, 2);
  assert.ok(intents.rows.every((row: { status: string }) => row.status === "pending"));
  const mailStart = mail.length;
  // A genuinely new OS process uses the real templates, stubbing only transport.
  const recovery = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
    const { emailService } = await import("./server/email-service.ts");
    emailService.updateSettings = async () => {};
    emailService.sendEmail = async () => true;
    const { processNextPaymentEmail } = await import("./server/payment-email-outbox.ts");
    while (await processNextPaymentEmail()) {}
    process.exit(0);
  `], { encoding: "utf8", timeout: 20_000 });
  assert.equal(recovery.status, 0, recovery.stderr);
  assert.equal((await pool.query("SELECT COUNT(*)::int AS n FROM payment_email_outbox WHERE order_id = $1 AND status = 'sent'", [saved.orderId])).rows[0].n, 2);
  await drainMail();
  assert.equal(mail.length, mailStart);
});

test("transport false schedules a retry; guest retry never resends a successful admin email", async () => {
  const pending = await makePayment();
  const result = await storage.finalizePendingPayment(pending.token);
  const mailStart = mail.length;
  assert.equal(await processNext(), true); // admin succeeds
  const { emailService } = await import("../server/email-service");
  const original = emailService.sendEmail;
  emailService.sendEmail = async () => false;
  try {
    assert.equal(await processNext(), true);
  } finally {
    emailService.sendEmail = original;
  }
  const failed = (await pool.query("SELECT * FROM payment_email_outbox WHERE order_id = $1 AND audience = 'guest'", [result.orderId])).rows[0];
  assert.equal(failed.status, "pending");
  assert.equal(failed.attempts, 1);
  assert.ok(failed.available_at.getTime() > Date.now());
  assert.equal(await processNext(), false, "not retried before backoff");
  await pool.query("UPDATE payment_email_outbox SET available_at = now() WHERE id = $1", [failed.id]);
  await drainMail();
  assert.deepEqual(mail.slice(mailStart).map(m => m.to), ["admin@example.test", "guest@example.test"]);
  assert.equal((await pool.query("SELECT attempts FROM payment_email_outbox WHERE id = $1", [failed.id])).rows[0].attempts, 2);
});

test("worker death with a locked notification rolls back and releases it for recovery", async () => {
  const pending = await makePayment();
  const result = await storage.finalizePendingPayment(pending.token);
  const child = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
    const { processNextPaymentEmail } = await import("./server/payment-email-outbox.ts");
    await processNextPaymentEmail(undefined, async () => process.exit(0));
    process.exit(1);
  `], { encoding: "utf8", timeout: 20_000 });
  assert.equal(child.status, 0, child.stderr);
  const rows = (await pool.query("SELECT status, attempts FROM payment_email_outbox WHERE order_id = $1", [result.orderId])).rows;
  assert.ok(rows.every((row: { status: string; attempts: number }) => row.status === "pending" && row.attempts === 0));
  const mailStart = mail.length;
  await Promise.all(Array.from({ length: 8 }, drainMail));
  assert.equal(mail.length, mailStart + 2);
});

test("a competing worker skips a notification even while delivery is slow", async () => {
  const pending = await makePayment("payment-customer");
  await storage.finalizePendingPayment(pending.token);
  let started!: () => void;
  let release!: () => void;
  const deliveryStarted = new Promise<void>(resolve => { started = resolve; });
  const wait = new Promise<void>(resolve => { release = resolve; });
  let calls = 0;
  const first = processNext(undefined, async () => { calls++; started(); await wait; });
  await deliveryStarted;
  try {
    assert.equal(await processNext(undefined, async () => { calls++; }), false);
  } finally {
    release();
  }
  await first;
  assert.equal(calls, 1);
});

test("repeated thrown errors stop after eight attempts and keep a redacted failure for manual retry", async () => {
  const pending = await makePayment("payment-customer");
  const result = await storage.finalizePendingPayment(pending.token);
  const { emailRetryDelay, MAX_EMAIL_ATTEMPTS } = await import("../server/payment-email-outbox");
  for (let attempt = 1; attempt <= MAX_EMAIL_ATTEMPTS; attempt++) {
    await pool.query("UPDATE payment_email_outbox SET available_at = now() WHERE order_id = $1", [result.orderId]);
    assert.equal(await processNext(undefined, async () => { throw new Error("secret transport payload"); }), true);
    const row = (await pool.query("SELECT * FROM payment_email_outbox WHERE order_id = $1", [result.orderId])).rows[0];
    assert.equal(row.attempts, attempt);
    assert.equal(row.status, attempt === MAX_EMAIL_ATTEMPTS ? "failed" : "pending");
    assert.equal(row.last_error, "Order email delivery failed");
    assert.ok(row.available_at.getTime() > Date.now() + emailRetryDelay(attempt) - 2000);
  }
  assert.equal(await processNext(undefined, async () => { assert.fail("exhausted notification must not run"); }), false);
});

test("failure inserting an outbox intent rolls back order, items and payment completion", async () => {
  const pending = await makePayment();
  const initial = await counts();
  await pool.query(`
    CREATE FUNCTION reject_email_intent() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'Injected outbox failure'; END $$;
    CREATE TRIGGER reject_email_intent BEFORE INSERT ON payment_email_outbox
      FOR EACH ROW EXECUTE FUNCTION reject_email_intent();
  `);
  try {
    await assert.rejects(storage.finalizePendingPayment(pending.token), /Injected outbox failure/);
    assert.deepEqual(await counts(), initial);
    assert.equal((await storage.getPendingPaymentByToken(pending.token))?.status, "pending");
  } finally {
    await pool.query("DROP TRIGGER reject_email_intent ON payment_email_outbox; DROP FUNCTION reject_email_intent()");
  }
  assert.equal((await storage.finalizePendingPayment(pending.token)).created, true);
});

test("failed-email API is admin-only, validates IDs and never exposes transport secrets", async () => {
  const pending = await makePayment();
  const result = await storage.finalizePendingPayment(pending.token);
  const rows = await pool.query(
    "UPDATE payment_email_outbox SET status = 'failed', attempts = 8, last_error = 'smtp password SECRET guestAccessToken=PRIVATE' WHERE order_id = $1 RETURNING id, audience",
    [result.orderId],
  );
  const id = rows.rows[0].id;
  for (const [role, status] of [
    [undefined, 401], ["customer", 403], ["worker", 403], ["super_admin", 403],
  ] as const) {
    const headers: Record<string, string> = role ? { "x-test-role": role } : {};
    for (const [path, method] of [
      ["/api/admin/payment-email-outbox", "GET"],
      [`/api/admin/payment-email-outbox/${id}/retry`, "POST"],
    ]) {
      assert.equal((await fetch(baseUrl + path, { method, headers })).status, status);
    }
  }
  const headers = { "x-test-role": "admin" };
  const response = await fetch(baseUrl + "/api/admin/payment-email-outbox", { headers });
  assert.equal(response.status, 200);
  const body = await response.json();
  const item = body.items.find((row: any) => row.id === id);
  assert.deepEqual(item, { id, orderId: result.orderId, audience: rows.rows[0].audience, attempts: 8, diagnostic: "delivery_failed" });
  assert.ok(!JSON.stringify(body).includes("SECRET"));
  assert.ok(!JSON.stringify(body).includes("PRIVATE"));
  assert.ok(!JSON.stringify(body).includes("example.test"));
  for (const value of ["0", "-1", "1.5", "abc", "2147483648"]) {
    assert.equal((await fetch(`${baseUrl}/api/admin/payment-email-outbox?before=${value}`, { headers })).status, 400);
    assert.equal((await fetch(`${baseUrl}/api/admin/payment-email-outbox/${value}/retry`, { method: "POST", headers })).status, 400);
  }
  assert.equal((await fetch(`${baseUrl}/api/admin/payment-email-outbox?before=1&before=2`, { headers })).status, 400);
});

test("parallel admin retries enqueue once, preserve sent/pending, and worker delivers only the retried audience", async () => {
  const pending = await makePayment();
  const result = await storage.finalizePendingPayment(pending.token);
  await drainMail();
  const [admin, guest] = (await pool.query(
    "SELECT * FROM payment_email_outbox WHERE order_id = $1 ORDER BY audience",
    [result.orderId],
  )).rows;
  await pool.query("UPDATE payment_email_outbox SET status = 'failed', attempts = 8, sent_at = NULL, last_error = 'secret' WHERE id = $1", [guest.id]);
  const requestRetry = (id: number) => fetch(`${baseUrl}/api/admin/payment-email-outbox/${id}/retry`, {
    method: "POST", headers: { "x-test-role": "admin" },
  });
  const responses = await Promise.all(Array.from({ length: 10 }, () => requestRetry(guest.id)));
  assert.deepEqual(responses.map(r => r.status).sort(), [200, ...Array(9).fill(409)]);
  const queued = (await pool.query("SELECT * FROM payment_email_outbox WHERE id = $1", [guest.id])).rows[0];
  assert.equal(queued.status, "pending");
  assert.equal(queued.attempts, 0);
  assert.equal(queued.last_error, null);
  assert.ok(queued.available_at.getTime() <= Date.now());
  assert.equal((await requestRetry(admin.id)).status, 409);
  assert.equal((await requestRetry(guest.id)).status, 409);
  assert.equal((await requestRetry(2147483647)).status, 409);
  assert.deepEqual((await pool.query("SELECT * FROM payment_email_outbox WHERE id = $1", [admin.id])).rows[0], admin);
  const sent: number[] = [];
  await processNext(undefined, async notification => { sent.push(notification.id); });
  assert.deepEqual(sent, [guest.id]);
  assert.equal((await requestRetry(guest.id)).status, 409);
  const final = (await pool.query("SELECT * FROM payment_email_outbox WHERE id = $1", [guest.id])).rows[0];
  assert.equal(final.status, "sent");
  assert.equal(final.attempts, 1);
});

test("failed-email list uses bounded cursor pages without exposing pending or sent messages", async () => {
  const orders = (await pool.query(
    "INSERT INTO orders (total_amount, status) SELECT 10, 'delivered' FROM generate_series(1, 52) RETURNING id",
  )).rows.map((row: any) => row.id);
  try {
    await pool.query(
      `INSERT INTO payment_email_outbox (order_id, audience, recipient, status, attempts)
       SELECT unnest($1::int[]), 'admin', 'secret@example.test', 'failed', 8`,
      [orders],
    );
    const headers = { "x-test-role": "admin" };
    const expectedCount = Number((await pool.query(
      "SELECT count(*) FROM payment_email_outbox WHERE status = 'failed'",
    )).rows[0].count);
    const first = await (await fetch(baseUrl + "/api/admin/payment-email-outbox", { headers })).json();
    assert.equal(first.items.length, 50);
    assert.equal(first.totalCount, expectedCount);
    assert.equal(first.nextCursor, first.items[49].id);
    const second = await (await fetch(`${baseUrl}/api/admin/payment-email-outbox?before=${first.nextCursor}`, { headers })).json();
    assert.equal(second.totalCount, expectedCount);
    assert.equal(second.nextCursor, null);
    const all = [...first.items, ...second.items];
    assert.equal(new Set(all.map((row: any) => row.id)).size, all.length);
    assert.equal(all.filter((row: any) => orders.includes(row.orderId)).length, 52);
    for (let i = 1; i < all.length; i++) assert.ok(all[i - 1].id > all[i].id);
    const emptyPage = await (await fetch(`${baseUrl}/api/admin/payment-email-outbox?before=1`, { headers })).json();
    assert.equal(emptyPage.items.length, 0);
    assert.equal(emptyPage.totalCount, expectedCount);
    const retry = await fetch(`${baseUrl}/api/admin/payment-email-outbox/${first.items[0].id}/retry`, {
      method: "POST", headers,
    });
    assert.equal(retry.status, 200);
    const refreshed = await (await fetch(baseUrl + "/api/admin/payment-email-outbox", { headers })).json();
    assert.equal(refreshed.totalCount, expectedCount - 1);
  } finally {
    await pool.query("DELETE FROM orders WHERE id = ANY($1::int[])", [orders]);
  }
});

test("checkout eligibility is persisted; disabling new notifications does not discard existing intents", async () => {
  const original = storage.getStoreSettings;
  const settings = await secondStorage.getStoreSettings();
  assert.ok(settings);
  try {
    for (const override of [{ emailNotificationsEnabled: false }, { orderNotificationEmail: null }]) {
      await pool.query("UPDATE store_settings SET email_notifications_enabled = $1, order_notification_email = $2",
        [override.emailNotificationsEnabled ?? true, "orderNotificationEmail" in override ? null : settings.orderNotificationEmail]);
      const result = await storage.finalizePendingPayment((await makePayment()).token);
      assert.equal((await pool.query("SELECT COUNT(*)::int AS n FROM payment_email_outbox WHERE order_id = $1", [result.orderId])).rows[0].n, 0);
    }
    await pool.query("UPDATE store_settings SET email_notifications_enabled = true, order_notification_email = $1", [settings.orderNotificationEmail]);
    await storage.finalizePendingPayment((await makePayment()).token);
    await pool.query("UPDATE store_settings SET email_notifications_enabled = false, order_notification_email = 'changed@example.test'");
    storage.getStoreSettings = secondStorage.getStoreSettings.bind(secondStorage);
    const mailStart = mail.length;
    await drainMail();
    assert.deepEqual(mail.slice(mailStart).map(m => m.to), ["admin@example.test", "guest@example.test"]);
  } finally {
    storage.getStoreSettings = original;
    await pool.query("UPDATE store_settings SET email_notifications_enabled = true, order_notification_email = $1", [settings.orderNotificationEmail]);
  }
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
