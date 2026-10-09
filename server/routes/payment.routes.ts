import { Router } from "express";
import { storage } from "../storage";
import { randomBytes as rb } from "crypto";
import { BRANCHES_ENABLED } from "../config";
import { getProvider, type PaymentProviderConfig } from "../lib/payment-providers/index";
import { isPaymentProviderEnabled } from "../lib/payment-providers/availability";
import { checkoutVerification, merchantFingerprint, PaymentVerificationError } from "../lib/payment-providers/verification";
import { passwordResetOrigin } from "../password-reset-email";
import { CheckoutQuoteError, quotePaymentCheckout } from "../payment-quote";

const router = Router();

// ─── Helper: create real order from pending payment ───────────────────────────
async function finalizeOrder(
  token: string,
  transactionId?: string
) {
  return storage.finalizePendingPayment(token, transactionId);
}

// ─── Helper: build pending payment + call provider initiate ──────────────────
async function initiatePayment(req: any, res: any) {
  try {
    const settings = await storage.getStoreSettings();
    if (!settings) {
      return res.status(400).json({ message: "Store settings not found" });
    }

    const active = (settings.paymentProviderConfig as PaymentProviderConfig | null)?.active;
    if (active && active !== "none" && !isPaymentProviderEnabled(active)) {
      return res.status(503).json({
        code: "payment_provider_disabled",
        message: "Online payment provider disabled by server configuration",
      });
    }
    const provider = getProvider(settings as any);
    if (!provider) {
      return res.status(400).json({ message: "No online payment provider configured" });
    }

    const quote = await quotePaymentCheckout(
      req.body, req.isAuthenticated?.() && req.user?.id ? req.user.id : null,
      BRANCHES_ENABLED, storage,
    );
    const { orderData: orderSnapshot, orderItems, amountInAgorot, userId } = quote;
    const language = orderSnapshot.orderLanguage || "ru";
    // Notify URLs carry a private authentication capability. Never derive their
    // destination (or customer returns) from Host/Origin/forwarded headers.
    let baseUrl: string;
    try {
      baseUrl = passwordResetOrigin();
    } catch {
      return res.status(400).json({ message: "A trusted HTTPS store origin is required for payments" });
    }
    const verification = checkoutVerification(settings.paymentProviderConfig as PaymentProviderConfig, provider.name, amountInAgorot);

    const token = rb(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 3);

    await storage.createPendingPayment({
      token,
      orderData: orderSnapshot as any,
      orderItems: orderItems as any,
      userId: userId || null,
      status: "pending",
      expiresAt,
      verification,
      providerApprovalRequired: provider.name === "grow" &&
        (settings as any).paymentProviderConfig?.grow?.j5Enabled !== true,
    });

    const result = await provider.initiate({
      token,
      amountInAgorot,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      customerPhone: quote.customerPhone,
      successUrl: `${baseUrl}/api/payment/callback`,
      errorUrl: `${baseUrl}/api/payment/callback?status=error`,
      notifyUrl: `${baseUrl}/api/payment/webhook?proof=${verification.notifySecret}`,
      language,
    });
    await storage.setPendingPaymentVerification(token, {
      ...verification, processId: result.processId, processToken: result.processToken, saleId: result.saleId,
    });

    return res.json({ redirectUrl: result.redirectUrl, token });
  } catch (error) {
    if (error instanceof CheckoutQuoteError) {
      return res.status(error.status).json({ message: error.message, code: error.code });
    }
    if (error && typeof error === "object" && "isCouponError" in error) {
      return res.status(422).json({ message: "coupon_invalid", couponError: (error as any).couponError });
    }
    console.error("Payment initiate error:", error);
    const msg = error instanceof Error ? error.message : "Failed to initiate payment";
    return res.status(400).json({ message: msg });
  }
}

function paymentProvider(settings: any, pending: Awaited<ReturnType<typeof storage.getPendingPaymentByToken>>, legacyHyp: boolean) {
  const config = settings?.paymentProviderConfig as PaymentProviderConfig | undefined;
  if (!config || !pending) throw new PaymentVerificationError();
  const name = pending.verification?.provider || (legacyHyp ? "hyp" : config.active);
  const provider = getProvider({ paymentProviderConfig: { ...config, active: name } });
  if (!provider || (pending.verification &&
      pending.verification.merchant !== merchantFingerprint(config, name))) throw new PaymentVerificationError();
  return provider;
}

