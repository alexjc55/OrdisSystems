import { Router } from "express";
import { storage } from "../../storage";
import { isAuthenticated } from "../../middleware/auth-guard";
import { clearCachePattern, getCache, setCache } from "../../middleware/cache";
import { sendFacebookPurchaseEvent, type FacebookOrderData } from "../../facebook-conversions-api";
import bcrypt from "bcryptjs";

const router = Router();

router.get('/admin/users', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;

    if (!user || (user.role !== "admin" && user.role !== "worker")) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const status = req.query.status as string || 'all';
    const sortField = req.query.sortField as string || 'createdAt';
    const sortDirection = req.query.sortDirection as string || 'desc';

    const cacheKey = `admin-users-${page}-${limit}-${search}-${status}-${sortField}-${sortDirection}`;

    let result: any = getCache(cacheKey);
    if (!result) {
      result = await storage.getUsersPaginated({ page, limit, search, status, sortField, sortDirection });
      setCache(cacheKey, result, 180);
    }

    res.json(result);
  } catch (error) {
    console.error("Error fetching admin users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.post('/admin/users', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;

    if (!user || (user.role !== "admin" && user.role !== "worker")) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const userData = req.body;
    const newUser = await storage.createUser(userData);

    clearCachePattern('admin-users');

    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Failed to create user" });
  }
});

router.put('/admin/users/:id', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;

    if (!user || (user.role !== "admin" && user.role !== "worker")) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { id } = req.params;
    const updates = req.body;
    const updatedUser = await storage.updateUser(id, updates);
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
});

router.patch('/admin/users/:id/role', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;

    if (!user || (user.role !== "admin" && user.role !== "worker")) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'worker', 'customer'].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const updatedUser = await storage.updateUserRole(id, role);
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ message: "Failed to update user role" });
  }
});

router.get('/admin/users/:id/deletion-impact', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;

    if (!user || (user.role !== "admin" && user.role !== "worker")) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { id } = req.params;
    const impact = await storage.checkUserDeletionImpact(id);
    res.json(impact);
  } catch (error) {
    console.error("Error checking user deletion impact:", error);
    res.status(500).json({ message: "Failed to check deletion impact" });
  }
});

router.delete('/admin/users/:id', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;

    if (!user || (user.role !== "admin" && user.role !== "worker")) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { id } = req.params;
    const { forceDelete } = req.query;

    console.log('DELETE /api/admin/users/:id called with:', { id, forceDelete, currentUser: user.id });

    if (id === user.id) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    await storage.deleteUser(id, forceDelete === 'true');
    console.log('User deleted successfully:', id);

    clearCachePattern('admin-users');

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

export default router;
