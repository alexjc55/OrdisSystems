import { Router } from "express";
import { storage } from "../storage";
import { randomBytes as rb } from "crypto";
import { type InsertOrder, type InsertOrderItem } from "@shared/schema";
import { sendNewOrderEmail, sendGuestOrderEmail } from "../email-service";
import { BRANCHES_ENABLED } from "../config";
import { getProvider } from "../lib/payment-providers/index";

const router = Router();

// ─── Helper: create real order from pending payment ───────────────────────────
async function finalizeOrder(
  pending: Awaited<ReturnType<typeof storage.getPendingPaymentByToken>>,
  transactionId?: string
): Promise<number> {
  if (!pending) throw new Error("Pending payment not found");

  const orderData = pending.orderData as InsertOrder & {
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
    firstName?: string;
    lastName?: string;
  };

  const isGuest = !pending.userId;
  let extraFields: Partial<InsertOrder> = {};

  if (isGuest) {
    const guestAccessToken = rb(32).toString("hex");
    const guestClaimToken = rb(32).toString("hex");
    const guestAccessTokenExpires = new Date();
    guestAccessTokenExpires.setDate(guestAccessTokenExpires.getDate() + 30);
    extraFields = { guestAccessToken, guestClaimToken, guestAccessTokenExpires };
  }

  const insertOrder: InsertOrder = {
    ...orderData,
    userId: pending.userId || null,
    status: "pending",
    paymentMethod: "online",
    ...extraFields,
  };

  const itemsRaw = pending.orderItems as Array<{
    productId: number | string;
    quantity: number | string;
    pricePerKg: number | string;
    totalPrice: number | string;
    orderId?: number;
  }>;

  const insertItems: InsertOrderItem[] = itemsRaw.map((item) => ({
    productId: Number(item.productId),
    quantity: String(item.quantity),
    pricePerKg: String(item.pricePerKg),
    totalPrice: String(item.totalPrice),
    orderId: 0,
  }));

  const newOrder = await storage.createOrder(insertOrder, insertItems);

  try {
    const settings = await storage.getStoreSettings();
    if (isGuest) {
      await sendGuestOrderEmail(newOrder as any, settings as any);
    } else {
      await sendNewOrderEmail(newOrder as any, settings as any);
    }
  } catch (emailErr) {
    console.error("Payment order email error:", emailErr);
  }

  return newOrder.id;
}

// ─── Helper: build pending payment + call provider initiate ──────────────────
async function initiatePayment(req: any, res: any) {
  try {
    const settings = await storage.getStoreSettings();
    if (!settings) {
      return res.status(400).json({ message: "Store settings not found" });
    }

    const provider = getProvider(settings as any);
    if (!provider) {
      return res.status(400).json({ message: "No online payment provider configured" });
    }

    const { items, totalAmount, orderData: clientOrderData, userId, language, branchId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Invalid order items" });
    }
    if (!clientOrderData) {
      return res.status(400).json({ message: "Order data is required" });
    }

    const token = rb(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 3);

    const parsedBranchId =
      BRANCHES_ENABLED && branchId && !isNaN(parseInt(branchId))
        ? parseInt(branchId)
        : undefined;

    const orderSnapshot: InsertOrder = {
      ...clientOrderData,
      paymentMethod: "online",
      orderLanguage: language || "ru",
      ...(parsedBranchId !== undefined ? { branchId: parsedBranchId } : {}),
    };

    await storage.createPendingPayment({
      token,
      orderData: orderSnapshot as any,
      orderItems: items as any,
      userId: userId || null,
      status: "pending",
      expiresAt,
    });

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const amountInAgorot = Math.round(parseFloat(String(totalAmount)) * 100);

    const customerName =
      clientOrderData.guestName ||
      (clientOrderData.firstName && clientOrderData.lastName
        ? `${clientOrderData.firstName} ${clientOrderData.lastName}`
        : "");
    const customerEmail = clientOrderData.guestEmail || clientOrderData.email || "";
    const customerPhone =
      clientOrderData.guestPhone || clientOrderData.customerPhone || clientOrderData.phone || "";

    const result = await provider.initiate({
      token,
      amountInAgorot,
      customerName,
      customerEmail,
      customerPhone,
      successUrl: `${baseUrl}/api/payment/callback`,
      errorUrl: `${baseUrl}/api/payment/callback?status=error`,
      notifyUrl: `${baseUrl}/api/payment/webhook`,
      language,
    });

    return res.json({ redirectUrl: result.redirectUrl, token });
  } catch (error) {
    console.error("Payment initiate error:", error);
    return res.status(500).json({ message: "Failed to initiate payment" });
  }
}

