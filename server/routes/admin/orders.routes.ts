import { Router } from "express";
import { storage } from "../../storage";
import { isAuthenticated } from "../../middleware/auth-guard";
import { PushNotificationService } from "../../push-notifications";
import { getDB } from "../../db";
import { sql } from "drizzle-orm";

const router = Router();

router.get('/admin/orders', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);

    if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || 'all';
    const sortField = (req.query.sortField as string) || 'createdAt';
    const sortDirection = (req.query.sortDirection as string) || 'desc';

    const result = await storage.getOrdersPaginated({ page, limit, search, status, sortField, sortDirection });
    res.json(result);
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

router.post('/admin/orders', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);

    if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { items, ...orderData } = req.body;
    const order = await storage.createOrder(orderData, items || []);
    res.status(201).json(order);
  } catch (error) {
    console.error("Error creating admin order:", error);
    res.status(500).json({ message: "Failed to create order" });
  }
});

router.patch('/orders/:id', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);

    if (!user || (user.role !== "admin" && user.role !== "worker" && user.email !== "alexjc55@gmail.com" && user.username !== "admin")) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const id = parseInt(req.params.id);
    const { items, totalAmount, ...orderData } = req.body;

    console.log("Order update request body:", JSON.stringify(req.body, null, 2));

    if (items) {
      await storage.updateOrderItems(id, items);
      await storage.updateOrder(id, {
        ...orderData,
        totalAmount: totalAmount || orderData.totalAmount
      });
      const orderWithItems = await storage.getOrderById(id);
      res.json(orderWithItems);
    } else {
      const order = await storage.updateOrder(id, orderData);
      res.json(order);
    }
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Failed to update order" });
  }
});

router.put('/orders/:id/status', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);

    if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const id = parseInt(req.params.id);
    const { status, cancellationReason } = req.body;

    let order;
    if (status === 'cancelled' && cancellationReason) {
      order = await storage.updateOrder(id, { status, cancellationReason });
    } else {
      order = await storage.updateOrderStatus(id, status);
    }

    if (order && order.userId && order.userId !== 'guest') {
      try {
        const customerUser = await storage.getUser(order.userId);
        const language = (customerUser as any)?.preferredLanguage || 'ru';
        await PushNotificationService.notifyOrderStatus(
          order.userId,
          order.id,
          status,
          language
        );
      } catch (pushError) {
        console.error('Error sending push notification:', pushError);
      }
    }

    res.json(order);
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Failed to update order status" });
  }
});

export default router;