// ─── Helper: handle callback (browser redirect from gateway) ─────────────────
async function handleCallback(req: any, res: any) {
  const q = req.query as Record<string, string>;
  const settings = await storage.getStoreSettings().catch(() => null);
  const token = q.Order || q.token || q.order_id || q.add_field_1 || q.transaction_id;

  if (!token) {
    return res.redirect("/?payment=error");
  }

  try {
    const pending = await storage.getPendingPaymentByToken(token);
    if (!pending) {
      return res.redirect("/checkout?payment=failed");
    }
    const verifier = paymentProvider(settings, pending, req.path.includes("/hyp/"));
    const { isSuccess } = verifier.parseCallback(q);
    if (pending.status === "completed" && !isSuccess) {
      return res.redirect(`/thanks?payment=success${pending.orderId ? `&orderId=${pending.orderId}` : ""}`);
    }

    if (isSuccess) {
      // A browser redirect is not evidence. PayMe's authenticated notification
      // completes the order; a return before it arrives leaves checkout pending.
      if (verifier.name === "payme" || (verifier.name === "grow" &&
          !pending.verification?.processId && !q.transactionToken)) {
        if (pending.status === "completed") return res.redirect(`/thanks?payment=success${pending.orderId ? `&orderId=${pending.orderId}` : ""}`);
        return res.redirect("/checkout?payment=pending");
      }
      const verifiedTransaction = await verifier.verifyPayment({ pending, payload: q, source: "callback" });
      const { orderId } = await finalizeOrder(token, verifiedTransaction);
      return res.redirect(`/thanks?payment=success${orderId ? `&orderId=${orderId}` : ""}`);
    } else {
      // An unauthenticated failure redirect must not poison a payable checkout.
      return res.redirect("/checkout?payment=failed");
    }
  } catch (error) {
    console.error("Payment callback verification/finalization failed");
    return res.redirect("/checkout?payment=pending");
  }
}

// ─── Helper: handle server-to-server webhook ─────────────────────────────────
async function handleWebhook(req: any, res: any) {
  try {
    const body = req.body as Record<string, string>;
    const settings = await storage.getStoreSettings().catch(() => null);
    const data = (body as any)?.data || body;
    const token = data?.Order || data?.token || data?.order_id || data?.add_field_1 ||
      data?.transaction_id || data?.paymentDesc || data?.customFields?.cField1 || req.query?.token;

    if (typeof token !== "string" || !token) return res.status(400).send("Missing token");

    const pending = await storage.getPendingPaymentByToken(token);
    if (!pending) return res.status(404).send("Not found");
    const verifier = paymentProvider(settings, pending, req.path.includes("/hyp/"));
    const { isSuccess } = verifier.parseWebhook(body);

    if (isSuccess) {
      const transactionId = await verifier.verifyPayment({
        pending, payload: body, source: "webhook", notifySecret: req.query?.proof,
      });
      await finalizeOrder(token, transactionId);
      // Grow requires approveTransaction — but only for non-J5 payments.
      // For J5, the actual charge is deferred and triggered when order status → "ready".
      const isGrowJ5 = pending.verification?.j5 ??
        (verifier.name === 'grow' && (settings as any)?.paymentProviderConfig?.grow?.j5Enabled === true);
      if (verifier.name === "grow" && verifier.approveTransaction && !isGrowJ5) {
        await storage.approvePendingPayment(
          token,
          transactionId,
          id => verifier.approveTransaction!(id),
          !isGrowJ5,
        );
      }
    } else {
      // Ignore unverified failures. Gateways allow retries on the same page.
    }

    return res.send("OK");
  } catch (error) {
    console.error("Payment webhook verification/finalization failed");
    return res.status(error instanceof PaymentVerificationError ? 400 : 500).send("Payment not verified");
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
    if (!isPaymentProviderEnabled("hyp")) {
      return res.status(503).json({
        code: "payment_provider_disabled",
        message: "Online payment provider disabled by server configuration",
      });
    }
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
    const msg = error instanceof Error ? error.message : "Failed to initiate payment";
    return res.status(400).json({ message: msg });
  }
});

router.get("/payment/hyp/callback", handleCallback);
router.post("/payment/hyp/webhook", handleWebhook);

// ─── GET /api/payment/pending/:token ─────────────────────────────────────────
router.get("/payment/pending/:token", async (req: any, res) => {
  try {
    const pending = await storage.getPendingPaymentByToken(req.params.token);
    if (!pending) return res.status(404).json({ message: "Not found" });
    return res.json({ status: pending.status });
  } catch {
    console.error("Payment status temporarily unavailable");
    return res.status(503).json({ message: "Payment status unavailable" });
  }
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
