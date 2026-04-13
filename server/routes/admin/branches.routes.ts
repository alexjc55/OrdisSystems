import { Router } from "express";
import { storage } from "../../storage";
import { insertBranchSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// GET /api/admin/branches
router.get("/admin/branches", requireAdmin, async (req, res) => {
  try {
    const allBranches = await storage.getBranches();
    res.json(allBranches);
  } catch (error) {
    console.error("Error fetching branches:", error);
    res.status(500).json({ message: "Failed to fetch branches" });
  }
});

// POST /api/admin/branches
router.post("/admin/branches", requireAdmin, async (req, res) => {
  try {
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
router.put("/admin/branches/:id", requireAdmin, async (req, res) => {
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

// DELETE /api/admin/branches/:id
router.delete("/admin/branches/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid branch id" });
    await storage.deleteBranch(id);
    res.json({ message: "Branch deleted" });
  } catch (error) {
    console.error("Error deleting branch:", error);
    res.status(500).json({ message: "Failed to delete branch" });
  }
});

// GET /api/admin/branches/:id/availability - Get product availability for a branch
router.get("/admin/branches/:id/availability", requireAdmin, async (req, res) => {
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

// GET /api/admin/products/:id/branch-availability - Get branch availability for a product
router.get("/admin/products/:id/branch-availability", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid product id" });
    const availability = await storage.getProductBranchAvailability(id);
    res.json(availability);
  } catch (error) {
    console.error("Error fetching product branch availability:", error);
    res.status(500).json({ message: "Failed to fetch product branch availability" });
  }
});

// PUT /api/admin/products/:id/branch-availability - Set branch availability for a product
router.put("/admin/products/:id/branch-availability", requireAdmin, async (req, res) => {
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

// GET /api/admin/users/:id/branches - Get branches assigned to a user
router.get("/admin/users/:id/branches", requireAdmin, async (req, res) => {
  try {
    const branchIds = await storage.getUserBranches(req.params.id);
    res.json(branchIds);
  } catch (error) {
    console.error("Error fetching user branches:", error);
    res.status(500).json({ message: "Failed to fetch user branches" });
  }
});

// PUT /api/admin/users/:id/branches - Set branches assigned to a user
router.put("/admin/users/:id/branches", requireAdmin, async (req, res) => {
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
