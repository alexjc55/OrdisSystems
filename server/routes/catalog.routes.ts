import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../middleware/auth-guard";
import { clearCachePattern } from "../middleware/cache";
import { upload, processUploadedImage, optimizeImage, generateThumbnail, optimizedDir, thumbnailsDir } from "../middleware/upload";
import { insertCategorySchema, insertProductSchema } from "@shared/schema";
import { z } from "zod";
import path from "path";
import fs from "fs";

const router = Router();

router.get('/categories', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const categories = await storage.getCategories(includeInactive);
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

router.post('/categories', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    const rawData = req.body;
    console.log('Category create - Raw data received:', JSON.stringify(rawData, null, 2));
    const schemaData = insertCategorySchema.parse(rawData);
    const multilingualFields: any = {};
    const supportedLanguages = ['en', 'he', 'ar'];
    supportedLanguages.forEach(lang => {
      if ((rawData as any)[`name_${lang}`] !== undefined) multilingualFields[`name_${lang}`] = (rawData as any)[`name_${lang}`];
      if ((rawData as any)[`description_${lang}`] !== undefined) multilingualFields[`description_${lang}`] = (rawData as any)[`description_${lang}`];
    });
    const categoryData = { ...schemaData, ...multilingualFields };
    console.log('Category create - Final data for storage:', JSON.stringify(categoryData, null, 2));
    const category = await storage.createCategory(categoryData);
    console.log('Category create - Result from storage:', JSON.stringify(category, null, 2));
    res.json(category);
  } catch (error) {
    console.error("Error creating category:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid data", errors: error.errors });
    res.status(500).json({ message: "Failed to create category" });
  }
});

router.put('/categories/reorder', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    if (!user || (user.role !== "admin" && user.role !== "worker" && user.email !== "alexjc55@gmail.com" && user.username !== "admin")) {
      return res.status(403).json({ message: "Admin access required" });
    }
    const { categoryOrders } = req.body;
    console.log('Received category reorder data:', JSON.stringify(categoryOrders, null, 2));
    if (!Array.isArray(categoryOrders)) return res.status(400).json({ message: "Invalid data format" });
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

router.put('/categories/:id', isAuthenticated, async (req: any, res) => {
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
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid data", errors: error.errors });
    res.status(500).json({ message: "Failed to update category" });
  }
});

router.patch('/categories/:id', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    const id = parseInt(req.params.id);
    const rawData = req.body;
    console.log('Category update - Raw data received:', JSON.stringify(rawData, null, 2));
    const schemaData = insertCategorySchema.partial().parse(rawData);
    const multilingualFields: any = {};
    const supportedLanguages = ['en', 'he', 'ar'];
    supportedLanguages.forEach(lang => {
      if ((rawData as any)[`name_${lang}`] !== undefined) multilingualFields[`name_${lang}`] = (rawData as any)[`name_${lang}`];
      if ((rawData as any)[`description_${lang}`] !== undefined) multilingualFields[`description_${lang}`] = (rawData as any)[`description_${lang}`];
    });
    const categoryData = { ...schemaData, ...multilingualFields };
    console.log('Category update - Final data for storage:', JSON.stringify(categoryData, null, 2));
    const category = await storage.updateCategory(id, categoryData);
    console.log('Category update - Result from storage:', JSON.stringify(category, null, 2));
    res.json(category);
  } catch (error) {
    console.error("Error updating category:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid data", errors: error.errors });
    res.status(500).json({ message: "Failed to update category" });
  }
});

router.delete('/categories/:id', isAuthenticated, async (req: any, res) => {
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
    if (error.code === '23503' && error.constraint === 'products_category_id_categories_id_fk') {
      return res.status(400).json({ message: "Cannot delete category with existing products", error: "CATEGORY_HAS_PRODUCTS", detail: "This category contains products. Please move or delete all products before deleting the category." });
    }
    res.status(500).json({ message: "Failed to delete category" });
  }
});

router.get('/products', async (req: any, res) => {
  try {
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
    let products = await storage.getProducts(categoryId);
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

router.get('/products/search', async (req: any, res) => {
  try {
    let query = req.query.q as string;
    if (!query) return res.status(400).json({ message: "Search query is required" });
    try { query = decodeURIComponent(query); } catch (e) { }
    let products = await storage.searchProducts(query);
    const user = req.user;
    const isAdmin = user && (user.role === "admin" || user.role === "worker");
    if (!isAdmin) {
      products = products.filter(product => product.isAvailable !== false);
    }
    res.json(products);
  } catch (error) {
    console.error("Error searching products:", error);
    res.status(500).json({ message: "Failed to search products" });
  }
});

router.get('/admin/products', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
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
    const result = await storage.getProductsPaginated({ page, limit, search, categoryId: category !== 'all' ? parseInt(category) : undefined, status, sortField, sortDirection });
    res.json(result);
  } catch (error) {
    console.error("Error fetching admin products:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const product = await storage.getProductById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: "Failed to fetch product" });
  }
});

router.post('/products', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    const rawData = req.body;
    if (rawData.discountValue === "") rawData.discountValue = null;
    if (rawData.discountType === "") rawData.discountType = null;
    const productData = insertProductSchema.parse(rawData);
    const product = await storage.createProduct(productData);
    clearCachePattern('admin-products');
    res.json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid data", errors: error.errors });
    res.status(500).json({ message: "Failed to create product" });
  }
});

