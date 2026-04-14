import { Router } from "express";
import { storage } from "../../storage";
import { insertBranchSchema } from "@shared/schema";
import { BRANCHES_ENABLED, MAX_BRANCHES } from "../../config";
import { z } from "zod";

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

function requireAdminOrWorker(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || (req.user?.role !== "admin" && req.user?.role !== "worker")) {
    return res.status(403).json({ message: "Admin or worker access required" });
  }
  next();
}

function requireBranches(_req: any, res: any, next: any) {
  if (!BRANCHES_ENABLED) {
    return res.status(404).json({ message: "Branch feature is not enabled" });
  }
  next();
}

// GET /api/admin/branches
router.get("/admin/branches", requireBranches, requireAdminOrWorker, async (req: any, res) => {
  try {
    const allBranches = await storage.getBranches();
    // Workers only see branches they are assigned to
    if (req.user?.role === 'worker') {
      const assignedIds = await storage.getUserBranches(req.user.id);
      if (assignedIds.length > 0) {
        const filtered = (allBranches as any[]).filter((b: any) => assignedIds.includes(b.id));
        return res.json(filtered);
      }
      // Worker with no specific assignment → full access (existing behaviour)
    }
    res.json(allBranches);
  } catch (error) {
    console.error("Error fetching branches:", error);
    res.status(500).json({ message: "Failed to fetch branches" });
  }
});

// GET /api/admin/branches/limit-status
router.get("/admin/branches/limit-status", requireBranches, requireAdminOrWorker, async (_req, res) => {
  try {
    const allBranches = await storage.getBranches();
    const currentCount = allBranches.length;
    const maxBranches = isFinite(MAX_BRANCHES) ? MAX_BRANCHES : null;
    const isOverLimit = maxBranches !== null && currentCount > maxBranches;
    res.json({
      maxBranches,
      currentCount,
      isOverLimit,
      overLimitCount: isOverLimit ? currentCount - maxBranches! : 0,
      branches: allBranches,
    });
  } catch (error) {
    console.error("Error fetching branch limit status:", error);
    res.status(500).json({ message: "Failed to fetch branch limit status" });
  }
});

// POST /api/admin/branches
router.post("/admin/branches", requireBranches, requireAdmin, async (req, res) => {
  try {
    if (isFinite(MAX_BRANCHES)) {
      const allBranches = await storage.getBranches();
      if (allBranches.length >= MAX_BRANCHES) {
        return res.status(403).json({ message: `Branch limit reached. Maximum allowed: ${MAX_BRANCHES}` });
      }
    }
    const data = insertBranchSchema.parse(req.body);
    const branch = await storage.createBranch(data);
    res.status(201).json(branch);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error creating branch:", error);
    res.status(500).json({ message: "Failed to create branch" });
  }
});

// PUT /api/admin/branches/:id
router.put("/admin/branches/:id", requireBranches, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid branch id" });
    const data = insertBranchSchema.partial().parse(req.body);
    const branch = await storage.updateBranch(id, data);
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    res.json(branch);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error updating branch:", error);
    res.status(500).json({ message: "Failed to update branch" });
  }
});

// GET /api/admin/branches/:id/order-count
router.get("/admin/branches/:id/order-count", requireBranches, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid branch id" });
    const count = await storage.getOrderCountByBranch(id);
    res.json({ count });
  } catch (error) {
    console.error("Error fetching branch order count:", error);
    res.status(500).json({ message: "Failed to fetch order count" });
  }
});

// DELETE /api/admin/branches/:id
router.delete("/admin/branches/:id", requireBranches, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid branch id" });
    const transferTo = req.body?.transferTo ? parseInt(req.body.transferTo) : null;
    await storage.deleteBranch(id, transferTo || undefined);
    res.json({ message: "Branch deleted" });
  } catch (error) {
    console.error("Error deleting branch:", error);
    res.status(500).json({ message: "Failed to delete branch" });
  }
});

// GET /api/admin/branches/:id/availability
router.get("/admin/branches/:id/availability", requireBranches, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid branch id" });
    const availability = await storage.getProductBranchAvailabilityByBranch(id);
    res.json(availability);
  } catch (error) {
    console.error("Error fetching branch availability:", error);
    res.status(500).json({ message: "Failed to fetch branch availability" });
  }
});

// GET /api/admin/products/:id/branch-availability
router.get("/admin/products/:id/branch-availability", requireBranches, requireAdminOrWorker, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid product id" });
    const availability = await storage.getProductBranchAvailability(id);
    // Workers only see availability records for their assigned branches
    if (req.user?.role === 'worker') {
      const assignedIds = await storage.getUserBranches(req.user.id);
      if (assignedIds.length > 0) {
        return res.json((availability as any[]).filter((a: any) => assignedIds.includes(a.branchId)));
      }
      // Worker with no specific assignment → full access
    }
    res.json(availability);
  } catch (error) {
    console.error("Error fetching product branch availability:", error);
    res.status(500).json({ message: "Failed to fetch product branch availability" });
  }
});

// PUT /api/admin/products/:id/branch-availability
router.put("/admin/products/:id/branch-availability", requireBranches, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid product id" });
    const schema = z.array(z.object({
      branchId: z.number().int(),
      isAvailable: z.boolean().default(true),
      stockStatus: z.enum(["in_stock", "low_stock", "out_of_stock"]).default("in_stock"),
      availabilityStatus: z.enum(["available", "out_of_stock_today", "completely_unavailable"]).default("available"),
    }));
    const entries = schema.parse(req.body);
    await storage.setProductBranchAvailability(id, entries);
    res.json({ message: "Branch availability updated" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error setting product branch availability:", error);
    res.status(500).json({ message: "Failed to set product branch availability" });
  }
});

// GET /api/admin/users/:id/branches
router.get("/admin/users/:id/branches", requireBranches, requireAdmin, async (req, res) => {
  try {
    const branchIds = await storage.getUserBranches(req.params.id);
    res.json(branchIds);
  } catch (error) {
    console.error("Error fetching user branches:", error);
    res.status(500).json({ message: "Failed to fetch user branches" });
  }
});

// PUT /api/admin/users/:id/branches
router.put("/admin/users/:id/branches", requireBranches, requireAdmin, async (req, res) => {
  try {
    const schema = z.object({ branchIds: z.array(z.number().int()) });
    const { branchIds } = schema.parse(req.body);
    await storage.setUserBranches(req.params.id, branchIds);
    res.json({ message: "User branches updated" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error setting user branches:", error);
    res.status(500).json({ message: "Failed to set user branches" });
  }
});

export default router;
