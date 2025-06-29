import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { setupAuth, isAuthenticated } from "./auth";
import bcrypt from "bcryptjs";
import { insertCategorySchema, insertProductSchema, insertOrderSchema, insertStoreSettingsSchema, updateStoreSettingsSchema, insertThemeSchema, updateThemeSchema } from "@shared/schema";
import { z } from "zod";
import { sql } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads', 'images');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Configure multer for file uploads
  const storage_multer = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({ 
    storage: storage_multer,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!'));
      }
    }
  });

  // Serve uploaded images
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User profile routes
  app.patch('/api/profile', isAuthenticated, async (req: any, res) => {
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

  // User address routes
  app.get('/api/addresses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const addresses = await storage.getUserAddresses(userId);
      res.json(addresses);
    } catch (error) {
      console.error("Error fetching addresses:", error);
      res.status(500).json({ message: "Failed to fetch addresses" });
    }
  });

  app.post('/api/addresses', isAuthenticated, async (req: any, res) => {
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

  app.patch('/api/addresses/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/addresses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const addressId = parseInt(req.params.id);
      await storage.deleteUserAddress(addressId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting address:", error);
      res.status(500).json({ message: "Failed to delete address" });
    }
  });

  app.post('/api/addresses/:id/set-default', isAuthenticated, async (req: any, res) => {
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

  // Upload endpoint
  app.post('/api/upload', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const imageUrl = `/uploads/images/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Category routes
  app.get('/api/categories', async (req, res) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const categories = await storage.getCategories(includeInactive);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/categories', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.put('/api/categories/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== "admin" && user.role !== "worker" && user.email !== "alexjc55@gmail.com" && user.username !== "admin")) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { categoryOrders } = req.body; // Array of { id: number, sortOrder: number }
      console.log('Received category reorder data:', JSON.stringify(categoryOrders, null, 2));
      
      if (!Array.isArray(categoryOrders)) {
        return res.status(400).json({ message: "Invalid data format" });
      }

      // Validate and sanitize the data
      const validatedOrders = categoryOrders.map((item, index) => {
        const id = parseInt(String(item.id));
        const sortOrder = parseInt(String(item.sortOrder));
        
        if (isNaN(id) || isNaN(sortOrder)) {
          console.error(`Invalid data at index ${index}:`, item);
          throw new Error(`Invalid id or sortOrder at index ${index}`);
        }
        
        return { id, sortOrder };
      });

      console.log('Validated category orders:', validatedOrders);
      await storage.updateCategoryOrders(validatedOrders);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering categories:", error);
      res.status(500).json({ message: "Failed to reorder categories" });
    }
  });

  app.put('/api/categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const id = parseInt(req.params.id);
      const categoryData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.patch('/api/categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const id = parseInt(req.params.id);
      const categoryData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete('/api/categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== "admin" && user.role !== "worker" && user.email !== "alexjc55@gmail.com" && user.username !== "admin")) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteCategory(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting category:", error);
      
      // Check if the error is due to foreign key constraint (products exist in category)
      if (error.code === '23503' && error.constraint === 'products_category_id_categories_id_fk') {
        return res.status(400).json({ 
          message: "Cannot delete category with existing products", 
          error: "CATEGORY_HAS_PRODUCTS",
          detail: "This category contains products. Please move or delete all products before deleting the category."
        });
      }
      
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Product routes
  app.get('/api/products', async (req: any, res) => {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      let products = await storage.getProducts(categoryId);
      
      // Filter out unavailable products for non-admin users
      const isAdmin = req.user?.claims?.sub && req.isAuthenticated?.() && 
        (await storage.getUser(req.user.id))?.email === "alexjc55@gmail.com";
      
      if (!isAdmin) {
        products = products.filter(product => product.isAvailable !== false);
      }
      
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/search', async (req: any, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      let products = await storage.searchProducts(query);
      
      // Filter out unavailable products for non-admin users
      const isAdmin = req.user?.claims?.sub && req.isAuthenticated?.() && 
        (await storage.getUser(req.user.id))?.email === "alexjc55@gmail.com";
      
      if (!isAdmin) {
        products = products.filter(product => product.isAvailable !== false);
      }
      
      res.json(products);
    } catch (error) {
      console.error("Error searching products:", error);
      res.status(500).json({ message: "Failed to search products" });
    }
  });

  // Admin-only route to get all products including unavailable ones with pagination
  app.get('/api/admin/products', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user; // Use user from session instead of additional DB query
      
      if (!user || (user.role !== "admin" && user.role !== "worker")) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || '';
      const category = req.query.category as string || 'all';
      const status = req.query.status as string || 'all';
      const sortField = req.query.sortField as string || 'name';
      const sortDirection = req.query.sortDirection as string || 'asc';

      const result = await storage.getProductsPaginated({
        page,
        limit,
        search,
        categoryId: category !== 'all' ? parseInt(category) : undefined,
        status,
        sortField,
        sortDirection
      });

      res.json(result);
    } catch (error) {
      console.error("Error fetching admin products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProductById(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const rawData = req.body;
      
      // Handle empty discount values - convert empty strings to null
      if (rawData.discountValue === "") {
        rawData.discountValue = null;
      }
      if (rawData.discountType === "") {
        rawData.discountType = null;
      }

      const productData = insertProductSchema.parse(rawData);
      const product = await storage.createProduct(productData);
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const id = parseInt(req.params.id);
      const productData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(id, productData);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.patch('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const id = parseInt(req.params.id);
      const rawData = req.body;
      
      // Handle empty discount values - convert empty strings to null
      if (rawData.discountValue === "") {
        rawData.discountValue = null;
      }
      if (rawData.discountType === "") {
        rawData.discountType = null;
      }
      
      const productData = insertProductSchema.partial().parse(rawData);
      const product = await storage.updateProduct(id, productData);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.patch('/api/products/:id/availability', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const id = parseInt(req.params.id);
      const { availabilityStatus } = req.body;
      
      if (!["available", "out_of_stock_today", "completely_unavailable"].includes(availabilityStatus)) {
        return res.status(400).json({ message: "Invalid availability status" });
      }

      const product = await storage.updateProductAvailability(id, availabilityStatus);
      res.json(product);
    } catch (error) {
      console.error("Error updating product availability:", error);
      res.status(500).json({ message: "Failed to update product availability" });
    }
  });

  // Order routes
  app.get('/api/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Admins and workers can see all orders, customers only see their own
      const orders = user.role === 'admin' || user.role === 'worker' 
        ? await storage.getOrders()
        : await storage.getOrders(userId);
      
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Get user's own orders
  app.get('/api/orders/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const orders = await storage.getOrders(userId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching user orders:", error);
      res.status(500).json({ message: "Failed to fetch user orders" });
    }
  });

  // Guest order creation
  app.post('/api/orders/guest', async (req, res) => {
    try {
      const { items, totalAmount, guestInfo } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Invalid order items" });
      }

      if (!guestInfo || !guestInfo.firstName || !guestInfo.lastName || !guestInfo.email || !guestInfo.phone || !guestInfo.address) {
        return res.status(400).json({ message: "Guest information is required" });
      }

      // Create order with guest information
      const orderData = {
        userId: null, // Guest order
        totalAmount,
        status: "pending" as const,
        deliveryAddress: guestInfo.address,
        guestName: `${guestInfo.firstName} ${guestInfo.lastName}`,
        guestEmail: guestInfo.email,
        guestPhone: guestInfo.phone,
        deliveryDate: guestInfo.deliveryDate,
        deliveryTime: guestInfo.deliveryTime,
        paymentMethod: guestInfo.paymentMethod
      };

      const orderItems = items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity.toString(),
        pricePerKg: item.pricePerUnit.toString(),
        totalPrice: item.totalPrice.toString(),
        orderId: 0
      }));

      const order = await storage.createOrder(orderData, orderItems);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating guest order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.post('/api/orders', async (req: any, res) => {
    try {
      let userId = null;
      let user = null;
      
      // Check if user is authenticated (session-based auth or userId provided in body)
      if (req.isAuthenticated && req.isAuthenticated() && req.user?.id) {
        userId = req.user.id;
        user = await storage.getUser(userId);
        console.log("Order creation: Using authenticated user", userId);
      } else if (req.body.userId) {
        // For newly registered users during checkout
        userId = req.body.userId;
        user = await storage.getUser(userId);
        console.log("Order creation: Using userId from body", userId);
      } else {
        console.log("Order creation: No user found, creating guest order");
      }

      const { items, ...orderData } = req.body;
      
      const orderSchema = insertOrderSchema.extend({
        requestedDeliveryDate: z.string().optional(),
        requestedDeliveryTime: z.string().optional(), // Override to accept string instead of timestamp
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.string(),
          pricePerKg: z.string(),
          totalPrice: z.string(),
        }))
      });

      const validatedData = orderSchema.parse({ ...orderData, userId, items });
      
      // Process delivery date and time from form data
      const { requestedDeliveryDate, requestedDeliveryTime, items: _, ...orderDataWithoutTemp } = validatedData;
      let processedOrderData = { ...orderDataWithoutTemp };
      
      // Only set userId if user is authenticated
      if (userId) {
        processedOrderData.userId = userId;
      }
      
      if (requestedDeliveryTime && requestedDeliveryDate) {
        // Store the date and time range separately
        processedOrderData.deliveryDate = requestedDeliveryDate; // YYYY-MM-DD from form
        processedOrderData.deliveryTime = requestedDeliveryTime; // Time range like "10:00-12:00"
      }
      
      // Remove the extended fields that aren't part of the original order schema
      delete (processedOrderData as any).requestedDeliveryDate;
      delete (processedOrderData as any).requestedDeliveryTime;
      
      const order = await storage.createOrder(
        processedOrderData,
        validatedData.items.map(item => ({ ...item, orderId: 0 }))
      );
      
      res.json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.patch('/api/orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== "admin" && user.role !== "worker" && user.email !== "alexjc55@gmail.com" && user.username !== "admin")) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const { items, totalAmount, ...orderData } = req.body;
      
      console.log("Order update request body:", JSON.stringify(req.body, null, 2));
      console.log("Order data being updated:", JSON.stringify(orderData, null, 2));
      
      // If items are provided, this is a comprehensive update
      if (items) {
        console.log("Updating order items:", JSON.stringify(items, null, 2));
        
        // Update order items in database
        await storage.updateOrderItems(id, items);
        
        // Update order with new total amount and other data
        const updatedOrder = await storage.updateOrder(id, { 
          ...orderData, 
          totalAmount: totalAmount || orderData.totalAmount
        });
        
        // Return the updated order with items
        const orderWithItems = await storage.getOrderById(id);
        res.json(orderWithItems);
      } else {
        // Standard order update without items modification
        const order = await storage.updateOrder(id, orderData);
        res.json(order);
      }
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  app.put('/api/orders/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const id = parseInt(req.params.id);
      const { status, cancellationReason } = req.body;
      
      // If status is cancelled and cancellation reason is provided, update order with reason
      if (status === 'cancelled' && cancellationReason) {
        const order = await storage.updateOrder(id, { status, cancellationReason });
        res.json(order);
      } else {
        const order = await storage.updateOrderStatus(id, status);
        res.json(order);
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Store settings routes
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await storage.getStoreSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching store settings:", error);
      res.status(500).json({ message: "Failed to fetch store settings" });
    }
  });

  app.put('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get current settings first
      const currentSettings = await storage.getStoreSettings();
      if (!currentSettings) {
        return res.status(404).json({ message: "Store settings not found" });
      }

      // Merge current settings with updates
      const mergedData = {
        ...currentSettings,
        ...req.body,
        id: currentSettings.id // Ensure ID is preserved
      };

      // Validate the merged data
      const settingsData = insertStoreSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateStoreSettings(mergedData);
      
      res.json(settings);
    } catch (error) {
      console.error("Error updating store settings:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update store settings" });
    }
  });

  // Admin-only route to get orders with pagination
  app.get('/api/admin/orders', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user; // Use user from session instead of additional DB query
      
      if (!user || (user.role !== "admin" && user.role !== "worker")) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || '';
      const status = req.query.status as string || 'all';
      const sortField = req.query.sortField as string || 'createdAt';
      const sortDirection = req.query.sortDirection as string || 'desc';

      const result = await storage.getOrdersPaginated({
        page,
        limit,
        search,
        status,
        sortField,
        sortDirection
      });

      res.json(result);
    } catch (error) {
      console.error("Error fetching admin orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Admin-only route to get users with pagination
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user; // Use user from session instead of additional DB query
      
      if (!user || (user.role !== "admin" && user.role !== "worker")) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || '';
      const status = req.query.status as string || 'all';
      const sortField = req.query.sortField as string || 'createdAt';
      const sortDirection = req.query.sortDirection as string || 'desc';

      const result = await storage.getUsersPaginated({
        page,
        limit,
        search,
        status,
        sortField,
        sortDirection
      });

      res.json(result);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin-only route to create a new user
  app.post('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user; // Use user from session instead of additional DB query
      
      if (!user || (user.role !== "admin" && user.role !== "worker")) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const userData = req.body;
      const newUser = await storage.createUser(userData);
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Admin-only route to update a user
  app.put('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user; // Use user from session instead of additional DB query
      
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

  // Admin-only route to update user role
  app.patch('/api/admin/users/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== "admin" && user.role !== "worker" && user.email !== "alexjc55@gmail.com" && user.username !== "admin")) {
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

  // Admin-only route to delete a user
  app.delete('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== "admin" && user.role !== "worker" && user.email !== "alexjc55@gmail.com" && user.username !== "admin")) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      
      // Prevent deleting yourself
      if (id === userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      await storage.deleteUser(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Password Management Routes
  
  // Change password for authenticated user
  app.post('/api/auth/change-password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Новый пароль должен содержать минимум 6 символов" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }

      // If user has an existing password, verify current password
      if (user.password) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Необходимо указать текущий пароль" });
        }
        
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
          return res.status(400).json({ message: "Неверный текущий пароль" });
        }
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updatePassword(userId, hashedPassword);

      res.json({ message: "Пароль успешно изменен" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Ошибка при изменении пароля" });
    }
  });

  // Request password reset
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email обязателен" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ message: "Если пользователь с таким email существует, инструкции отправлены на почту" });
      }

      const { token } = await storage.createPasswordResetToken(email);
      
      // In production, send email here
      console.log(`Password reset token for ${email}: ${token}`);
      
      res.json({ message: "Если пользователь с таким email существует, инструкции отправлены на почту" });
    } catch (error) {
      console.error("Error requesting password reset:", error);
      res.status(500).json({ message: "Ошибка при запросе сброса пароля" });
    }
  });

  // Reset password with token
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Токен и новый пароль обязательны" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Пароль должен содержать минимум 6 символов" });
      }

      const { userId, isValid } = await storage.validatePasswordResetToken(token);
      if (!isValid) {
        return res.status(400).json({ message: "Недействительный или истекший токен" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updatePassword(userId, hashedPassword);

      res.json({ message: "Пароль успешно сброшен" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Ошибка при сбросе пароля" });
    }
  });

  // Admin route to set password for any user
  app.post('/api/admin/users/:id/set-password', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.id;
      const adminUser = await storage.getUser(adminUserId);
      
      if (!adminUser || (adminUser.role !== "admin" && adminUser.email !== "alexjc55@gmail.com" && adminUser.username !== "admin")) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const { password } = req.body;

      if (!password || password.length < 6) {
        return res.status(400).json({ message: "Пароль должен содержать минимум 6 символов" });
      }

      // Use the same hashing method as in auth.ts
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;
      await storage.updatePassword(id, hashedPassword);

      res.json({ message: "Пароль успешно установлен" });
    } catch (error) {
      console.error("Error setting user password:", error);
      res.status(500).json({ message: "Ошибка при установке пароля" });
    }
  });

  // Theme management routes
  app.get('/api/admin/themes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const themes = await storage.getThemes();
      res.json(themes);
    } catch (error) {
      console.error("Error fetching themes:", error);
      res.status(500).json({ message: "Failed to fetch themes" });
    }
  });

  app.get('/api/themes/active', async (req, res) => {
    try {
      const activeTheme = await storage.getActiveTheme();
      res.json(activeTheme || null);
    } catch (error) {
      console.error("Error fetching active theme:", error);
      res.status(500).json({ message: "Failed to fetch active theme" });
    }
  });

  app.post('/api/admin/themes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const themeData = insertThemeSchema.parse(req.body);
      
      // Generate ID if not provided
      if (!themeData.id) {
        themeData.id = `custom_theme_${Date.now()}`;
      }
      
      const theme = await storage.createTheme(themeData);
      res.status(201).json(theme);
    } catch (error) {
      console.error("Error creating theme:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create theme" });
    }
  });

  app.put('/api/admin/themes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      
      // Filter out null values and only send fields that were actually changed
      const body = req.body;
      const themeData: any = {};
      
      // Only include non-null values in the update
      Object.keys(body).forEach(key => {
        if (body[key] !== null && body[key] !== undefined && body[key] !== '') {
          themeData[key] = body[key];
        }
      });
      
      console.log("Theme update data:", themeData);
      const theme = await storage.updateTheme(id, themeData);
      
      // If this is the active theme, sync all settings with store settings via SQL
      if (theme.isActive) {
        const updateFields = [];
        
        // Sync header style
        if (themeData.headerStyle) {
          updateFields.push(`header_style = '${themeData.headerStyle}'`);
        }
        
        // Sync banner button settings
        if (themeData.bannerButtonText !== undefined) {
          updateFields.push(`banner_button_text = '${themeData.bannerButtonText || 'Смотреть каталог'}'`);
        }
        if (themeData.bannerButtonLink !== undefined) {
          updateFields.push(`banner_button_link = '${themeData.bannerButtonLink || '#categories'}'`);
        }
        
        // Sync modern style info blocks settings
        if (themeData.headerStyle === 'modern' || theme.headerStyle === 'modern') {
          if (themeData.modernBlock1Icon !== undefined) updateFields.push(`modern_block1_icon = '${themeData.modernBlock1Icon || ''}'`);
          if (themeData.modernBlock1Text !== undefined) updateFields.push(`modern_block1_text = '${themeData.modernBlock1Text || ''}'`);
          if (themeData.modernBlock2Icon !== undefined) updateFields.push(`modern_block2_icon = '${themeData.modernBlock2Icon || ''}'`);
          if (themeData.modernBlock2Text !== undefined) updateFields.push(`modern_block2_text = '${themeData.modernBlock2Text || ''}'`);
          if (themeData.modernBlock3Icon !== undefined) updateFields.push(`modern_block3_icon = '${themeData.modernBlock3Icon || ''}'`);
          if (themeData.modernBlock3Text !== undefined) updateFields.push(`modern_block3_text = '${themeData.modernBlock3Text || ''}'`);
        }
        
        // Sync logo and banner images (CRITICAL FOR DISPLAY)
        if (themeData.logoUrl !== undefined) updateFields.push(`logo_url = '${themeData.logoUrl || ''}'`);
        if (themeData.bannerImageUrl !== undefined) updateFields.push(`banner_image_url = '${themeData.bannerImageUrl || ''}'`);
        
        // Sync cart banner settings
        if (themeData.showCartBanner !== undefined) updateFields.push(`show_cart_banner = ${themeData.showCartBanner}`);
        if (themeData.cartBannerType !== undefined) updateFields.push(`cart_banner_type = '${themeData.cartBannerType || 'text'}'`);
        if (themeData.cartBannerImage !== undefined) updateFields.push(`cart_banner_image = '${themeData.cartBannerImage || ''}'`);
        if (themeData.cartBannerText !== undefined) updateFields.push(`cart_banner_text = '${themeData.cartBannerText || ''}'`);
        if (themeData.cartBannerBgColor !== undefined) updateFields.push(`cart_banner_bg_color = '${themeData.cartBannerBgColor || '#f97316'}'`);
        if (themeData.cartBannerTextColor !== undefined) updateFields.push(`cart_banner_text_color = '${themeData.cartBannerTextColor || '#ffffff'}'`);
        
        // Sync bottom banners
        if (themeData.showBottomBanners !== undefined) updateFields.push(`show_bottom_banners = ${themeData.showBottomBanners}`);
        if (themeData.bottomBanner1Url !== undefined) updateFields.push(`bottom_banner1_url = '${themeData.bottomBanner1Url || ''}'`);
        if (themeData.bottomBanner1Link !== undefined) updateFields.push(`bottom_banner1_link = '${themeData.bottomBanner1Link || ''}'`);
        if (themeData.bottomBanner2Url !== undefined) updateFields.push(`bottom_banner2_url = '${themeData.bottomBanner2Url || ''}'`);
        if (themeData.bottomBanner2Link !== undefined) updateFields.push(`bottom_banner2_link = '${themeData.bottomBanner2Link || ''}'`);

        // Sync visual display settings
        if (themeData.showBannerImage !== undefined) updateFields.push(`show_banner_image = ${themeData.showBannerImage}`);
        if (themeData.showTitleDescription !== undefined) updateFields.push(`show_title_description = ${themeData.showTitleDescription}`);
        if (themeData.showInfoBlocks !== undefined) updateFields.push(`show_info_blocks = ${themeData.showInfoBlocks}`);
        if (themeData.infoBlocksPosition !== undefined) updateFields.push(`info_blocks_position = '${themeData.infoBlocksPosition || 'top'}'`);
        if (themeData.showSpecialOffers !== undefined) updateFields.push(`show_special_offers = ${themeData.showSpecialOffers}`);
        if (themeData.showCategoryMenu !== undefined) updateFields.push(`show_category_menu = ${themeData.showCategoryMenu}`);
        if (themeData.showWhatsAppChat !== undefined) updateFields.push(`show_whatsapp_chat = ${themeData.showWhatsAppChat}`);
        if (themeData.whatsappPhone !== undefined) updateFields.push(`whatsapp_phone_number = '${themeData.whatsappPhone || ''}'`);
        if (themeData.whatsappMessage !== undefined) updateFields.push(`whatsapp_default_message = '${themeData.whatsappMessage || 'Здравствуйте! У меня есть вопрос по заказу.'}'`);
        
        // Execute the update if there are fields to update
        if (updateFields.length > 0) {
          await db.execute(sql.raw(`UPDATE store_settings SET ${updateFields.join(', ')} WHERE id = 1`));
          // Add cache invalidation header to force refresh of store settings
          res.set('X-Settings-Updated', 'true');
        }
      }
      
      res.json(theme);
    } catch (error) {
      console.error("Error updating theme:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update theme" });
    }
  });

  app.post('/api/admin/themes/:id/activate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const theme = await storage.activateTheme(id);
      
      // Sync the active theme's headerStyle and banner button settings with store settings via SQL
      if (theme.headerStyle) {
        await db.execute(sql.raw(`UPDATE store_settings SET header_style = '${theme.headerStyle}' WHERE id = 1`));
      }
      
      // Sync banner button settings for minimal header style
      if (theme.bannerButtonText && theme.bannerButtonLink) {
        await db.execute(sql.raw(`UPDATE store_settings SET banner_button_text = '${theme.bannerButtonText}', banner_button_link = '${theme.bannerButtonLink}' WHERE id = 1`));
      }
      
      // Sync modern style info blocks settings
      if (theme.headerStyle === 'modern') {
        const modernFields = [
          `modern_block1_icon = '${theme.modernBlock1Icon || ''}'`,
          `modern_block1_text = '${theme.modernBlock1Text || ''}'`,
          `modern_block2_icon = '${theme.modernBlock2Icon || ''}'`,
          `modern_block2_text = '${theme.modernBlock2Text || ''}'`,
          `modern_block3_icon = '${theme.modernBlock3Icon || ''}'`,
          `modern_block3_text = '${theme.modernBlock3Text || ''}'`
        ];
        await db.execute(sql.raw(`UPDATE store_settings SET ${modernFields.join(', ')} WHERE id = 1`));
      }
      
      // Sync logo and banner images (CRITICAL FOR DISPLAY)
      const imageFields = [
        `logo_url = '${theme.logoUrl || ''}'`,
        `banner_image_url = '${theme.bannerImageUrl || ''}'`
      ];
      await db.execute(sql.raw(`UPDATE store_settings SET ${imageFields.join(', ')} WHERE id = 1`));
      
      // Sync cart banner settings
      const cartBannerFields = [
        `show_cart_banner = ${theme.showCartBanner ?? false}`,
        `cart_banner_type = '${theme.cartBannerType || 'text'}'`,
        `cart_banner_image = '${theme.cartBannerImage || ''}'`,
        `cart_banner_text = '${theme.cartBannerText || ''}'`,
        `cart_banner_bg_color = '${theme.cartBannerBgColor || '#f97316'}'`,
        `cart_banner_text_color = '${theme.cartBannerTextColor || '#ffffff'}'`
      ];
      await db.execute(sql.raw(`UPDATE store_settings SET ${cartBannerFields.join(', ')} WHERE id = 1`));
      
      // Sync bottom banners
      const bottomBannerFields = [
        `show_bottom_banners = ${theme.showBottomBanners ?? false}`,
        `bottom_banner1_url = '${theme.bottomBanner1Url || ''}'`,
        `bottom_banner1_link = '${theme.bottomBanner1Link || ''}'`,
        `bottom_banner2_url = '${theme.bottomBanner2Url || ''}'`,
        `bottom_banner2_link = '${theme.bottomBanner2Link || ''}'`
      ];
      await db.execute(sql.raw(`UPDATE store_settings SET ${bottomBannerFields.join(', ')} WHERE id = 1`));

      // Sync all visual display settings with store settings
      const visualFields = [
        `show_banner_image = ${theme.showBannerImage ?? true}`,
        `show_title_description = ${theme.showTitleDescription ?? true}`,
        `show_info_blocks = ${theme.showInfoBlocks ?? true}`,
        `info_blocks_position = '${theme.infoBlocksPosition || 'top'}'`,
        `show_special_offers = ${theme.showSpecialOffers ?? true}`,
        `show_category_menu = ${theme.showCategoryMenu ?? true}`,
        `show_whatsapp_chat = ${theme.showWhatsAppChat ?? true}`,
        `whatsapp_phone_number = '${theme.whatsappPhone || ''}'`,
        `whatsapp_default_message = '${theme.whatsappMessage || 'Здравствуйте! У меня есть вопрос по заказу.'}'`
      ];
      await db.execute(sql.raw(`UPDATE store_settings SET ${visualFields.join(', ')} WHERE id = 1`));
      
      res.json(theme);
    } catch (error) {
      console.error("Error activating theme:", error);
      res.status(500).json({ message: "Failed to activate theme" });
    }
  });

  app.delete('/api/admin/themes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      
      // Check if theme is active
      const theme = await storage.getThemeById(id);
      if (theme?.isActive) {
        return res.status(400).json({ message: "Cannot delete active theme" });
      }
      
      // Prevent deletion of default theme
      if (id.includes('default_theme')) {
        return res.status(400).json({ message: "Cannot delete default theme" });
      }

      await storage.deleteTheme(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting theme:", error);
      res.status(500).json({ message: "Failed to delete theme" });
    }
  });

  // Theme management routes
  app.get('/api/admin/themes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const themes = await storage.getThemes();
      res.json(themes);
    } catch (error) {
      console.error("Error fetching themes:", error);
      res.status(500).json({ message: "Failed to fetch themes" });
    }
  });

  app.get('/api/themes/active', async (req, res) => {
    try {
      const activeTheme = await storage.getActiveTheme();
      res.json(activeTheme);
    } catch (error) {
      console.error("Error fetching active theme:", error);
      res.status(500).json({ message: "Failed to fetch active theme" });
    }
  });

  app.post('/api/admin/themes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const themeData = insertThemeSchema.parse(req.body);
      
      // Generate ID if not provided
      if (!themeData.id) {
        themeData.id = `custom_theme_${Date.now()}`;
      }
      
      const theme = await storage.createTheme(themeData);
      res.status(201).json(theme);
    } catch (error) {
      console.error("Error creating theme:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create theme" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
