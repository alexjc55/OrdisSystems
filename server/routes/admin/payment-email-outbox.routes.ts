import { Router } from "express";
import { requireAdmin } from "../../middleware/auth-guard";
import { listFailedPaymentEmails, retryFailedPaymentEmail } from "../../payment-email-outbox";

const router = Router();

function positiveId(value: unknown): number | undefined {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : undefined;
}

router.get("/admin/payment-email-outbox", requireAdmin, async (req, res) => {
  const before = req.query.before === undefined ? undefined : positiveId(req.query.before);
  if (req.query.before !== undefined && before === undefined) {
    return res.status(400).json({ message: "Invalid cursor" });
  }
  try {
    return res.json(await listFailedPaymentEmails(before));
  } catch {
    return res.status(503).json({ message: "Email queue unavailable" });
  }
});

router.post("/admin/payment-email-outbox/:id/retry", requireAdmin, async (req, res) => {
  const id = positiveId(req.params.id);
  if (id === undefined) return res.status(400).json({ message: "Invalid notification ID" });
  try {
    if (!await retryFailedPaymentEmail(id)) {
      return res.status(409).json({ message: "Notification is not failed", code: "notification_not_failed" });
    }
    return res.json({ queued: true });
  } catch {
    return res.status(503).json({ message: "Email queue unavailable" });
  }
});

export default router;
