import { Router } from "express";
import { storage } from "../storage";
import { randomBytes, createHmac } from "crypto";
import { type InsertOrder, type InsertOrderItem } from "@shared/schema";
import { randomBytes as rb } from "crypto";
import { sendNewOrderEmail, sendGuestOrderEmail } from "../email-service";
import { BRANCHES_ENABLED } from "../config";

const router = Router();

// ─── HYP URL builder ─────────────────────────────────────────────────────────

const HYP_GATEWAY = "https://pay.hyp.co.il/p3/";

interface HypParams {
  Masof: string;
  PassP: string;
  signature: string; // HMAC secret, used only for signing — not sent as-is
  Amount: number; // in agorot (ILS cents)
  Order: string;
  Info: string;
  Fild1?: string; // customer name
  Fild2?: string; // customer email
  Fild3?: string; // customer phone
  SuccessUrl: string;
  ErrorUrl: string;
  NotifyUrl: string;
  testMode?: boolean;
}

function buildHypUrl(params: HypParams): string {
  const { signature, testMode, ...rest } = params;

  const payload: Record<string, string> = {
    action: "pay",
    Masof: rest.Masof,
    PassP: rest.PassP,
    Amount: String(rest.Amount),
    Coin: "376", // ILS
    Order: rest.Order,
    Info: rest.Info,
    Fild1: rest.Fild1 || "",
    Fild2: rest.Fild2 || "",
    Fild3: rest.Fild3 || "",
    SuccessUrl: rest.SuccessUrl,
    ErrorUrl: rest.ErrorUrl,
    NotifyUrl: rest.NotifyUrl,
    PageLang: "HEB",
    J5: "False",
    sendemail: "False",
  };

  if (testMode) {
    payload.What = "Sale";
    payload.MoreData = "True";
  }

  // HMAC-SHA256 signature: sorted key=value pairs joined by &, signed with the HYP signature key
  const sortedKeys = Object.keys(payload).sort();
  const signatureBase = sortedKeys.map(k => `${k}=${payload[k]}`).join("&");
  const hmac = createHmac("sha256", signature).update(signatureBase).digest("hex");
  payload.signature = hmac;

  const qs = new URLSearchParams(payload).toString();
  return `${HYP_GATEWAY}?${qs}`;
}

