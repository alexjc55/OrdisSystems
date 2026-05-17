import { Router } from "express";
import { storage } from "../../storage";
import { isAuthenticated, requireAdmin } from "../../middleware/auth-guard";
const isAdmin = requireAdmin;
import { insertCouponSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// GET /api/admin/coupons
router.get('/admin/coupons', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const coupons = await storage.getCoupons();
    res.json(coupons);
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({ message: "Failed to fetch coupons" });
  }
});

// POST /api/admin/coupons
router.post('/admin/coupons', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const parsed = insertCouponSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: parsed.error.errors });
    }
    const coupon = await storage.createCoupon(parsed.data);
    res.status(201).json(coupon);
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(500).json({ message: "Failed to create coupon" });
  }
});

// PATCH /api/admin/coupons/:id
router.patch('/admin/coupons/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid coupon id" });

    const updateSchema = insertCouponSchema.partial();
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: parsed.error.errors });
    }
    const coupon = await storage.updateCoupon(id, parsed.data);
    res.json(coupon);
  } catch (error) {
    console.error("Error updating coupon:", error);
    res.status(500).json({ message: "Failed to update coupon" });
  }
});

// PUT /api/admin/coupons/:id
router.put('/admin/coupons/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid coupon id" });

    const updateSchema = insertCouponSchema.partial();
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: parsed.error.errors });
    }
    const coupon = await storage.updateCoupon(id, parsed.data);
    res.json(coupon);
  } catch (error) {
    console.error("Error updating coupon:", error);
    res.status(500).json({ message: "Failed to update coupon" });
  }
});

// DELETE /api/admin/coupons/:id
router.delete('/admin/coupons/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid coupon id" });
    await storage.deleteCoupon(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).json({ message: "Failed to delete coupon" });
  }
});

// GET /api/admin/coupons/:id/uses - get usage history for a coupon
router.get('/admin/coupons/:id/uses', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid coupon id" });
    const uses = await storage.getCouponUses(id);
    res.json(uses);
  } catch (error) {
    console.error("Error fetching coupon uses:", error);
    res.status(500).json({ message: "Failed to fetch coupon uses" });
  }
});

// GET /api/admin/products/:id/volume-discounts
router.get('/admin/products/:id/volume-discounts', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) return res.status(400).json({ message: "Invalid product id" });
    const discounts = await storage.getProductVolumeDiscounts(productId);
    res.json(discounts);
  } catch (error) {
    console.error("Error fetching volume discounts:", error);
    res.status(500).json({ message: "Failed to fetch volume discounts" });
  }
});

// POST /api/admin/products/:id/volume-discounts
router.post('/admin/products/:id/volume-discounts', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) return res.status(400).json({ message: "Invalid product id" });

    const discounts = req.body; // Array of volume discounts
    await storage.setProductVolumeDiscounts(productId, discounts);
    const updated = await storage.getProductVolumeDiscounts(productId);
    res.json(updated);
  } catch (error) {
    console.error("Error setting volume discounts:", error);
    res.status(500).json({ message: "Failed to set volume discounts" });
  }
});

export default router;
