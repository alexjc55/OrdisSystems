import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../middleware/auth-guard";
import { z } from "zod";

const router = Router();

// GET /api/loyalty/active — alias for /loyalty/context (both names supported)
router.get('/loyalty/active', async (req, res) => {
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
    console.error("Error fetching loyalty active state:", error);
    res.status(500).json({ message: "Failed to fetch loyalty context" });
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

// POST /api/coupons/validate - validate a coupon code for a given order total
router.post('/coupons/validate', async (req, res) => {
  try {
    const schema = z.object({
      code: z.string().min(1),
      orderTotal: z.number().positive(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ valid: false, message: "Invalid request" });
    }

    const { code, orderTotal } = parsed.data;
    const result = await storage.validateCoupon(code, orderTotal);
    res.json(result);
  } catch (error) {
    console.error("Error validating coupon:", error);
    res.status(500).json({ valid: false, message: "Failed to validate coupon" });
  }
});

export default router;