router.put('/products/:id', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    const id = parseInt(req.params.id);
    const productData = insertProductSchema.partial().parse(req.body);
    const product = await storage.updateProduct(id, productData);
    clearCachePattern('admin-products');
    res.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid data", errors: error.errors });
    res.status(500).json({ message: "Failed to update product" });
  }
});

router.patch('/products/:id', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    const id = parseInt(req.params.id);
    const rawData = req.body;
    console.log('Product update - Raw data received:', JSON.stringify(rawData, null, 2));
    if (rawData.discountValue === "") rawData.discountValue = null;
    if (rawData.discountType === "") rawData.discountType = null;
    const schemaData = insertProductSchema.partial().parse(rawData);
    const multilingualFields: any = {};
    const supportedLanguages = ['en', 'he', 'ar'];
    supportedLanguages.forEach(lang => {
      if ((rawData as any)[`name_${lang}`] !== undefined) multilingualFields[`name_${lang}`] = (rawData as any)[`name_${lang}`];
      if ((rawData as any)[`description_${lang}`] !== undefined) multilingualFields[`description_${lang}`] = (rawData as any)[`description_${lang}`];
      if ((rawData as any)[`ingredients_${lang}`] !== undefined) multilingualFields[`ingredients_${lang}`] = (rawData as any)[`ingredients_${lang}`];
      if ((rawData as any)[`imageUrl_${lang}`] !== undefined) multilingualFields[`imageUrl_${lang}`] = (rawData as any)[`imageUrl_${lang}`];
    });
    const productData = { ...schemaData, ...multilingualFields };
    console.log('Product update - Final data for storage:', JSON.stringify(productData, null, 2));
    const product = await storage.updateProduct(id, productData);
    console.log('Product update - Result from storage:', JSON.stringify(product, null, 2));
    clearCachePattern('admin-products');
    clearCachePattern('products');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid data", errors: error.errors });
    res.status(500).json({ message: "Failed to update product" });
  }
});

router.patch('/products/:id/availability', isAuthenticated, async (req: any, res) => {
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

router.delete('/products/:id', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    const id = parseInt(req.params.id);
    console.log(`=== Product Deletion Debug ===`);
    console.log(`Attempting to delete product with ID: ${id}`);
    const existingProduct = await storage.getProductById(id);
    if (!existingProduct) {
      console.log(`Product with ID ${id} not found`);
      return res.status(404).json({ message: "Product not found" });
    }
    console.log(`Found product: ${existingProduct.name}`);
    await storage.deleteProduct(id);
    console.log(`Successfully deleted product with ID: ${id}`);
    clearCachePattern('admin-products');
    clearCachePattern('products');
    res.json({ message: "Product deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    if (error.code === '23503' && error.constraint === 'order_items_product_id_products_id_fk') {
      return res.status(409).json({ message: "Cannot delete product: it is used in existing orders", errorCode: "PRODUCT_IN_USE" });
    }
    res.status(500).json({ message: "Failed to delete product" });
  }
});

router.post('/admin/optimize-images', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Только администраторы могут оптимизировать изображения" });
    }
    const imagesDir = path.join(process.cwd(), 'uploads', 'images');
    if (!fs.existsSync(imagesDir)) {
      return res.json({ message: "Папка изображений не найдена", processed: 0, errors: 0 });
    }
    const files = fs.readdirSync(imagesDir).filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    let processed = 0, errors = 0, totalSavings = 0;
    console.log(`🔄 Начинаем оптимизацию ${files.length} изображений...`);
    for (const file of files) {
      try {
        const originalPath = path.join(imagesDir, file);
        const nameWithoutExt = path.parse(file).name;
        const optimizedPath = path.join(optimizedDir, `${nameWithoutExt}.jpg`);
        const thumbnailPath = path.join(thumbnailsDir, `${nameWithoutExt}.jpg`);
        if (fs.existsSync(optimizedPath) && fs.existsSync(thumbnailPath)) continue;
        const originalSize = fs.statSync(originalPath).size;
        await optimizeImage(originalPath, optimizedPath, 80, 800);
        await generateThumbnail(originalPath, thumbnailPath, 200);
        const optimizedSize = fs.statSync(optimizedPath).size;
        const savings = originalSize - optimizedSize;
        totalSavings += savings;
        console.log(`✅ ${file}: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (${((savings / originalSize) * 100).toFixed(1)}% экономии)`);
        processed++;
      } catch (error) {
        console.error(`❌ Ошибка обработки ${file}:`, error);
        errors++;
      }
    }
    res.json({ message: `Оптимизация завершена`, processed, errors, totalFiles: files.length, totalSavingsKB: Math.round(totalSavings / 1024), totalSavingsMB: (totalSavings / (1024 * 1024)).toFixed(2) });
  } catch (error) {
    console.error("Ошибка массовой оптимизации:", error);
    res.status(500).json({ message: "Ошибка при оптимизации изображений" });
  }
});

router.post('/upload', isAuthenticated, upload.single('image'), processUploadedImage, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const imageUrl = req.file.optimizedPath || `/uploads/images/${req.file.filename}`;
    const thumbnailUrl = req.file.thumbnailPath || imageUrl;
    res.json({ imageUrl, thumbnailUrl, originalUrl: `/uploads/images/${req.file.filename}`, message: "Image uploaded and optimized successfully" });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ message: "Failed to upload file" });
  }
});

export default router;