// ─── Helper: handle callback (browser redirect from gateway) ─────────────────
async function handleCallback(req: any, res: any) {
  const q = req.query as Record<string, string>;
  const settings = await storage.getStoreSettings().catch(() => null);
  const provider = settings ? getProvider(settings as any) : null;

  let token: string | undefined;
  let isSuccess = false;
  let transactionId: string | undefined;

  if (provider) {
    const parsed = provider.parseCallback(q);
    token = parsed.token;
    isSuccess = parsed.isSuccess;
    transactionId = parsed.transactionId;
  } else {
    // Fallback: try to parse as HYP (for already-in-flight sessions)
    token = q.Order || q.token;
    isSuccess = q.CCode === "0" || (q.status === "success" && !q.CCode);
    transactionId = q.Id || q.TransactionId;
  }

  if (!token) {
    return res.redirect("/?payment=error");
  }

  try {
    const pending = await storage.getPendingPaymentByToken(token);
    if (!pending || pending.status === "completed") {
      return res.redirect(`/thanks?payment=${isSuccess ? "success" : "failed"}`);
    }

    if (isSuccess) {
      const orderId = await finalizeOrder(pending, transactionId);
      await storage.updatePendingPaymentStatus(token, "completed", transactionId);
      return res.redirect(`/thanks?payment=success&orderId=${orderId}`);
    } else {
      await storage.updatePendingPaymentStatus(token, "failed");
      return res.redirect("/checkout?payment=failed");
    }
  } catch (error) {
    console.error("Payment callback error:", error);
    return res.redirect("/checkout?payment=failed");
  }
}

// ─── Helper: handle server-to-server webhook ─────────────────────────────────
async function handleWebhook(req: any, res: any) {
  try {
    const body = req.body as Record<string, string>;
    const settings = await storage.getStoreSettings().catch(() => null);
    const provider = settings ? getProvider(settings as any) : null;

    let token: string | undefined;
    let isSuccess = false;
    let transactionId: string | undefined;

    if (provider) {
      const parsed = provider.parseWebhook(body);
      token = parsed.token;
      isSuccess = parsed.isSuccess;
      transactionId = parsed.transactionId;
    } else {
      token = body.Order || body.token;
      isSuccess = body.CCode === "0" || body.Status === "000" || body.Status === "0";
      transactionId = body.Id || body.TransactionId;
    }

    if (!token) return res.status(400).send("Missing token");

    const pending = await storage.getPendingPaymentByToken(token);
    if (!pending) return res.status(404).send("Not found");

    if (pending.status === "completed") {
      return res.send("OK"); // idempotent
    }

    if (isSuccess) {
      await finalizeOrder(pending, transactionId);
      await storage.updatePendingPaymentStatus(token, "completed", transactionId);
    } else {
      await storage.updatePendingPaymentStatus(token, "failed", transactionId);
    }

    return res.send("OK");
  } catch (error) {
    console.error("Payment webhook error:", error);
    return res.status(500).send("Error");
  }
}

// ─── Universal routes (new architecture) ────────────────────────────────────
// POST /api/payment/initiate — create pending payment, get redirect URL
router.post("/payment/initiate", initiatePayment);

// GET  /api/payment/callback — browser redirect from gateway after payment
router.get("/payment/callback", handleCallback);

// POST /api/payment/webhook — server-to-server notification from gateway
router.post("/payment/webhook", handleWebhook);

// ─── Legacy HYP-specific routes (aliases for backward compat) ────────────────
// These are kept so any already-in-flight payment sessions continue to work.
// The HYP-specific initiate route still validates HYP credentials explicitly.
router.post("/payment/hyp/initiate", async (req: any, res) => {
  try {
    const settings = await storage.getStoreSettings();
    if (!settings) {
      return res.status(400).json({ message: "Store settings not found" });
    }

    const provider = getProvider(settings as any);
    if (!provider || provider.name !== 'hyp') {
      return res.status(400).json({ message: "HYP payment provider not configured" });
    }

    // Delegate to the universal handler (reuse req/res)
    return initiatePayment(req, res);
  } catch (error) {
    console.error("HYP initiate error:", error);
    return res.status(500).json({ message: "Failed to initiate payment" });
  }
});

router.get("/payment/hyp/callback", handleCallback);
router.post("/payment/hyp/webhook", handleWebhook);

// ─── GET /api/payment/pending/:token ─────────────────────────────────────────
router.get("/payment/pending/:token", async (req: any, res) => {
  const { token } = req.params;
  const pending = await storage.getPendingPaymentByToken(token);
  if (!pending) return res.status(404).json({ message: "Not found" });
  return res.json({ status: pending.status });
});

// ─── Cleanup expired pending payments (called on startup) ─────────────────────
export async function cleanupExpiredPendingPayments() {
  try {
    await storage.deleteExpiredPendingPayments();
  } catch (e) {
    console.error("Failed to clean up expired pending payments:", e);
  }
}

export default router;
