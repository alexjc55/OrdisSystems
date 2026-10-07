import { and, eq, lte, sql } from "drizzle-orm";
import { paymentEmailOutbox } from "@shared/schema";
import { getDB } from "./db";
import { storage } from "./storage";
import { sendPaidOrderEmails } from "./payment-order-email";

export const MAX_EMAIL_ATTEMPTS = 8;
export const EMAIL_POLL_INTERVAL_MS = 5_000;
export const emailRetryDelay = (attempt: number) =>
  Math.min(30_000 * 2 ** (attempt - 1), 60 * 60 * 1000);

type Notification = typeof paymentEmailOutbox.$inferSelect;
type Database = NonNullable<Awaited<ReturnType<typeof getDB>>>;
type Deliver = (notification: Notification) => Promise<void>;

async function deliverOrderEmail(notification: Notification): Promise<void> {
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
