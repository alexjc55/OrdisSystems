import { Router } from "express";
import { storage } from "../storage";
import { randomBytes as rb } from "crypto";
import { type InsertOrder, type InsertOrderItem } from "@shared/schema";
import { sendNewOrderEmail, sendGuestOrderEmail } from "../email-service";
import { BRANCHES_ENABLED } from "../config";

const router = Router();

// ─── HYP new /pay API: APISign flow ──────────────────────────────────────────
// Step 1: server calls HYP APISign endpoint → HYP returns signed params
// Step 2: redirect user to https://pay.hyp.co.il/p/?{signed-params}

const HYP_BASE = "https://pay.hyp.co.il/p/";

interface HypInitParams {
  KEY: string;
  PassP: string;
  Masof: string;
  Amount: number; // in agorot (ILS × 100)
  Order: string;  // our unique token — returned unchanged in callback
  Fild1?: string; // customer name
  Fild2?: string; // customer email
  Fild3?: string; // customer phone
  SuccessUrl: string;
  ErrorUrl: string;
  NotifyUrl?: string;
  PageLang?: string;
}

async function buildHypPaymentUrl(params: HypInitParams): Promise<string> {
  const apiSignParams = new URLSearchParams({
    action: "APISign",
    What: "SIGN",
    Sign: "True",
    KEY: params.KEY,
    PassP: params.PassP,
    Masof: params.Masof,
    Amount: String(params.Amount),
    Coin: "1",        // ILS (1 in new /pay API)
    Order: params.Order,
    Fild1: params.Fild1 || "",
    Fild2: params.Fild2 || "",
    Fild3: params.Fild3 || "",
    SuccessUrl: params.SuccessUrl,
    ErrorUrl: params.ErrorUrl,
    PageLang: params.PageLang || "HEB",
    J5: "False",
    sendemail: "False",
  });

  if (params.NotifyUrl) {
    apiSignParams.set("NotifyUrl", params.NotifyUrl);
  }

  const apiSignUrl = `${HYP_BASE}?${apiSignParams.toString()}`;

  const response = await fetch(apiSignUrl, { method: "GET" });
  if (!response.ok) {
    throw new Error(`HYP APISign request failed: HTTP ${response.status}`);
  }

  const signedParams = await response.text();
  if (!signedParams || signedParams.includes("Error") || signedParams.includes("error")) {
    throw new Error(`HYP APISign returned error: ${signedParams}`);
  }

  // The entire response is the query string for the payment page redirect
  return `${HYP_BASE}?${signedParams}`;
}

// ─── POST /api/payment/hyp/initiate ─────────────────────────────────────────
// Creates a pending payment record, calls HYP APISign, returns redirect URL.
router.post("/payment/hyp/initiate", async (req: any, res) => {
  try {
    const settings = await storage.getStoreSettings();
    if (!settings || settings.paymentProvider !== "hyp") {
      return res.status(400).json({ message: "HYP payment provider not configured" });
    }
    if (!settings.hypMasof || !settings.hypPassP || !settings.hypKey) {
      return res.status(400).json({ message: "HYP credentials incomplete (Masof, PassP and API Key required)" });
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

    // Token is passed as Order — returned unchanged in callback as req.query.Order
    const redirectUrl = await buildHypPaymentUrl({
      KEY: settings.hypKey,
      PassP: settings.hypPassP,
      Masof: settings.hypMasof,
      Amount: amountInAgorot,
      Order: token,
      Fild1: customerName,
      Fild2: customerEmail,
      Fild3: customerPhone,
      SuccessUrl: `${baseUrl}/api/payment/hyp/callback`,
      ErrorUrl: `${baseUrl}/api/payment/hyp/callback?status=error`,
      NotifyUrl: `${baseUrl}/api/payment/hyp/webhook`,
      PageLang: language === "he" || language === "ar" ? "HEB" : "ENG",
    });

    return res.json({ redirectUrl, token });
  } catch (error) {
    console.error("HYP initiate error:", error);
    return res.status(500).json({ message: "Failed to initiate payment" });
  }
});

// ─── GET /api/payment/hyp/callback ───────────────────────────────────────────
// HYP redirects browser here after payment.
// New /pay API callback params: Order (our token), CCode (0=success), Id (transaction ID),
// Amount, ACode, Fild1/2/3, Sign.
// Also handles legacy: token in query param, status=error in query param.
router.get("/payment/hyp/callback", async (req: any, res) => {
  const q = req.query as Record<string, string>;

  // Extract token: new API puts it in Order, legacy puts it in ?token=
  const token = q.Order || q.token;

  // Determine success: new API CCode=0, legacy status=success
  const isSuccess = q.CCode === "0" || (q.status === "success" && !q.CCode);

  // Transaction ID: new API uses Id, legacy uses TransactionId
  const transactionId = q.Id || q.TransactionId;

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
    console.error("HYP callback error:", error);
    return res.redirect("/checkout?payment=failed");
  }
});

// ─── POST /api/payment/hyp/webhook ───────────────────────────────────────────
// Server-to-server notification from HYP (must be enabled via HYP support).
// New /pay API params: Order (token), CCode (0=success), Id (transaction ID).
// Webhook activation: call HYP support *6488 ext. 3 or WhatsApp wa.me/972732345000.
router.post("/payment/hyp/webhook", async (req: any, res) => {
  try {
    const body = req.body as Record<string, string>;
    const token = body.Order || body.token;
    const transactionId = body.Id || body.TransactionId;
    const isSuccess = body.CCode === "0" || body.Status === "000" || body.Status === "0";

    if (!token) return res.status(400).send("Missing Order token");

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
    console.error("HYP webhook error:", error);
    return res.status(500).send("Error");
  }
});

// ─── GET /api/payment/pending/:token ─────────────────────────────────────────
// Client polls this to check payment status (iOS PWA recovery mechanism).
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
