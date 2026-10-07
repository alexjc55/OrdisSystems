import { and, desc, eq, lt, lte, sql } from "drizzle-orm";
import { paymentEmailOutbox } from "@shared/schema";
import { getDB } from "./db";
import { storage } from "./storage";
import { sendPaidOrderEmails } from "./payment-order-email";
import { sendCheckoutOrderEmail } from "./checkout-order-email";

export const MAX_EMAIL_ATTEMPTS = 8;
export const EMAIL_POLL_INTERVAL_MS = 5_000;
export const emailRetryDelay = (attempt: number) =>
  Math.min(30_000 * 2 ** (attempt - 1), 60 * 60 * 1000);

type Notification = typeof paymentEmailOutbox.$inferSelect;
type Database = NonNullable<Awaited<ReturnType<typeof getDB>>>;
type Deliver = (notification: Notification) => Promise<void>;

// Explicit projection: never expose recipient, guest links or stored errors,
// including historical errors written by other server versions.
export async function listFailedPaymentEmails(before?: number, database?: Database) {
  const db = database ?? await getDB();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select({
    id: paymentEmailOutbox.id,
    orderId: paymentEmailOutbox.orderId,
    audience: paymentEmailOutbox.audience,
    attempts: paymentEmailOutbox.attempts,
  }).from(paymentEmailOutbox).where(and(
    eq(paymentEmailOutbox.status, "failed"),
    before === undefined ? undefined : lt(paymentEmailOutbox.id, before),
  )).orderBy(desc(paymentEmailOutbox.id)).limit(51);
  const items = rows.slice(0, 50).map(row => ({
    ...row, diagnostic: "delivery_failed" as const,
  }));
  return { items, nextCursor: rows.length > 50 ? items[49].id : null };
}

export async function retryFailedPaymentEmail(id: number, database?: Database): Promise<boolean> {
  const db = database ?? await getDB();
  if (!db) throw new Error("Database unavailable");
  // PostgreSQL rechecks this predicate after waiting on a competing UPDATE.
  // Only one caller can reset a failed row; pending/sent are never changed.
  const rows = await db.update(paymentEmailOutbox).set({
    status: "pending", attempts: 0, availableAt: sql`now()`, lastError: null,
  }).where(and(
    eq(paymentEmailOutbox.id, id),
    eq(paymentEmailOutbox.status, "failed"),
  )).returning({ id: paymentEmailOutbox.id });
  return rows.length === 1;
}

async function deliverOrderEmail(notification: Notification): Promise<void> {
  if (notification.checkoutSnapshot) {
    const settings = await storage.getStoreSettings();
    if (!settings) throw new Error("Store settings unavailable");
    await sendCheckoutOrderEmail(
      notification.orderId, notification.audience, notification.recipient,
      notification.checkoutSnapshot, settings,
    );
    return;
  }
  const [order, settings] = await Promise.all([
    storage.getOrderById(notification.orderId),
    storage.getStoreSettings(),
  ]);
  if (!order || !settings) throw new Error("Order or store settings unavailable");
  // Eligibility and recipient were fixed at checkout. Later disabling new
  // notifications must not silently discard already committed delivery intents.
  await sendPaidOrderEmails({
    ...order,
    ...(notification.audience === "guest" ? { guestEmail: notification.recipient } : {}),
  }, {
    ...settings,
    emailNotificationsEnabled: true,
    orderNotificationEmail: notification.audience === "admin"
      ? notification.recipient : settings.orderNotificationEmail || notification.recipient,
  }, undefined, notification.audience);
}

// Hold the PostgreSQL row lock THROUGH delivery. There is no expiring lease
// that could allow another worker to send while the first is still running.
// Process death releases the lock/rolls back; a new worker can then recover it.
// SMTP/SendGrid cannot guarantee exactly-once: death after provider acceptance
// but before our commit can still cause redelivery.
export async function processNextPaymentEmail(
  database?: Database,
  deliver: Deliver = deliverOrderEmail,
): Promise<boolean> {
  const db = database ?? await getDB();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async tx => {
    const [notification] = await tx.select().from(paymentEmailOutbox)
      .where(and(
        eq(paymentEmailOutbox.status, "pending"),
        lte(paymentEmailOutbox.availableAt, sql`now()`),
      ))
      .orderBy(paymentEmailOutbox.availableAt, paymentEmailOutbox.id)
      .limit(1).for("update", { skipLocked: true });
    if (!notification) return false;
    const attempts = notification.attempts + 1;
    try {
      await deliver(notification);
    } catch {
      // Store only a fixed diagnostic: transport exceptions can include
      // passwords, addresses, message bodies or guest access links.
      await tx.update(paymentEmailOutbox).set({
        attempts,
        status: attempts >= MAX_EMAIL_ATTEMPTS ? "failed" : "pending",
        availableAt: sql`now() + ${emailRetryDelay(attempts)} * interval '1 millisecond'`,
        lastError: "Order email delivery failed",
      }).where(eq(paymentEmailOutbox.id, notification.id));
      console.error(`Payment email ${notification.id}: attempt ${attempts} failed${attempts >= MAX_EMAIL_ATTEMPTS ? "; manual retry required" : ""}`);
      return true;
    }
    await tx.update(paymentEmailOutbox).set({
      status: "sent", attempts, sentAt: sql`now()`, lastError: null,
    }).where(eq(paymentEmailOutbox.id, notification.id));
    return true;
  });
}

export function startPaymentEmailWorker(): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const poll = async () => {
    try {
      // Sequential within a process, SKIP LOCKED between processes.
      for (let count = 0; count < 10 && !stopped; count++) {
        if (!await processNextPaymentEmail()) break;
      }
    } catch {
      console.error("Payment email queue unavailable; will retry");
    } finally {
      if (!stopped) {
        timer = setTimeout(poll, EMAIL_POLL_INTERVAL_MS);
        timer.unref();
      }
    }
  };
  void poll();
  return () => { stopped = true; if (timer) clearTimeout(timer); };
}