// ─── POST /api/payment/hyp/initiate ─────────────────────────────────────────
// Creates a pending payment record and returns the HYP redirect URL.
// Cart is NOT cleared — it stays intact until confirmed via webhook.
router.post("/payment/hyp/initiate", async (req: any, res) => {
  try {
    const settings = await storage.getStoreSettings();
    if (!settings || settings.paymentProvider !== "hyp") {
      return res.status(400).json({ message: "HYP payment provider not configured" });
    }
    if (!settings.hypMasof || !settings.hypSignature || !settings.hypPassP) {
      return res.status(400).json({ message: "HYP credentials incomplete" });
    }

    const {
      items,
      totalAmount,
      orderData: clientOrderData,
      userId,
      language,
      branchId,
    } = req.body;

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

    const pending = await storage.createPendingPayment({
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

    const storeName = settings.storeName || "eDAHouse";

    const hypUrl = buildHypUrl({
      Masof: settings.hypMasof,
      PassP: settings.hypPassP,
      signature: settings.hypSignature,
      Amount: amountInAgorot,
      Order: token,
      Info: storeName,
      Fild1: customerName,
      Fild2: customerEmail,
      Fild3: customerPhone,
      SuccessUrl: `${baseUrl}/api/payment/hyp/callback?status=success&token=${token}`,
      ErrorUrl: `${baseUrl}/api/payment/hyp/callback?status=error&token=${token}`,
      NotifyUrl: `${baseUrl}/api/payment/hyp/webhook`,
      testMode: settings.hypTestMode ?? true,
    });

    return res.json({ redirectUrl: hypUrl, token });
  } catch (error) {
    console.error("HYP initiate error:", error);
    return res.status(500).json({ message: "Failed to initiate payment" });
  }
});

// ─── GET /api/payment/hyp/callback ───────────────────────────────────────────
// HYP redirects the browser here after the payment form.
// For success: finalise the order and redirect to /thanks.
// For error: redirect to /checkout?payment=failed.
router.get("/payment/hyp/callback", async (req: any, res) => {
  const { status, token, TransactionId } = req.query as Record<string, string>;

  if (!token) {
    return res.redirect("/?payment=error");
  }

  try {
    const pending = await storage.getPendingPaymentByToken(token);
    if (!pending || pending.status === "completed") {
      // Already processed or not found — just go to thanks
      return res.redirect(`/thanks?payment=${status === "success" ? "success" : "failed"}`);
    }

    if (status === "success") {
      // Finalize order
      const orderId = await finalizeOrder(pending, TransactionId);
      await storage.updatePendingPaymentStatus(token, "completed", TransactionId);
      return res.redirect(`/thanks?payment=success&orderId=${orderId}`);
    } else {
      await storage.updatePendingPaymentStatus(token, "failed");
      return res.redirect("/checkout?payment=failed");
    }
  } catch (error) {
    console.error("HYP callback error:", error);
    return res.redirect("/checkout?payment=failed");
  }
});

// ─── POST /api/payment/hyp/webhook ───────────────────────────────────────────
// Server-to-server notification from HYP.
router.post("/payment/hyp/webhook", async (req: any, res) => {
  try {
    const { Order: token, TransactionId, Status } = req.body;

    if (!token) return res.status(400).send("Missing token");

    const pending = await storage.getPendingPaymentByToken(token);
    if (!pending) return res.status(404).send("Not found");

    // Idempotent: if already completed ignore duplicate webhook
    if (pending.status === "completed") {
      return res.send("OK");
    }

    if (Status === "000" || Status === "0") {
      // Success
      if (pending.status !== "completed") {
        await finalizeOrder(pending, TransactionId);
        await storage.updatePendingPaymentStatus(token, "completed", TransactionId);
      }
    } else {
      await storage.updatePendingPaymentStatus(token, "failed", TransactionId);
    }

    return res.send("OK");
  } catch (error) {
    console.error("HYP webhook error:", error);
    return res.status(500).send("Error");
  }
});

// ─── GET /api/payment/pending/:token ─────────────────────────────────────────
// Client polls this to check payment status (optional, for loading screens).
router.get("/payment/pending/:token", async (req: any, res) => {
  const { token } = req.params;
  const pending = await storage.getPendingPaymentByToken(token);
  if (!pending) return res.status(404).json({ message: "Not found" });
  return res.json({ status: pending.status });
});

// ─── Helper: create real order from pending payment ───────────────────────────
async function finalizeOrder(
  pending: Awaited<ReturnType<typeof storage.getPendingPaymentByToken>>,
  hypTransactionId?: string
): Promise<number> {
  if (!pending) throw new Error("Pending payment not found");

  const orderData = pending.orderData as InsertOrder & {
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
    firstName?: string;
    lastName?: string;
  };

  // Generate guest tokens if this is a guest order
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

  // Send confirmation email (best-effort)
  try {
    const settings = await storage.getStoreSettings();
    if (isGuest) {
      await sendGuestOrderEmail(newOrder as any, settings as any);
    } else {
      await sendNewOrderEmail(newOrder as any, settings as any);
    }
  } catch (emailErr) {
    console.error("HYP order email error:", emailErr);
  }

  return newOrder.id;
}

// ─── Cleanup expired pending payments (called on startup) ─────────────────────
export async function cleanupExpiredPendingPayments() {
  try {
    await storage.deleteExpiredPendingPayments();
  } catch (e) {
    console.error("Failed to clean up expired pending payments:", e);
  }
}

export default router;
