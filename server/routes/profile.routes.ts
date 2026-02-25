import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../middleware/auth-guard";

const router = Router();

router.patch('/profile', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;
    const user = await storage.updateUserProfile(userId, updates);
    res.json(user);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

router.get('/addresses', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const addresses = await storage.getUserAddresses(userId);
    res.json(addresses);
  } catch (error) {
    console.error("Error fetching addresses:", error);
    res.status(500).json({ message: "Failed to fetch addresses" });
  }
});

router.post('/addresses', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const addressData = { ...req.body, userId };
    const address = await storage.createUserAddress(addressData);
    res.json(address);
  } catch (error) {
    console.error("Error creating address:", error);
    res.status(500).json({ message: "Failed to create address" });
  }
});

router.patch('/addresses/:id', isAuthenticated, async (req: any, res) => {
  try {
    const addressId = parseInt(req.params.id);
    const updates = req.body;
    const address = await storage.updateUserAddress(addressId, updates);
    res.json(address);
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({ message: "Failed to update address" });
  }
});

router.delete('/addresses/:id', isAuthenticated, async (req: any, res) => {
  try {
    const addressId = parseInt(req.params.id);
    await storage.deleteUserAddress(addressId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({ message: "Failed to delete address" });
  }
});

router.post('/addresses/:id/set-default', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const addressId = parseInt(req.params.id);
    await storage.setDefaultAddress(userId, addressId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error setting default address:", error);
    res.status(500).json({ message: "Failed to set default address" });
  }
});

export default router;
