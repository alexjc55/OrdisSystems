import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../middleware/auth-guard";
import { z } from "zod";

const router = Router();

// POST /api/loyalty/active — session and cart-aware loyalty context.
// Accepts current cart state, returns applicable discounts for this specific user+cart combination.
// This is the authoritative "what discounts apply right now" endpoint.
router.post('/loyalty/active', async (req: any, res) => {
  try {
    const schema = z.object({
      cartTotal: z.number().min(0),
      cartItems: z.array(z.object({
        productId: z.number().int().positive(),
        quantity: z.number().positive(),
        totalPrice: z.string(),
      })).optional().default([]),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const { cartTotal, cartItems } = parsed.data;
    const settings = await storage.getStoreSettings();

    // --- Per-user loyalty discount applicability (customer role only) ---
    const userId = req.user?.id || null;
    const userRole = (req.user as any)?.role || null;
    const isRegistered = !!userId && userRole === 'customer';
    const loyaltyDiscountEnabled = !!(settings?.loyaltyDiscountEnabled && isRegistered);
    const loyaltyDiscountPercent = loyaltyDiscountEnabled
      ? parseFloat(settings?.loyaltyDiscountPercent || '0')
      : 0;

    // --- Volume discount: server-computed for this cart ---
    let volumeDiscountAmount = 0;
    const volumeItemBreakdown: Record<number, number> = {};
    if (cartItems.length > 0) {
      const uniqueProductIds = [...new Set(cartItems.map(i => i.productId))];
      const tiersPerProduct = await Promise.all(
        uniqueProductIds.map(async (pid) => ({
          productId: pid,
          tiers: (await storage.getProductVolumeDiscounts(pid)).filter(t => t.isActive),
        }))
      );
      const tiersMap = new Map(tiersPerProduct.map(({ productId, tiers }) => [productId, tiers]));

      for (const item of cartItems) {
        const tiers = tiersMap.get(item.productId) || [];
        const eligible = tiers.filter(t => parseFloat(t.minQuantity) <= item.quantity);
        if (eligible.length === 0) continue;
        const best = eligible.reduce((a, b) => parseFloat(a.minQuantity) >= parseFloat(b.minQuantity) ? a : b);
        const itemTotal = parseFloat(item.totalPrice || '0');
        let itemDiscount = 0;
        if (best.discountType === 'percentage') {
          itemDiscount = Math.round(itemTotal * parseFloat(best.discountValue) / 100 * 100) / 100;
        } else {
          itemDiscount = Math.min(parseFloat(best.discountValue), itemTotal);
        }
        if (itemDiscount > 0) {
          volumeDiscountAmount += itemDiscount;
          volumeItemBreakdown[item.productId] = (volumeItemBreakdown[item.productId] || 0) + itemDiscount;
        }
      }
      volumeDiscountAmount = Math.round(volumeDiscountAmount * 100) / 100;
    }

    const cartTotalAfterVolume = Math.max(0, cartTotal - volumeDiscountAmount);

    // --- Loyalty discount amount for this cart ---
    const loyaltyDiscountAmount = loyaltyDiscountEnabled && loyaltyDiscountPercent > 0
      ? Math.round(cartTotalAfterVolume * loyaltyDiscountPercent / 100 * 100) / 100
      : 0;

    // --- Gift threshold ---
    const giftEnabled = !!(settings?.giftEnabled);
    const giftMinOrderAmount = parseFloat(settings?.giftMinOrderAmount || '300');
    const giftThresholdReached = giftEnabled && cartTotal >= giftMinOrderAmount;
    let giftProduct = null;
    if (giftEnabled && settings?.giftProductId) {
      giftProduct = await storage.getProductById(settings.giftProductId);
    }

    res.json({
      isRegistered,
      loyaltyDiscountEnabled,
      loyaltyDiscountPercent,
      loyaltyDiscountAmount,
      loyaltyDiscountApplicable: loyaltyDiscountEnabled && loyaltyDiscountPercent > 0,
      volumeDiscountAmount,
      volumeItemBreakdown,
      giftEnabled,
      giftThresholdReached,
      giftMinOrderAmount,
      giftProduct: giftProduct || null,
    });
  } catch (error) {
    console.error("Error computing loyalty active state:", error);
    res.status(500).json({ message: "Failed to compute loyalty state" });
  }
});

// GET /api/loyalty/context - public endpoint to get loyalty settings + gift product
router.get('/loyalty/context', async (req, res) => {
  try {
    const settings = await storage.getStoreSettings();
    if (!settings) {
      return res.json({
        loyaltyDiscountEnabled: false,
        loyaltyDiscountPercent: 0,
        giftEnabled: false,
        giftProduct: null,
        giftMinOrderAmount: 300,
      });
    }

    let giftProduct = null;
    if (settings.giftEnabled && settings.giftProductId) {
      giftProduct = await storage.getProductById(settings.giftProductId);
    }

    res.json({
      loyaltyDiscountEnabled: settings.loyaltyDiscountEnabled || false,
      loyaltyDiscountPercent: parseFloat(settings.loyaltyDiscountPercent || "0"),
      giftEnabled: settings.giftEnabled || false,
      giftProduct: giftProduct || null,
      giftMinOrderAmount: parseFloat(settings.giftMinOrderAmount || "300"),
    });
  } catch (error) {
    console.error("Error fetching loyalty context:", error);
    res.status(500).json({ message: "Failed to fetch loyalty context" });
  }
});

// POST /api/coupons/validate — validate a coupon code for a given order total.
// When the user is authenticated, per-customer usage is also checked.
router.post('/coupons/validate', async (req: any, res) => {
  try {
    const schema = z.object({
      code: z.string().min(1),
      orderTotal: z.number().positive(),
      cartItems: z.array(z.object({
        productId: z.number().int(),
        quantity: z.number(),
        totalPrice: z.string(),
      })).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ valid: false, message: "Invalid request" });
    }

    const { code, orderTotal, cartItems } = parsed.data;
    const userId = req.user?.id || null;
    const userEmail = (req.user as any)?.email || null;
    const result = await storage.validateCoupon(code, orderTotal, userId, userEmail, cartItems);
    // Reject product-scoped coupons that match no items in the cart
    if (result.valid && result.discountAmount === 0 && result.coupon?.scope === 'product') {
      return res.json({ valid: false, message: "coupon_not_eligible_for_cart" });
    }
    res.json(result);
  } catch (error) {
    console.error("Error validating coupon:", error);
    res.status(500).json({ valid: false, message: "Failed to validate coupon" });
  }
});

// POST /api/coupons/apply — validate a coupon with full auth context and explicit apply semantics.
// Same as validate but requires authentication for per-customer usage enforcement.
// Returns a structured result the client uses to apply the coupon or show an error.
router.post('/coupons/apply', async (req: any, res) => {
  try {
    const schema = z.object({
      code: z.string().min(1),
      orderTotal: z.number().positive(),
      cartItems: z.array(z.object({
        productId: z.number().int(),
        quantity: z.number(),
        totalPrice: z.string(),
      })).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ valid: false, message: "Invalid request" });
    }

    const { code, orderTotal, cartItems } = parsed.data;
    const userId = req.user?.id || null;
    const userEmail = (req.user as any)?.email || null;
    const result = await storage.validateCoupon(code, orderTotal, userId, userEmail, cartItems);

    if (!result.valid) {
      return res.status(422).json(result);
    }
    // Reject product-scoped coupons that match no items in the cart
    if (result.discountAmount === 0 && result.coupon?.scope === 'product') {
      return res.status(422).json({ valid: false, message: "coupon_not_eligible_for_cart" });
    }
    res.json(result);
  } catch (error) {
    console.error("Error applying coupon:", error);
    res.status(500).json({ valid: false, message: "Failed to apply coupon" });
  }
});

export default router;
