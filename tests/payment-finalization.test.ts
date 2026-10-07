import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import express from "express";
import type { Server } from "node:http";
import type { StoreSettings } from "../shared/schema";
import { GrowProvider } from "../server/lib/payment-providers";

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
  await pool.query("ALTER TABLE pending_payments DROP COLUMN provider_approval_required, DROP COLUMN provider_approved_at");
  const approvalMigration = await readFile("migrations/0009_payment_provider_approval.sql", "utf8");
  await pool.query(approvalMigration);
  await pool.query(approvalMigration);
  const product = await pool.query(
    "INSERT INTO products (name, price, price_per_kg) VALUES ('Тестовый продукт', 10, 10) RETURNING id",
  );
  productId = product.rows[0].id;

  const settings = {
    emailNotificationsEnabled: true, orderNotificationEmail: "admin@example.test",
    orderNotificationFromEmail: "shop@example.test", orderNotificationFromName: "Shop",
    storeName: "Shop", defaultLanguage: "ru", paymentProviderConfig: { active: "none" },
  } as StoreSettings;
  await storage.updateStoreSettings(settings);
  // Keep real database finalization, item joins, routes and mail templates;
  // replace only store config and the external mail transport.
  storage.getStoreSettings = async () => settings;
  const { emailService } = await import("../server/email-service");
  emailService.updateSettings = async () => {};
  emailService.sendEmail = async params => { mail.push(params); return true; };
  processNext = (await import("../server/payment-email-outbox")).processNextPaymentEmail;
  const { default: paymentRoutes } = await import("../server/routes/payment.routes");
  const app = express();
  app.use(express.json());
  app.use("/api", paymentRoutes);
  await new Promise<void>(resolve => { server = app.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(drainMail);

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
      const repeated = await callback(pending.token, "different-txn", legacy);
      assert.equal(repeated.headers.get("location"), responses[0].headers.get("location"));
      assert.equal(await (await webhook(pending.token, "different-txn", true, legacy)).text(), "OK");
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

function growWebhook(token: string, transactionId = token, success = true) {
  return fetch(`${baseUrl}/api/payment/webhook?token=${token}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    // Exercise the token fallback in notifyUrl too.
    body: JSON.stringify({ transactionCode: transactionId, paymentSum: success ? "10" : "" }),
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

test("Grow concurrent callback and webhooks across independent storage instances serialize approval", async () => {
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
    const competing = secondStorage.approvePendingPayment(pending.token, pending.token, approve, true);
    release();
    await competing;
    assert.ok((await requests).every(response => response.status < 400));
    assert.equal(calls, 1);
    await drainMail();
    assert.equal(mail.length, mailStart + 2);
    assert.deepEqual(await counts(), { orders: initial.orders + 1, items: initial.items + 1 });
  });
});

test("Grow approval failure returns 500 and a repeat retries without duplicate orders or emails", async () => {
  let calls = 0;
  await withGrow(async () => {
    if (++calls === 1) throw new Error("Simulated approval rejection");
  }, async () => {
    const pending = await makePayment();
    const initial = await counts();
    const mailStart = mail.length;
    assert.equal((await growWebhook(pending.token)).status, 500);
    const saved = await storage.getPendingPaymentByToken(pending.token);
    assert.equal(saved?.status, "completed");
    assert.equal(saved?.providerApprovedAt, null);
    await drainMail();
    assert.equal(mail.length, mailStart + 2);
    assert.equal((await growWebhook(pending.token)).status, 200);
    assert.ok((await storage.getPendingPaymentByToken(pending.token))?.providerApprovedAt);
    assert.equal((await growWebhook(pending.token)).status, 200);
    assert.equal(calls, 2);
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
      if (storedRequired !== null) {
        await pool.query("UPDATE pending_payments SET provider_approval_required = $1 WHERE token = $2",
          [storedRequired, pending.token]);
      }
      assert.equal((await growCallback(pending.token)).status, 302);
      assert.equal((await growWebhook(pending.token)).status, 200);
      assert.equal((await growWebhook(pending.token)).status, 200);
      assert.equal(!!(await storage.getPendingPaymentByToken(pending.token))?.providerApprovedAt, storedRequired === true);
    }, true);
  }
  assert.equal(calls, 1, "only the payment initiated as non-J5 is approved despite current J5 settings");
  await withGrow(approve, async () => {
    const pending = await makePayment();
    await pool.query("UPDATE pending_payments SET provider_approval_required = false WHERE token = $1", [pending.token]);
    assert.equal((await growWebhook(pending.token)).status, 200);
  });
  assert.equal(calls, 1, "a saved J5 payment is not charged after J5 is disabled");
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

test("Grow never approves a conflicting transaction; a legacy completed row can be approved without recreation", async () => {
  const approved: string[] = [];
  await withGrow(async id => { approved.push(id); }, async () => {
    const pending = await makePayment();
    await growCallback(pending.token);
    assert.equal((await growWebhook(pending.token, "other-transaction")).status, 500);
    assert.deepEqual(approved, []);
    assert.equal((await growWebhook(pending.token)).status, 200);
    assert.deepEqual(approved, [pending.token]);
    const legacy = await makePayment();
    await pool.query("UPDATE pending_payments SET status = 'completed' WHERE token = $1", [legacy.token]);
    const initial = await counts();
    const mailStart = mail.length;
    assert.equal((await growWebhook(legacy.token)).status, 200);
    assert.equal((await growWebhook(legacy.token)).status, 200);
    assert.deepEqual(await counts(), initial);
    assert.equal(mail.length, mailStart);
    assert.equal((await storage.getPendingPaymentByToken(legacy.token))?.orderId, null);
    assert.deepEqual(approved, [pending.token, legacy.token]);
  });
});

test("Grow durable approval survives process restart; death while holding lock leaves approval retryable", async () => {
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
  const recovery = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e",
    childCode("async () => {}")], { encoding: "utf8", timeout: 20_000 });
  assert.equal(recovery.status, 0, recovery.stderr);
  assert.ok((await storage.getPendingPaymentByToken(pending.token))?.providerApprovedAt);
  await secondStorage.approvePendingPayment(pending.token, pending.token,
    async () => assert.fail("persisted approval must not be repeated"), true);
});

test("Grow approval contract rejects HTTP, API, malformed JSON and network errors; only status 1 succeeds", async () => {
  const provider = new GrowProvider("test-user", "test-key", "test-page", true);
  const originalFetch = globalThis.fetch;
  try {
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
    await provider.captureJ5("txn", 10);
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
