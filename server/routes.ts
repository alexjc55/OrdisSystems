import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getDB } from "./db";
import { setupAuth, isAuthenticated } from "./auth";
import bcrypt from "bcryptjs";
import { insertCategorySchema, insertProductSchema, insertOrderSchema, insertStoreSettingsSchema, updateStoreSettingsSchema, insertThemeSchema, updateThemeSchema, pushSubscriptions, marketingNotifications, storeSettings, closedDates, insertClosedDateSchema } from "@shared/schema";
import { PushNotificationService } from "./push-notifications";
import { emailService, sendNewOrderEmail, sendGuestOrderEmail } from "./email-service";
import { sendFacebookPurchaseEvent, type FacebookOrderData } from "./facebook-conversions-api";
import { z } from "zod";
import { sql } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { scrypt, randomBytes, createHash } from "crypto";
import { promisify } from "util";
import sharp from "sharp";

// Simple in-memory cache for admin data
const adminCache = new Map<string, { data: any; expiry: number }>();

function setCache(key: string, data: any, ttlSeconds: number = 300) {
  // Cache completely disabled for development
  return;
}

function getCache(key: string) {
  // Cache disabled for development
  return null;
}

function clearCachePattern(pattern: string) {
  const keys = Array.from(adminCache.keys());
  for (const key of keys) {
    if (key.includes(pattern)) {
      adminCache.delete(key);
    }
  }
}

const scryptAsync = promisify(scrypt);

// Image optimization function
async function optimizeImage(inputPath: string, outputPath: string, quality: number = 80, maxWidth: number = 800): Promise<void> {
  try {
    await sharp(inputPath)
      .resize(maxWidth, null, { 
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({ 
        quality: quality,
        progressive: true 
      })
      .toFile(outputPath);
  } catch (error) {
    console.error('Image optimization failed:', error);
    // If optimization fails, copy original file
    fs.copyFileSync(inputPath, outputPath);
  }
}

// Generate thumbnail
async function generateThumbnail(inputPath: string, outputPath: string, size: number = 200): Promise<void> {
  try {
    await sharp(inputPath)
      .resize(size, size, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ 
        quality: 70,
        progressive: true 
      })
      .toFile(outputPath);
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    // If thumbnail generation fails, copy original file
    fs.copyFileSync(inputPath, outputPath);
  }
}

// Generate app hash based on main files for cache busting
async function generateAppHash(): Promise<string> {
  try {
    const hash = createHash('md5');
    const filesToCheck = [
      'package.json',
      'client/src/App.tsx',
      'client/src/main.tsx',
      'client/public/sw.js',
      'server/index.ts',
      'server/routes.ts'
    ];
    
    // СТАБИЛИЗАЦИЯ ХЕША: убираем постоянное изменение времени, чтобы избежать зацикливания на мобильных устройствах
    
    for (const file of filesToCheck) {
      const fullPath = path.join(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        hash.update(`${file}:${stats.mtime.getTime()}`);
      }
    }
    
    return hash.digest('hex').substring(0, 8);
  } catch (error) {
    console.error('Error generating app hash:', error);
    return Date.now().toString().substring(-8);
  }
}

// Middleware to require admin access
function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = req.user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }
  
  return next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Add cache control headers only for API routes (not static files)
  app.use((req, res, next) => {
    // Skip cache control for static files (uploads, favicon)
    if (req.path.startsWith('/uploads/') || req.path === '/api/favicon') {
      return next();
    }
    
    // CRITICAL: Never cache the thanks page - apply strongest no-cache headers
    if (req.path === '/thanks' || req.path.startsWith('/thanks?')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      res.setHeader('Vary', '*');
      console.log('🚫 [Server] Thanks page detected - setting no-cache headers for:', req.path);
      return next();
    }
    
    // Apply no-cache to API and HTML routes
    if (req.path.startsWith('/api/') || req.path === '/' || req.path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      // Check database connection
      const db = await getDB();
      await db.execute(sql`SELECT 1`);
      
      // Check if uploads directory exists
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const uploadsExists = fs.existsSync(uploadsDir);
      
      // Generate app hash based on main files
      const appHash = await generateAppHash();
      
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "1.0.0",
        environment: process.env.NODE_ENV || "development",
        database: "connected",
        uploads: uploadsExists ? "available" : "missing",
        uptime: process.uptime(),
        appHash: appHash, // For cache busting
        buildTime: process.env.BUILD_TIME || new Date().toISOString()
      });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // App version endpoint for cache busting
  let testHash: string | null = null;
  let testStartTime: number | null = null;
  
  app.get("/api/version", async (req, res) => {
    try {
      let appHash = await generateAppHash();
      const buildTime = process.env.BUILD_TIME || new Date().toISOString();
      
      // ТЕСТОВЫЙ РЕЖИМ: Если передан параметр test, генерируем новый hash и запоминаем на 5 минут
      if (req.query.test === 'notification') {
        testHash = 'test_' + Date.now().toString().slice(-6);
        testStartTime = Date.now();
        console.log('🧪 [Test Mode] Generated new hash for notification test:', testHash);
        appHash = testHash;
      } 
      // Если тестовый режим активен и не истек (5 минут), используем тестовый хеш
      else if (testHash && testStartTime && (Date.now() - testStartTime) < 300000) {
        appHash = testHash;
        console.log('🧪 [Test Mode] Using active test hash:', testHash);
      }
      // Если тестовый режим истек, сбрасываем его
      else if (testHash && testStartTime && (Date.now() - testStartTime) >= 300000) {
        console.log('🧪 [Test Mode] Test hash expired, returning to normal');
        testHash = null;
        testStartTime = null;
      }
      
      res.json({
        version: process.env.npm_package_version || "1.0.0",
        appHash: appHash,
        buildTime: buildTime,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Version check failed:', error);
      res.status(500).json({
        error: "Failed to get version info",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Ensure uploads directories exist
  const uploadsDir = path.join(process.cwd(), 'uploads', 'images');
  const optimizedDir = path.join(process.cwd(), 'uploads', 'optimized');
  const thumbnailsDir = path.join(process.cwd(), 'uploads', 'thumbnails');
  
  [uploadsDir, optimizedDir, thumbnailsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

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
      fileSize: 10 * 1024 * 1024 // 10MB limit (increased because we'll optimize)
    },
    fileFilter: function (req, file, cb) {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!'));
      }
    }
  });

  // Separate multer configuration for Excel files (translations)
  const excelUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit for Excel files
    },
    fileFilter: function (req, file, cb) {
      if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.mimetype === 'application/vnd.ms-excel' ||
          file.originalname.endsWith('.xlsx') ||
          file.originalname.endsWith('.xls')) {
        cb(null, true);
      } else {
        cb(new Error('Only Excel files (.xlsx, .xls) are allowed!'));
      }
    }
  });

  // Image optimization middleware
  async function processUploadedImage(req: any, res: any, next: any) {
    if (!req.file) {
      return next();
    }

    try {
      const originalPath = req.file.path;
      const filename = req.file.filename;
      const nameWithoutExt = path.parse(filename).name;
      
      // Generate optimized versions
      const optimizedPath = path.join(optimizedDir, `${nameWithoutExt}.jpg`);
      const thumbnailPath = path.join(thumbnailsDir, `${nameWithoutExt}.jpg`);
      
      // Create optimized version (800px max width, 80% quality)
      await optimizeImage(originalPath, optimizedPath, 80, 800);
      
      // Create thumbnail (200px x 200px, 70% quality)
      await generateThumbnail(originalPath, thumbnailPath, 200);
      
      // Get file sizes for comparison
      const originalSize = fs.statSync(originalPath).size;
      const optimizedSize = fs.statSync(optimizedPath).size;
      const thumbnailSize = fs.statSync(thumbnailPath).size;
      
      console.log(`📸 Image optimized: ${filename}`);
      console.log(`   Original: ${(originalSize / 1024).toFixed(1)}KB`);
      console.log(`   Optimized: ${(optimizedSize / 1024).toFixed(1)}KB (${((1 - optimizedSize/originalSize) * 100).toFixed(1)}% smaller)`);
      console.log(`   Thumbnail: ${(thumbnailSize / 1024).toFixed(1)}KB`);
      
      // Update req.file with optimized path info
      req.file.optimizedPath = `/uploads/optimized/${nameWithoutExt}.jpg`;
      req.file.thumbnailPath = `/uploads/thumbnails/${nameWithoutExt}.jpg`;
      req.file.originalPath = req.file.path;
      
      next();
    } catch (error) {
      console.error('Image processing failed:', error);
      // Continue with original file if optimization fails
      next();
    }
  }

  // Serve uploaded images with caching
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
    maxAge: '1h', // Cache images for 1 hour
    etag: true,
    lastModified: true
  }));

  // Disable caching only for API routes (not static files)
  app.use('/api', (req, res, next) => {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    next();
  });

  // SEO Routes (must be before auth middleware)
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /auth
Disallow: /checkout
Disallow: /profile

Sitemap: ${req.protocol}://${req.get('host')}/sitemap.xml`);
  });

  app.get('/sitemap.xml', async (req, res) => {
    try {
      const categories = await storage.getCategories();
      const products = await storage.getProducts();
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const languages = ['ru', 'en', 'he', 'ar'];
      const now = new Date().toISOString();
      
      let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">`;

      // Main page with multilingual alternatives
      sitemap += `
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>`;
      
      languages.forEach(lang => {
        const langPath = lang === 'ru' ? '' : `/${lang}`;
        sitemap += `
    <xhtml:link rel="alternate" hreflang="${lang}" href="${baseUrl}${langPath}/" />`;
      });
      sitemap += `
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/" />
  </url>`;

      // Add category pages with multilingual support
      categories.forEach(category => {
        // Convert to ISO format to comply with W3C datetime standard
        const categoryLastMod = category.updatedAt 
          ? new Date(category.updatedAt).toISOString() 
          : (category.createdAt ? new Date(category.createdAt).toISOString() : now);
        
        // Category pages use path segments: /category/{id}
        sitemap += `
  <url>
    <loc>${baseUrl}/category/${category.id}</loc>
    <lastmod>${categoryLastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>`;
        
        languages.forEach(lang => {
          const langPath = lang === 'ru' ? '' : `/${lang}`;
          sitemap += `
    <xhtml:link rel="alternate" hreflang="${lang}" href="${baseUrl}${langPath}/category/${category.id}" />`;
        });
        sitemap += `
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/category/${category.id}" />
  </url>`;
      });

      // Add "all products" page with multilingual support
      sitemap += `
  <url>
    <loc>${baseUrl}/all-products</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>`;
      
      languages.forEach(lang => {
        const langPath = lang === 'ru' ? '' : `/${lang}`;
        sitemap += `
    <xhtml:link rel="alternate" hreflang="${lang}" href="${baseUrl}${langPath}/all-products" />`;
      });
      sitemap += `
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/all-products" />
  </url>`;

      // Add static pages with multilingual support
      const staticPages = [
        { path: '/profile', priority: '0.5', changefreq: 'monthly' },
        { path: '/auth', priority: '0.4', changefreq: 'monthly' }
      ];

      staticPages.forEach(page => {
        sitemap += `
  <url>
    <loc>${baseUrl}${page.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>`;
        
        languages.forEach(lang => {
          const langPath = lang === 'ru' ? '' : `/${lang}`;
          sitemap += `
    <xhtml:link rel="alternate" hreflang="${lang}" href="${baseUrl}${langPath}${page.path}" />`;
        });
        sitemap += `
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}${page.path}" />
  </url>`;
      });

      sitemap += `
</urlset>`;

      res.type('application/xml');
      res.send(sitemap);
    } catch (error) {
      console.error('Error generating sitemap:', error);
      res.status(500).send('Error generating sitemap');
    }
  });

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

  // Batch optimize existing images
  app.post('/api/admin/optimize-images', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Только администраторы могут оптимизировать изображения" });
      }

      const imagesDir = path.join(process.cwd(), 'uploads', 'images');
      const optimizedDir = path.join(process.cwd(), 'uploads', 'optimized');
      const thumbnailsDir = path.join(process.cwd(), 'uploads', 'thumbnails');

      // Получаем все изображения
      if (!fs.existsSync(imagesDir)) {
        return res.json({ message: "Папка изображений не найдена", processed: 0, errors: 0 });
      }

      const files = fs.readdirSync(imagesDir).filter(file => 
        /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
      );

      let processed = 0;
      let errors = 0;
      let totalSavings = 0;

      console.log(`🔄 Начинаем оптимизацию ${files.length} изображений...`);

      for (const file of files) {
        try {
          const originalPath = path.join(imagesDir, file);
          const nameWithoutExt = path.parse(file).name;
          const optimizedPath = path.join(optimizedDir, `${nameWithoutExt}.jpg`);
          const thumbnailPath = path.join(thumbnailsDir, `${nameWithoutExt}.jpg`);

          // Пропускаем если уже оптимизировано
          if (fs.existsSync(optimizedPath) && fs.existsSync(thumbnailPath)) {
            continue;
          }

          const originalSize = fs.statSync(originalPath).size;

          // Создаем оптимизированную версию
          await optimizeImage(originalPath, optimizedPath, 80, 800);
          
          // Создаем миниатюру
          await generateThumbnail(originalPath, thumbnailPath, 200);

          const optimizedSize = fs.statSync(optimizedPath).size;
          const savings = originalSize - optimizedSize;
          totalSavings += savings;

          console.log(`✅ ${file}: ${(originalSize/1024).toFixed(1)}KB → ${(optimizedSize/1024).toFixed(1)}KB (${((savings/originalSize)*100).toFixed(1)}% экономии)`);
          
          processed++;
        } catch (error) {
          console.error(`❌ Ошибка обработки ${file}:`, error);
          errors++;
        }
      }

      res.json({
        message: `Оптимизация завершена`,
        processed,
        errors,
        totalFiles: files.length,
        totalSavingsKB: Math.round(totalSavings / 1024),
        totalSavingsMB: (totalSavings / (1024 * 1024)).toFixed(2)
      });

    } catch (error) {
      console.error("Ошибка массовой оптимизации:", error);
      res.status(500).json({ message: "Ошибка при оптимизации изображений" });
    }
  });

  // Upload endpoint with automatic image optimization
  app.post('/api/upload', isAuthenticated, upload.single('image'), processUploadedImage, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Return optimized image URL instead of original
      const imageUrl = req.file.optimizedPath || `/uploads/images/${req.file.filename}`;
      const thumbnailUrl = req.file.thumbnailPath || imageUrl;
      
      res.json({ 
        imageUrl,
        thumbnailUrl,
        originalUrl: `/uploads/images/${req.file.filename}`,
        message: "Image uploaded and optimized successfully"
      });
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

      const rawData = req.body;
      
      console.log('Category create - Raw data received:', JSON.stringify(rawData, null, 2));
      
      // Parse only the fields that are in the schema, but keep multilingual fields
      const schemaData = insertCategorySchema.parse(rawData);
      
      // Add multilingual fields that aren't in the schema but should be saved
      const multilingualFields: any = {};
      const supportedLanguages = ['en', 'he', 'ar'];
      
      // Add multilingual name and description fields for categories
      supportedLanguages.forEach(lang => {
        if ((rawData as any)[`name_${lang}`] !== undefined) {
          multilingualFields[`name_${lang}`] = (rawData as any)[`name_${lang}`];
        }
        if ((rawData as any)[`description_${lang}`] !== undefined) {
          multilingualFields[`description_${lang}`] = (rawData as any)[`description_${lang}`];
        }
      });
      
      const categoryData = { ...schemaData, ...multilingualFields };
      
      console.log('Category create - Final data for storage:', JSON.stringify(categoryData, null, 2));
      
      const category = await storage.createCategory(categoryData);
      
      console.log('Category create - Result from storage:', JSON.stringify(category, null, 2));
      
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
      const rawData = req.body;
      
      console.log('Category update - Raw data received:', JSON.stringify(rawData, null, 2));
      
      // Parse only the fields that are in the schema, but keep multilingual fields
      const schemaData = insertCategorySchema.partial().parse(rawData);
      
      // Add multilingual fields that aren't in the schema but should be saved
      const multilingualFields: any = {};
      const supportedLanguages = ['en', 'he', 'ar'];
      
      // Add multilingual name and description fields for categories
      supportedLanguages.forEach(lang => {
        if ((rawData as any)[`name_${lang}`] !== undefined) {
          multilingualFields[`name_${lang}`] = (rawData as any)[`name_${lang}`];
        }
        if ((rawData as any)[`description_${lang}`] !== undefined) {
          multilingualFields[`description_${lang}`] = (rawData as any)[`description_${lang}`];
        }
      });
      
      const categoryData = { ...schemaData, ...multilingualFields };
      
      console.log('Category update - Final data for storage:', JSON.stringify(categoryData, null, 2));
      
      const category = await storage.updateCategory(id, categoryData);
      
      console.log('Category update - Result from storage:', JSON.stringify(category, null, 2));
      
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
      let query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      // Fix encoding issues with UTF-8
      try {
        query = decodeURIComponent(query);
      } catch (e) {
        // If decoding fails, use the original query
      }
      
      let products = await storage.searchProducts(query);
      
      // Filter out unavailable products for non-admin users
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

      // Skip cache after update - always get fresh data
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
      
      // Clear products cache when new product is created
      clearCachePattern('admin-products');
      
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
      
      // Clear products cache when product is updated
      clearCachePattern('admin-products');
      
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
      
      console.log('Product update - Raw data received:', JSON.stringify(rawData, null, 2));
      
      // Handle empty discount values - convert empty strings to null
      if (rawData.discountValue === "") {
        rawData.discountValue = null;
      }
      if (rawData.discountType === "") {
        rawData.discountType = null;
      }
      
      // Parse only the fields that are in the schema, but keep multilingual fields
      const schemaData = insertProductSchema.partial().parse(rawData);
      
      // Add multilingual fields that aren't in the schema but should be saved
      const multilingualFields: any = {};
      const supportedLanguages = ['en', 'he', 'ar'];
      
      // Add multilingual name, description, and imageUrl fields
      supportedLanguages.forEach(lang => {
        if ((rawData as any)[`name_${lang}`] !== undefined) {
          multilingualFields[`name_${lang}`] = (rawData as any)[`name_${lang}`];
        }
        if ((rawData as any)[`description_${lang}`] !== undefined) {
          multilingualFields[`description_${lang}`] = (rawData as any)[`description_${lang}`];
        }
        if ((rawData as any)[`ingredients_${lang}`] !== undefined) {
          multilingualFields[`ingredients_${lang}`] = (rawData as any)[`ingredients_${lang}`];
        }
        if ((rawData as any)[`imageUrl_${lang}`] !== undefined) {
          multilingualFields[`imageUrl_${lang}`] = (rawData as any)[`imageUrl_${lang}`];
        }
      });
      
      const productData = { ...schemaData, ...multilingualFields };
      
      console.log('Product update - Final data for storage:', JSON.stringify(productData, null, 2));
      
      const product = await storage.updateProduct(id, productData);
      
      console.log('Product update - Result from storage:', JSON.stringify(product, null, 2));
      
      // Clear cache after update
      clearCachePattern('admin-products');
      clearCachePattern('products');
      
      // Add cache-busting headers
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
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

  app.delete('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const id = parseInt(req.params.id);
      
      console.log(`=== Product Deletion Debug ===`);
      console.log(`Attempting to delete product with ID: ${id}`);
      
      // Check if product exists
      const existingProduct = await storage.getProductById(id);
      if (!existingProduct) {
        console.log(`Product with ID ${id} not found`);
        return res.status(404).json({ message: "Product not found" });
      }
      
      console.log(`Found product: ${existingProduct.name}`);
      
      // Delete the product
      await storage.deleteProduct(id);
      
      console.log(`Successfully deleted product with ID: ${id}`);
      
      // Clear products cache
      clearCachePattern('admin-products');
      clearCachePattern('products');
      
      res.json({ message: "Product deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting product:", error);
      
      // Check for foreign key constraint violation
      if (error.code === '23503' && error.constraint === 'order_items_product_id_products_id_fk') {
        return res.status(409).json({ 
          message: "Cannot delete product: it is used in existing orders",
          errorCode: "PRODUCT_IN_USE"
        });
      }
      
      res.status(500).json({ message: "Failed to delete product" });
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
      const { items, totalAmount, guestInfo, language } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Invalid order items" });
      }

      if (!guestInfo || !guestInfo.firstName || !guestInfo.lastName || !guestInfo.phone || !guestInfo.address) {
        return res.status(400).json({ message: "Guest information is required" });
      }

      // Generate unique tokens for guest order access and claiming
      const guestAccessToken = randomBytes(32).toString('hex');
      const guestClaimToken = randomBytes(32).toString('hex');
      const guestAccessTokenExpires = new Date();
      guestAccessTokenExpires.setDate(guestAccessTokenExpires.getDate() + 30); // 30 days

      // Create order with guest information and tokens
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
        paymentMethod: guestInfo.paymentMethod,
        guestAccessToken,
        guestAccessTokenExpires,
        guestClaimToken,
        orderLanguage: language || 'ru' // Default to Russian if not specified
      };

      const orderItems = items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity.toString(),
        pricePerKg: item.pricePerKg.toString(),
        totalPrice: item.totalPrice.toString(),
        orderId: 0
      }));

      const order = await storage.createOrder(orderData, orderItems);
      
      // Отправить push-уведомления админам и работникам о новом гостевом заказе
      try {
        await PushNotificationService.notifyNewOrder(
          order.id,
          orderData.guestName || 'Гость',
          totalAmount.toString(),
          true // isGuest = true
        );
      } catch (pushError) {
        console.error('Error sending new order push notification:', pushError);
        // Не прерывать создание заказа если уведомление не отправилось
      }

      // Отправить email уведомления о новом заказе
      try {
        const currentStoreSettings = await storage.getStoreSettings();
        if (currentStoreSettings?.emailNotificationsEnabled && currentStoreSettings?.orderNotificationEmail) {
          // Configure email service with current settings
          emailService.updateSettings({
            useSendgrid: currentStoreSettings.useSendgrid || false,
            smtpHost: currentStoreSettings.smtpHost || undefined,
            smtpPort: currentStoreSettings.smtpPort || undefined,
            smtpSecure: currentStoreSettings.smtpSecure || undefined,
            smtpUser: currentStoreSettings.smtpUser || undefined,
            smtpPassword: currentStoreSettings.smtpPassword || undefined,
            sendgridApiKey: currentStoreSettings.sendgridApiKey || undefined
          });

          // Fetch product details for email (optimized)
          const productIds = orderItems.map((item: any) => item.productId);
          const productsMap = await storage.getProductsByIds(productIds)
            .then(products => new Map(products.map(p => [p.id, p])));
            
          const itemsWithProducts = orderItems.map((item: any) => {
            const product = productsMap.get(item.productId);
            return {
              productId: item.productId,
              quantity: parseInt(item.quantity),
              pricePerKg: parseFloat(item.pricePerKg),
              totalPrice: parseFloat(item.totalPrice),
              product: product ? {
                name: product.name,
                unit: product.unit || 'кг'
              } : null
            };
          });

          await sendNewOrderEmail(
            order.id,
            orderData.guestName || 'Гость',
            totalAmount.toString(),
            {
              customerPhone: guestInfo.phone,
              deliveryAddress: guestInfo.address,
              deliveryDate: guestInfo.deliveryDate,
              deliveryTime: guestInfo.deliveryTime,
              paymentMethod: guestInfo.paymentMethod,
              customerNotes: guestInfo.customerNotes,
              status: 'pending',
              items: itemsWithProducts
            },
            currentStoreSettings.orderNotificationEmail,
            currentStoreSettings.orderNotificationFromEmail || 'noreply@ordis.co.il',
            currentStoreSettings.orderNotificationFromName || 'eDAHouse Store',
            currentStoreSettings.defaultLanguage || 'ru',
            currentStoreSettings.storeName || 'eDAHouse',
            req.get('host') ? `${req.protocol}://${req.get('host')}` : undefined
          );

          // Send guest order confirmation email only if email is provided
          if (guestInfo.email && guestInfo.email.trim()) {
            const fromEmail = currentStoreSettings.orderNotificationFromEmail || 'noreply@ordis.co.il';
            const fromName = currentStoreSettings.orderNotificationFromName || 'eDAHouse Store';
            const storeName = currentStoreSettings.storeName || 'eDAHouse';
            const baseUrl = req.get('host') ? `${req.protocol}://${req.get('host')}` : undefined;
            
            await sendGuestOrderEmail(
              order.id,
              orderData.guestName || 'Гость',
              guestInfo.email,
              totalAmount.toString(),
              {
                customerPhone: guestInfo.phone,
                deliveryAddress: guestInfo.address,
                deliveryDate: guestInfo.deliveryDate,
                deliveryTime: guestInfo.deliveryTime,
                paymentMethod: guestInfo.paymentMethod,
                customerNotes: guestInfo.customerNotes,
                status: 'pending',
                items: itemsWithProducts
              },
              guestAccessToken,
              guestClaimToken,
              fromEmail,
              fromName,
              orderData.orderLanguage || 'ru',
              storeName,
              baseUrl
            );
          }
        }
      } catch (emailError) {
        console.error('Error sending email notifications:', emailError);
        // Не прерывать создание заказа если email уведомления не отправились
      }

      // Send Facebook Conversions API Purchase event
      try {
        const currentStoreSettings = await storage.getStoreSettings();
        
        if (
          currentStoreSettings?.facebookConversionsApiEnabled &&
          currentStoreSettings?.facebookPixelId &&
          currentStoreSettings?.facebookAccessToken
        ) {
          const fbOrderData: FacebookOrderData = {
            orderId: order.id,
            email: guestInfo.email,
            phone: guestInfo.phone,
            firstName: guestInfo.firstName,
            lastName: guestInfo.lastName,
            totalAmount: typeof totalAmount === 'string' ? parseFloat(totalAmount) : totalAmount,
            currency: 'ILS',
            items: items.map((item: any) => ({
              productId: item.productId,
              quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
              price: typeof item.pricePerKg === 'string' ? parseFloat(item.pricePerKg) : item.pricePerKg,
            })),
            eventSourceUrl: req.get('origin') || req.get('referer') || `${req.protocol}://${req.get('host')}`,
            clientIp: req.ip || req.headers['x-forwarded-for'] as string,
            clientUserAgent: req.headers['user-agent'],
            fbp: req.cookies?._fbp,
            fbc: req.cookies?._fbc || (req.query?.fbclid ? `fb.1.${Date.now()}.${req.query.fbclid}` : undefined),
          };

          await sendFacebookPurchaseEvent(
            currentStoreSettings.facebookPixelId,
            currentStoreSettings.facebookAccessToken,
            fbOrderData
          );
        }
      } catch (fbError) {
        console.error('Error sending Facebook Conversions API event:', fbError);
        // Don't interrupt order creation if Facebook event fails
      }
      
      // Return order with tokens for guest access
      res.status(201).json({
        orderId: order.id,
        guestAccessToken,
        guestClaimToken,
        orderLanguage: orderData.orderLanguage
      });
    } catch (error) {
      console.error("Error creating guest order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // API endpoint to send guest order email after order creation
  app.post('/api/orders/guest/:token/send-email', async (req, res) => {
    try {
      const { token } = req.params;
      
      // Validate email using Zod schema
      const emailSchema = z.object({
        email: z.string().email("Invalid email format").min(1, "Email is required")
      });
      
      const validationResult = emailSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationResult.error.errors 
        });
      }
      
      const { email } = validationResult.data;

      // Find order by guest access token
      const order = await storage.getGuestOrderByToken(token);
      if (!order) {
        return res.status(404).json({ message: "Order not found or token expired" });
      }

      // Order already includes items with product details
      const itemsWithProducts = order.items.map(item => ({
        productId: item.productId,
        quantity: parseInt(item.quantity),
        pricePerKg: parseFloat(item.pricePerKg),
        totalPrice: parseFloat(item.totalPrice),
        product: item.product ? {
          name: item.product.name,
          unit: item.product.unit || 'кг'
        } : null
      }));

      // Get store settings for email configuration
      const currentStoreSettings = await storage.getStoreSettings();
      if (!currentStoreSettings?.emailNotificationsEnabled) {
        return res.status(503).json({ message: "Email service is not available" });
      }

      // Configure email service
      emailService.updateSettings({
        useSendgrid: currentStoreSettings.useSendgrid || false,
        smtpHost: currentStoreSettings.smtpHost || undefined,
        smtpPort: currentStoreSettings.smtpPort || undefined,
        smtpSecure: currentStoreSettings.smtpSecure || undefined,
        smtpUser: currentStoreSettings.smtpUser || undefined,
        smtpPassword: currentStoreSettings.smtpPassword || undefined,
        sendgridApiKey: currentStoreSettings.sendgridApiKey || undefined
      });

      // Send email
      const fromEmail = currentStoreSettings.orderNotificationFromEmail || 'noreply@ordis.co.il';
      const fromName = currentStoreSettings.orderNotificationFromName || 'eDAHouse Store';
      const storeName = currentStoreSettings.storeName || 'eDAHouse';
      const baseUrl = req.get('host') ? `${req.protocol}://${req.get('host')}` : undefined;
      
      await sendGuestOrderEmail(
        order.id,
        order.guestName || 'Гость',
        email.trim(),
        order.totalAmount.toString(),
        {
          customerPhone: order.guestPhone,
          deliveryAddress: order.deliveryAddress,
          deliveryDate: order.deliveryDate,
          deliveryTime: order.deliveryTime,
          paymentMethod: order.paymentMethod,
          customerNotes: order.customerNotes,
          status: order.status,
          items: itemsWithProducts
        },
        order.guestAccessToken,
        order.guestClaimToken,
        fromEmail,
        fromName,
        order.orderLanguage || 'ru',
        storeName,
        baseUrl
      );

      res.json({ success: true, message: "Email sent successfully" });
    } catch (error) {
      console.error("Error sending guest order email:", error);
      res.status(500).json({ message: "Failed to send email" });
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

      const { items, language, ...orderData } = req.body;
      
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
      
      // Save order language
      processedOrderData.orderLanguage = language || 'ru'; // Default to Russian if not specified
      
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
      
      // Отправить push-уведомления админам и работникам о новом заказе
      try {
        const customerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Пользователь';
        await PushNotificationService.notifyNewOrder(
          order.id,
          customerName,
          validatedData.totalAmount?.toString() || '0',
          false // isGuest = false
        );
      } catch (pushError) {
        console.error('Error sending new order push notification:', pushError);
        // Не прерывать создание заказа если уведомление не отправилось
      }

      // Отправить email уведомления о новом заказе
      try {
        const currentStoreSettings = await storage.getStoreSettings();
        if (currentStoreSettings?.emailNotificationsEnabled && currentStoreSettings?.orderNotificationEmail) {
          // Configure email service with current settings
          emailService.updateSettings({
            useSendgrid: currentStoreSettings.useSendgrid || false,
            smtpHost: currentStoreSettings.smtpHost || undefined,
            smtpPort: currentStoreSettings.smtpPort || undefined,
            smtpSecure: currentStoreSettings.smtpSecure || undefined,
            smtpUser: currentStoreSettings.smtpUser || undefined,
            smtpPassword: currentStoreSettings.smtpPassword || undefined,
            sendgridApiKey: currentStoreSettings.sendgridApiKey || undefined
          });

          // Fetch product details for email (optimized)
          const productIds = validatedData.items.map((item: any) => item.productId);
          const productsMap = await storage.getProductsByIds(productIds)
            .then(products => new Map(products.map(p => [p.id, p])));
            
          const itemsWithProducts = validatedData.items.map((item: any) => {
            const product = productsMap.get(item.productId);
            return {
              productId: item.productId,
              quantity: parseInt(item.quantity),
              pricePerKg: parseFloat(item.pricePerKg),
              totalPrice: parseFloat(item.totalPrice),
              product: product ? {
                name: product.name,
                unit: product.unit || 'кг'
              } : null
            };
          });

          const customerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Пользователь';
          await sendNewOrderEmail(
            order.id,
            customerName,
            validatedData.totalAmount?.toString() || '0',
            {
              customerPhone: orderData.customerPhone || user?.phone,
              deliveryAddress: orderData.deliveryAddress,
              deliveryDate: orderData.deliveryDate,
              deliveryTime: orderData.deliveryTime,
              paymentMethod: orderData.paymentMethod,
              customerNotes: orderData.customerNotes,
              status: 'pending',
              items: itemsWithProducts
            },
            currentStoreSettings.orderNotificationEmail,
            currentStoreSettings.orderNotificationFromEmail || 'noreply@ordis.co.il',
            currentStoreSettings.orderNotificationFromName || 'eDAHouse Store',
            currentStoreSettings.defaultLanguage || 'ru',
            currentStoreSettings.storeName || 'eDAHouse',
            req.get('host') ? `${req.protocol}://${req.get('host')}` : undefined
          );
        }
      } catch (emailError) {
        console.error('Error sending new order email notification:', emailError);
        // Не прерывать создание заказа если email уведомление не отправилось
      }

      // Send Facebook Conversions API Purchase event
      try {
        const currentStoreSettings = await storage.getStoreSettings();
        
        if (
          currentStoreSettings?.facebookConversionsApiEnabled &&
          currentStoreSettings?.facebookPixelId &&
          currentStoreSettings?.facebookAccessToken
        ) {
          const fbOrderData: FacebookOrderData = {
            orderId: order.id,
            email: user?.email || undefined,
            phone: orderData.customerPhone || user?.phone,
            firstName: user?.firstName || undefined,
            lastName: user?.lastName || undefined,
            totalAmount: typeof validatedData.totalAmount === 'string' ? parseFloat(validatedData.totalAmount) : validatedData.totalAmount,
            currency: 'ILS',
            items: validatedData.items.map((item: any) => ({
              productId: item.productId,
              quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
              price: typeof item.pricePerKg === 'string' ? parseFloat(item.pricePerKg) : item.pricePerKg,
            })),
            eventSourceUrl: req.get('origin') || req.get('referer') || `${req.protocol}://${req.get('host')}`,
            clientIp: req.ip || req.headers['x-forwarded-for'] as string,
            clientUserAgent: req.headers['user-agent'],
            fbp: req.cookies?._fbp,
            fbc: req.cookies?._fbc || (req.query?.fbclid ? `fb.1.${Date.now()}.${req.query.fbclid}` : undefined),
          };

          await sendFacebookPurchaseEvent(
            currentStoreSettings.facebookPixelId,
            currentStoreSettings.facebookAccessToken,
            fbOrderData
          );
        }
      } catch (fbError) {
        console.error('Error sending Facebook Conversions API event:', fbError);
        // Don't interrupt order creation if Facebook event fails
      }
      
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
      
      let order;
      
      // If status is cancelled and cancellation reason is provided, update order with reason
      if (status === 'cancelled' && cancellationReason) {
        order = await storage.updateOrder(id, { status, cancellationReason });
      } else {
        order = await storage.updateOrderStatus(id, status);
      }
      
      // Send push notification to customer about status change
      if (order && order.userId && order.userId !== 'guest') {
        try {
          // Get user's preferred language (you may need to implement this)
          const customerUser = await storage.getUser(order.userId);
          const language = customerUser?.preferredLanguage || 'ru';
          
          await PushNotificationService.notifyOrderStatus(
            order.userId,
            order.id,
            status,
            language
          );
        } catch (pushError) {
          console.error('Error sending push notification:', pushError);
          // Don't fail the order update if push notification fails
        }
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Guest order viewing by token
  app.get('/api/orders/guest/:token', async (req, res) => {
    try {
      const { token } = req.params;
      
      // Validate token format
      if (!token || token.length < 20) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Get order by guest access token
      const orderWithItems = await storage.getGuestOrderByToken(token);
      
      if (!orderWithItems) {
        return res.status(404).json({ message: "Order not found or token expired" });
      }
      
      res.json(orderWithItems);
    } catch (error) {
      console.error("Error fetching guest order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  // Claim guest order after registration  
  app.post('/api/orders/claim', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { claimToken } = req.body;
      
      if (!claimToken || typeof claimToken !== 'string') {
        return res.status(400).json({ message: "Claim token is required" });
      }
      
      // Find order by claim token and attach to user
      const claimedOrder = await storage.claimGuestOrder(claimToken, userId);
      
      if (!claimedOrder) {
        return res.status(404).json({ message: "Invalid or expired claim token" });
      }
      
      res.json({ message: "Order claimed successfully", orderId: claimedOrder.id });
    } catch (error) {
      console.error("Error claiming guest order:", error);
      res.status(500).json({ message: "Failed to claim order" });
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

  // Dynamic PWA manifest endpoint
  app.get('/api/manifest', async (req, res) => {
    try {
      const settings = await storage.getStoreSettings();
      const acceptLanguage = req.headers['accept-language'];
      let currentLang = 'ru'; // default
      
      // Extract preferred language from Accept-Language header
      if (acceptLanguage) {
        if (acceptLanguage.includes('en')) currentLang = 'en';
        else if (acceptLanguage.includes('he')) currentLang = 'he';
        else if (acceptLanguage.includes('ar')) currentLang = 'ar';
      }
      
      // Get localized PWA name and description
      const getPwaField = (field: string) => {
        if (currentLang === 'ru') return (settings as any)?.[field] || '';
        const langField = `${field}${currentLang.charAt(0).toUpperCase() + currentLang.slice(1)}`;
        return (settings as any)?.[langField] || (settings as any)?.[field] || '';
      };
      
      const manifest = {
        name: getPwaField('pwaName') || 'eDAHouse',
        short_name: getPwaField('pwaName')?.split(' ')[0] || 'eDAHouse',
        description: getPwaField('pwaDescription') || 'Готовые блюда с доставкой',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#f97316',
        orientation: 'portrait-primary',
        scope: '/',
        categories: ['food', 'shopping', 'lifestyle'],
        lang: currentLang,
        icons: [
          {
            src: settings?.pwaIcon || '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: settings?.pwaIcon || '/icons/icon-96x96.png', 
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: settings?.pwaIcon || '/icons/icon-128x128.png',
            sizes: '128x128', 
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: settings?.pwaIcon || '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png', 
            purpose: 'any maskable'
          },
          {
            src: settings?.pwaIcon || '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: settings?.pwaIcon || '/icons/icon-192x192.png',
            sizes: '192x192', 
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: settings?.pwaIcon || '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: settings?.pwaIcon || '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png', 
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: currentLang === 'en' ? 'Product Catalog' : 
                  currentLang === 'he' ? 'קטלוג מוצרים' :
                  currentLang === 'ar' ? 'كتالوج المنتجات' : 'Каталог продуктов',
            short_name: currentLang === 'en' ? 'Catalog' :
                       currentLang === 'he' ? 'קטלוג' :
                       currentLang === 'ar' ? 'كتالوج' : 'Каталог',
            description: currentLang === 'en' ? 'View all products' :
                        currentLang === 'he' ? 'צפה בכל המוצרים' :
                        currentLang === 'ar' ? 'عرض جميع المنتجات' : 'Просмотр всех продуктов',
            url: '/',
            icons: [{ src: settings?.pwaIcon || '/icons/icon-96x96.png', sizes: '96x96' }]
          },
          {
            name: currentLang === 'en' ? 'Shopping Cart' :
                  currentLang === 'he' ? 'עגלת קניות' :
                  currentLang === 'ar' ? 'سلة التسوق' : 'Корзина',
            short_name: currentLang === 'en' ? 'Cart' :
                       currentLang === 'he' ? 'עגלה' :
                       currentLang === 'ar' ? 'سلة' : 'Корзина',
            description: currentLang === 'en' ? 'View shopping cart' :
                        currentLang === 'he' ? 'צפה בעגלת הקניות' :
                        currentLang === 'ar' ? 'عرض سلة التسوق' : 'Просмотр корзины покупок',
            url: '/checkout',
            icons: [{ src: settings?.pwaIcon || '/icons/icon-96x96.png', sizes: '96x96' }]
          }
        ]
      };

      res.setHeader('Content-Type', 'application/manifest+json');
      res.json(manifest);
    } catch (error) {
      console.error('Error generating PWA manifest:', error);
      res.status(500).json({ message: 'Failed to generate PWA manifest' });
    }
  });

  // Dynamic favicon endpoint with caching
  app.get('/api/favicon', async (req, res) => {
    try {
      // Set aggressive caching headers for favicon
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.setHeader('Expires', new Date(Date.now() + 3600000).toUTCString());
      
      const settings = await storage.getStoreSettings();
      
      if (settings?.pwaIcon) {
        // Redirect to the uploaded PWA icon
        res.redirect(301, settings.pwaIcon); // Permanent redirect
      } else {
        // Fallback to default favicon
        res.redirect(301, '/favicon.ico'); // Permanent redirect
      }
    } catch (error) {
      console.error('Error serving favicon:', error);
      res.redirect(301, '/favicon.ico');
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

  // Create order from admin panel
  app.post('/api/admin/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { 
        clientType, 
        clientId, 
        newClientData, 
        guestData,
        deliveryAddress,
        deliveryDate,
        deliveryTime,
        deliveryNotes,
        paymentMethod,
        items,
        discountType,
        discountAmount,
        discountReason
      } = req.body;

      let finalUserId = null;

      // Handle client creation/selection
      if (clientType === 'existing') {
        finalUserId = clientId;
      } else if (clientType === 'new') {
        // Create new user account with bcrypt hashing
        const hashedPassword = await bcrypt.hash('123456', 10); // Default password
        const newUser = await storage.createUser({
          username: newClientData.email,
          email: newClientData.email,
          firstName: newClientData.firstName,
          lastName: newClientData.lastName,
          phone: newClientData.phone,
          password: hashedPassword,
          role: 'customer'
        });
        finalUserId = newUser.id;
      }
      // For guest orders, finalUserId stays null

      // Calculate totals - convert strings to numbers
      const subtotal = items.reduce((sum: number, item: any) => {
        const totalPrice = typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) : item.totalPrice;
        return sum + (totalPrice || 0);
      }, 0);
      
      const orderDiscountAmount = discountAmount ? 
        (typeof discountAmount === 'string' ? parseFloat(discountAmount) : discountAmount) : 0;
        
      const settings = await storage.getStoreSettings();
      
      let deliveryFee = 0;
      if (settings?.deliveryFee && settings?.freeDeliveryFrom) {
        const totalAfterDiscount = subtotal - orderDiscountAmount;
        deliveryFee = totalAfterDiscount >= settings.freeDeliveryFrom ? 0 : settings.deliveryFee;
      }

      const totalAmount = subtotal - orderDiscountAmount + deliveryFee;

      // Create order
      const orderData = {
        userId: finalUserId,
        guestName: clientType === 'guest' ? `${guestData.firstName} ${guestData.lastName}` : null,
        guestPhone: clientType === 'guest' ? guestData.phone : null,
        status: 'pending',
        totalAmount,
        deliveryAddress,
        deliveryDate,
        deliveryTime,
        deliveryNotes: deliveryNotes || null,
        paymentMethod,
        discountType: discountType || null,
        discountAmount: orderDiscountAmount || null,
        discountReason: discountReason || null,
        createdAt: new Date()
      };

      const order = await storage.createOrder(orderData);

      // Create order items - convert strings to numbers
      for (const item of items) {
        await storage.createOrderItem({
          orderId: order.id,
          productId: typeof item.productId === 'string' ? parseInt(item.productId) : item.productId,
          quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
          weight: item.weight ? (typeof item.weight === 'string' ? parseFloat(item.weight) : item.weight) : null,
          unitPrice: typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice,
          totalPrice: typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) : item.totalPrice
        });
      }

      // Clear orders cache
      clearCachePattern('admin-orders');

      // Send Facebook Conversions API Purchase event
      try {
        const currentStoreSettings = await storage.getStoreSettings();
        
        if (
          currentStoreSettings?.facebookConversionsApiEnabled &&
          currentStoreSettings?.facebookPixelId &&
          currentStoreSettings?.facebookAccessToken
        ) {
          // Get user data if not a guest order
          let customerUser = null;
          if (finalUserId) {
            customerUser = await storage.getUser(finalUserId);
          }

          const fbOrderData: FacebookOrderData = {
            orderId: order.id,
            email: customerUser?.email || undefined,
            phone: clientType === 'guest' ? guestData.phone : customerUser?.phone,
            firstName: clientType === 'guest' ? guestData.firstName : customerUser?.firstName,
            lastName: clientType === 'guest' ? guestData.lastName : customerUser?.lastName,
            totalAmount: totalAmount,
            currency: 'ILS',
            items: items.map((item: any) => ({
              productId: typeof item.productId === 'string' ? parseInt(item.productId) : item.productId,
              quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
              price: typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice,
            })),
            eventSourceUrl: req.get('origin') || req.get('referer') || `${req.protocol}://${req.get('host')}`,
            clientIp: req.ip || req.headers['x-forwarded-for'] as string,
            clientUserAgent: req.headers['user-agent'],
            fbp: req.cookies?._fbp,
            fbc: req.cookies?._fbc || (req.query?.fbclid ? `fb.1.${Date.now()}.${req.query.fbclid}` : undefined),
          };

          await sendFacebookPurchaseEvent(
            currentStoreSettings.facebookPixelId,
            currentStoreSettings.facebookAccessToken,
            fbOrderData
          );
        }
      } catch (fbError) {
        console.error('Error sending Facebook Conversions API event:', fbError);
        // Don't interrupt order creation if Facebook event fails
      }
      
      res.json({ 
        success: true, 
        order: { 
          ...order, 
          items 
        } 
      });
    } catch (error) {
      console.error("Error creating admin order:", error);
      res.status(500).json({ message: "Failed to create order" });
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

      // Create cache key for this specific query
      const cacheKey = `admin-orders-${page}-${limit}-${search}-${status}-${sortField}-${sortDirection}`;
      
      // Try to get from cache first
      let result = getCache(cacheKey);
      if (!result) {
        result = await storage.getOrdersPaginated({
          page,
          limit,
          search,
          status,
          sortField,
          sortDirection
        });
        
        // Cache for 1 minute (orders change frequently)
        setCache(cacheKey, result, 60);
      }

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

      // Create cache key for this specific query
      const cacheKey = `admin-users-${page}-${limit}-${search}-${status}-${sortField}-${sortDirection}`;
      
      // Try to get from cache first
      let result = getCache(cacheKey);
      if (!result) {
        result = await storage.getUsersPaginated({
          page,
          limit,
          search,
          status,
          sortField,
          sortDirection
        });
        
        // Cache for 3 minutes
        setCache(cacheKey, result, 180);
      }

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
      
      // Clear users cache when new user is created
      clearCachePattern('admin-users');
      
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
      const user = req.user; // Use user from session instead of additional DB query
      
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

  // Check user deletion impact
  app.get('/api/admin/users/:id/deletion-impact', isAuthenticated, async (req: any, res) => {
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

  // Admin-only route to delete a user
  app.delete('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user; // Use user from session instead of additional DB query
      
      if (!user || (user.role !== "admin" && user.role !== "worker")) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const { forceDelete } = req.query;
      
      console.log('DELETE /api/admin/users/:id called with:', { id, forceDelete, currentUser: user.id });
      
      // Prevent deleting yourself
      if (id === user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      await storage.deleteUser(id, forceDelete === 'true');
      console.log('User deleted successfully:', id);
      
      // Clear users cache when user is deleted
      clearCachePattern('admin-users');
      
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
      
      // URL fields that should allow empty strings (for deletion)
      const urlFields = [
        'logoUrl', 'logoUrl_en', 'logoUrl_he', 'logoUrl_ar',
        'bannerImageUrl', 'bannerImageUrl_en', 'bannerImageUrl_he', 'bannerImageUrl_ar',
        'cartBannerImage', 'cartBannerImage_en', 'cartBannerImage_he', 'cartBannerImage_ar',
        'bottomBanner1Url', 'bottomBanner1Url_en', 'bottomBanner1Url_he', 'bottomBanner1Url_ar',
        'bottomBanner2Url', 'bottomBanner2Url_en', 'bottomBanner2Url_he', 'bottomBanner2Url_ar',
        'slide1Image', 'slide2Image', 'slide3Image', 'slide4Image', 'slide5Image'
      ];
      
      // Include non-null values and allow empty strings for URL fields
      Object.keys(body).forEach(key => {
        if (body[key] !== null && body[key] !== undefined) {
          // Allow empty strings for URL fields, but not for other fields
          // Special handling for slider fields - always include them
          if (urlFields.includes(key) || body[key] !== '' || key.startsWith('slider') || key.startsWith('slide')) {
            themeData[key] = body[key];
          }
        }
      });
      
      console.log("Theme update data:", themeData);
      console.log("Slider data in request:", {
        sliderAutoplay: body.sliderAutoplay,
        sliderSpeed: body.sliderSpeed,
        sliderEffect: body.sliderEffect,
        slide1Image: body.slide1Image,
        slide1Title: body.slide1Title,
        slide2Image: body.slide2Image,
        slide3Image: body.slide3Image,
        slide4Image: body.slide4Image,
        slide5Image: body.slide5Image
      });
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
          updateFields.push(`banner_button_text = '${(themeData.bannerButtonText || 'Смотреть каталог').replace(/'/g, "''")}'`);
        }
        if (themeData.bannerButtonLink !== undefined) {
          updateFields.push(`banner_button_link = '${(themeData.bannerButtonLink || '#categories').replace(/'/g, "''")}'`);
        }
        
        // Sync modern style info blocks settings
        if (themeData.headerStyle === 'modern' || theme.headerStyle === 'modern') {
          if (themeData.modernBlock1Icon !== undefined) updateFields.push(`modern_block1_icon = '${(themeData.modernBlock1Icon || '').replace(/'/g, "''")}'`);
          if (themeData.modernBlock1Text !== undefined) updateFields.push(`modern_block1_text = '${(themeData.modernBlock1Text || '').replace(/'/g, "''")}'`);
          if (themeData.modernBlock2Icon !== undefined) updateFields.push(`modern_block2_icon = '${(themeData.modernBlock2Icon || '').replace(/'/g, "''")}'`);
          if (themeData.modernBlock2Text !== undefined) updateFields.push(`modern_block2_text = '${(themeData.modernBlock2Text || '').replace(/'/g, "''")}'`);
          if (themeData.modernBlock3Icon !== undefined) updateFields.push(`modern_block3_icon = '${(themeData.modernBlock3Icon || '').replace(/'/g, "''")}'`);
          if (themeData.modernBlock3Text !== undefined) updateFields.push(`modern_block3_text = '${(themeData.modernBlock3Text || '').replace(/'/g, "''")}'`);
        }
        
        // Sync logo and banner images (CRITICAL FOR DISPLAY) - including multilingual versions
        if (themeData.logoUrl !== undefined) updateFields.push(`logo_url = '${themeData.logoUrl || ''}'`);
        if (themeData.bannerImageUrl !== undefined) updateFields.push(`banner_image_url = '${themeData.bannerImageUrl || ''}'`);
        
        // Sync multilingual logo URLs
        if ((themeData as any).logoUrl_en !== undefined) updateFields.push(`logo_url_en = '${(themeData as any).logoUrl_en || ''}'`);
        if ((themeData as any).logoUrl_he !== undefined) updateFields.push(`logo_url_he = '${(themeData as any).logoUrl_he || ''}'`);
        if ((themeData as any).logoUrl_ar !== undefined) updateFields.push(`logo_url_ar = '${(themeData as any).logoUrl_ar || ''}'`);
        
        // Sync multilingual banner URLs
        if ((themeData as any).bannerImageUrl_en !== undefined) updateFields.push(`banner_image_url_en = '${(themeData as any).bannerImageUrl_en || ''}'`);
        if ((themeData as any).bannerImageUrl_he !== undefined) updateFields.push(`banner_image_url_he = '${(themeData as any).bannerImageUrl_he || ''}'`);
        if ((themeData as any).bannerImageUrl_ar !== undefined) updateFields.push(`banner_image_url_ar = '${(themeData as any).bannerImageUrl_ar || ''}'`);
        
        // Sync cart banner settings
        if (themeData.showCartBanner !== undefined) updateFields.push(`show_cart_banner = ${themeData.showCartBanner}`);
        if (themeData.cartBannerType !== undefined) updateFields.push(`cart_banner_type = '${themeData.cartBannerType || 'text'}'`);
        if (themeData.cartBannerImage !== undefined) updateFields.push(`cart_banner_image = '${(themeData.cartBannerImage || '').replace(/'/g, "''")}'`);
        if (themeData.cartBannerText !== undefined) updateFields.push(`cart_banner_text = '${(themeData.cartBannerText || '').replace(/'/g, "''")}'`);
        if (themeData.cartBannerTextEn !== undefined) updateFields.push(`cart_banner_text_en = '${(themeData.cartBannerTextEn || '').replace(/'/g, "''")}'`);
        if (themeData.cartBannerTextHe !== undefined) updateFields.push(`cart_banner_text_he = '${(themeData.cartBannerTextHe || '').replace(/'/g, "''")}'`);
        if (themeData.cartBannerTextAr !== undefined) updateFields.push(`cart_banner_text_ar = '${(themeData.cartBannerTextAr || '').replace(/'/g, "''")}'`);
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
        if (themeData.whatsappPhone !== undefined) updateFields.push(`whatsapp_phone_number = '${(themeData.whatsappPhone || '').replace(/'/g, "''")}'`);
        if (themeData.whatsappMessage !== undefined) updateFields.push(`whatsapp_default_message = '${(themeData.whatsappMessage || 'Здравствуйте! У меня есть вопрос по заказу.').replace(/'/g, "''")}'`);
        if (themeData.whatsappMessageEn !== undefined) updateFields.push(`whatsapp_default_message_en = '${(themeData.whatsappMessageEn || '').replace(/'/g, "''")}'`);
        if (themeData.whatsappMessageHe !== undefined) updateFields.push(`whatsapp_default_message_he = '${(themeData.whatsappMessageHe || '').replace(/'/g, "''")}'`);
        if (themeData.whatsappMessageAr !== undefined) updateFields.push(`whatsapp_default_message_ar = '${(themeData.whatsappMessageAr || '').replace(/'/g, "''")}'`);
        
        // Check if there are any meaningful slider updates (not just empty defaults)
        const hasSliderContent = () => {
          // Check if any slide has actual content (image, title, or subtitle)
          for (let i = 1; i <= 5; i++) {
            if (themeData[`slide${i}Image`] && themeData[`slide${i}Image`].trim() !== '') return true;
            if (themeData[`slide${i}Title`] && themeData[`slide${i}Title`].trim() !== '') return true;
            if (themeData[`slide${i}Subtitle`] && themeData[`slide${i}Subtitle`].trim() !== '') return true;
          }
          // Or if slider settings are explicitly being configured
          if (themeData.sliderAutoplay !== undefined && themeData.sliderAutoplay !== false) return true;
          if (themeData.sliderSpeed !== undefined && themeData.sliderSpeed !== 5000) return true;
          if (themeData.sliderEffect !== undefined && themeData.sliderEffect !== 'fade') return true;
          return false;
        };

        // Only sync slider settings to store_settings if there's actual slider content or explicit configuration
        if (hasSliderContent()) {
          if (themeData.sliderAutoplay !== undefined) updateFields.push(`slider_autoplay = ${themeData.sliderAutoplay}`);
          if (themeData.sliderSpeed !== undefined) updateFields.push(`slider_speed = ${themeData.sliderSpeed}`);
          if (themeData.sliderEffect !== undefined) updateFields.push(`slider_effect = '${themeData.sliderEffect || 'fade'}'`);
          
          // Sync all 5 slides
          for (let i = 1; i <= 5; i++) {
            if (themeData[`slide${i}Image`] !== undefined) updateFields.push(`slide${i}_image = '${(themeData[`slide${i}Image`] || '').replace(/'/g, "''")}'`);
            if (themeData[`slide${i}Title`] !== undefined) updateFields.push(`slide${i}_title = '${(themeData[`slide${i}Title`] || '').replace(/'/g, "''")}'`);
            if (themeData[`slide${i}Subtitle`] !== undefined) updateFields.push(`slide${i}_subtitle = '${(themeData[`slide${i}Subtitle`] || '').replace(/'/g, "''")}'`);
            if (themeData[`slide${i}ButtonText`] !== undefined) updateFields.push(`slide${i}_button_text = '${(themeData[`slide${i}ButtonText`] || '').replace(/'/g, "''")}'`);
            if (themeData[`slide${i}ButtonLink`] !== undefined) updateFields.push(`slide${i}_button_link = '${(themeData[`slide${i}ButtonLink`] || '').replace(/'/g, "''")}'`);
            if (themeData[`slide${i}TextPosition`] !== undefined) updateFields.push(`slide${i}_text_position = '${themeData[`slide${i}TextPosition`] || 'left'}'`);
          }
        }
        
        // Execute the update if there are fields to update
        if (updateFields.length > 0) {
          const db = await getDB();
          const sqlQuery = `UPDATE store_settings SET ${updateFields.join(', ')} WHERE id = 1`;
          console.log("Executing SQL query:", sqlQuery);
          await db.execute(sql.raw(sqlQuery));
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
      const db = await getDB();
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
      
      // Sync logo and banner images (CRITICAL FOR DISPLAY) - including multilingual versions
      const imageFields = [
        `logo_url = '${theme.logoUrl || ''}'`,
        `banner_image_url = '${theme.bannerImageUrl || ''}'`,
        // Multilingual logo URLs - safely handle undefined values
        `logo_url_en = '${theme.logoUrl_en || ''}'`,
        `logo_url_he = '${theme.logoUrl_he || ''}'`,
        `logo_url_ar = '${theme.logoUrl_ar || ''}'`,
        // Multilingual banner URLs - safely handle undefined values
        `banner_image_url_en = '${theme.bannerImageUrl_en || ''}'`,
        `banner_image_url_he = '${theme.bannerImageUrl_he || ''}'`,
        `banner_image_url_ar = '${theme.bannerImageUrl_ar || ''}'`
      ];
      await db.execute(sql.raw(`UPDATE store_settings SET ${imageFields.join(', ')} WHERE id = 1`));
      
      // Sync cart banner settings
      const cartBannerFields = [
        `show_cart_banner = ${theme.showCartBanner ?? false}`,
        `cart_banner_type = '${theme.cartBannerType || 'text'}'`,
        `cart_banner_image = '${theme.cartBannerImage || ''}'`,
        `cart_banner_text = '${theme.cartBannerText || ''}'`,
        `cart_banner_text_en = '${theme.cartBannerTextEn || ''}'`,
        `cart_banner_text_he = '${theme.cartBannerTextHe || ''}'`,
        `cart_banner_text_ar = '${theme.cartBannerTextAr || ''}'`,
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
        `whatsapp_default_message = '${theme.whatsappMessage || 'Здравствуйте! У меня есть вопрос по заказу.'}'`,
        `whatsapp_default_message_en = '${theme.whatsappMessageEn || ''}'`,
        `whatsapp_default_message_he = '${theme.whatsappMessageHe || ''}'`,
        `whatsapp_default_message_ar = '${theme.whatsappMessageAr || ''}'`
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

      // Add default values for missing WhatsApp fields
      const bodyWithDefaults = {
        ...req.body,
        whatsappPhone: req.body.whatsappPhone || "",
        whatsappMessage: req.body.whatsappMessage || "Здравствуйте! У меня есть вопрос по заказу."
      };
      const themeData = insertThemeSchema.parse(bodyWithDefaults);
      
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

  // Test email endpoint
  app.post("/api/test-email", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: "Admin access required" 
        });
      }

      const { toEmail } = req.body;
      
      if (!toEmail) {
        return res.status(400).json({ success: false, message: "Email address is required" });
      }

      // Get current settings for email configuration
      const db = await getDB();
      const [settingsData] = await db.select().from(storeSettings).limit(1);
      
      
      if (!settingsData?.emailNotificationsEnabled) {
        return res.status(400).json({ 
          success: false, 
          message: "Email notifications are disabled in settings" 
        });
      }


      // Update email service with current settings
      await emailService.updateSettings({
        useSendgrid: settingsData.useSendgrid || false,
        sendgridApiKey: process.env.SENDGRID_API_KEY,
        smtpHost: settingsData.smtpHost,
        smtpPort: settingsData.smtpPort,
        smtpSecure: settingsData.smtpSecure,
        smtpUser: settingsData.smtpUser,
        smtpPassword: settingsData.smtpPassword
      });

      // Send test email with fallback sender to avoid SPF issues
      const emailSent = await emailService.sendEmail({
        to: toEmail,
        from: settingsData.orderNotificationFromEmail || 'noreply@ordis.co.il', // Use consistent domain
        fromName: settingsData.storeName || 'eDAHouse',
        subject: '🧪 Тест email - eDAHouse',
        text: 'Тестовое письмо от системы eDAHouse',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #f97316;">🧪 Тест email уведомлений</h2>
            <p>Это тестовое письмо от системы <strong>eDAHouse</strong>.</p>
            <p>Если вы получили это письмо, значит email уведомления настроены правильно!</p>
            <p style="color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              Отправлено: ${new Date().toLocaleString('ru-RU')}
            </p>
          </div>
        `
      });

      if (emailSent) {
        res.json({ 
          success: true, 
          message: `✅ Письмо отправлено на ${toEmail}\n\n🔍 Если не пришло:\n• Проверьте папку СПАМ/Промо\n• Подождите 2-3 минуты\n• DNS записи могут обновляться до 24 часов`,
          details: {
            from: settingsData.orderNotificationFromEmail || 'noreply@ordis.co.il',
            smtpHost: settingsData.smtpHost,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "❌ Ошибка отправки email" 
        });
      }

    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({ 
        success: false, 
        message: "Ошибка при отправке тестового письма" 
      });
    }
  });

  // Push notification routes
  
  // Get VAPID public key for client
  app.get('/api/push/vapid-key', (req, res) => {
    res.json({ publicKey: PushNotificationService.getPublicKey() });
  });

  // Subscribe to push notifications
  app.post('/api/push/subscribe', async (req: any, res) => {
    try {
      const userId = req.user?.id || 'guest';
      const { endpoint, keys } = req.body;

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ message: 'Invalid subscription data' });
      }

      // Check if subscription already exists for this user
      const db = await getDB();
      const existingSubscription = await db
        .select()
        .from(pushSubscriptions)
        .where(sql`user_id = ${userId}`)
        .limit(1);

      if (existingSubscription.length > 0) {
        // Update existing subscription with new endpoint and keys
        await db
          .update(pushSubscriptions)
          .set({
            endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
            userAgent: req.headers['user-agent'] || '',
            updatedAt: new Date()
          })
          .where(sql`user_id = ${userId}`);
        
        return res.json({ message: 'Subscription updated successfully' });
      } else {
        // Save new subscription
        await db.insert(pushSubscriptions).values({
          userId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: req.headers['user-agent'] || ''
        });
      }

      res.json({ message: 'Subscription saved successfully' });
    } catch (error) {
      console.error('Error saving push subscription:', error);
      res.status(500).json({ message: 'Failed to save subscription' });
    }
  });

  // Unsubscribe from push notifications
  app.delete('/api/push/unsubscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { endpoint } = req.body;
      
      const db = await getDB();
      await db
        .delete(pushSubscriptions)
        .where(sql`endpoint = ${endpoint} AND user_id = ${userId}`);

      res.json({ message: 'Unsubscribed successfully' });
    } catch (error) {
      console.error('Error unsubscribing:', error);
      res.status(500).json({ message: 'Failed to unsubscribe' });
    }
  });

  // Test marketing push notification (no auth required for testing)
  app.post('/api/test/push/marketing', async (req: any, res) => {
    try {
      const { title, message } = req.body;

      if (!title || !message) {
        return res.status(400).json({ message: 'Title and message are required' });
      }

      // Create test notification record
      const db = await getDB();
      const [notification] = await db.insert(marketingNotifications).values({
        title,
        message,
        createdBy: 'test',
        sentAt: new Date()
      }).returning();

      // Send single notification with test data
      const result = await PushNotificationService.sendMarketingNotification({
        title,
        message,
        notificationId: notification.id
      });

      let totalSent = 0;
      if (result.success) {
        totalSent = result.sent || 0;
        console.log(`📱 Test marketing notification: ${totalSent} notifications sent successfully`);
      } else {
        console.error(`❌ Failed to send test marketing notifications`, result.error);
      }

      // Update sent count
      await db
        .update(marketingNotifications)
        .set({ sentCount: totalSent })
        .where(sql`id = ${notification.id}`);

      res.json({ 
        message: 'Test marketing notification sent successfully',
        sentCount: totalSent,
        notificationId: notification.id
      });
    } catch (error) {
      console.error('Error sending test marketing notification:', error);
      res.status(500).json({ message: 'Failed to send test marketing notification' });
    }
  });

  // Admin: Send marketing notification
  app.post('/api/admin/push/marketing', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { title, message, titleEn, messageEn, titleHe, messageHe, titleAr, messageAr } = req.body;

      if (!title || !message) {
        return res.status(400).json({ message: 'Title and message are required' });
      }

      // Save marketing notification to database
      const db = await getDB();
      const [notification] = await db.insert(marketingNotifications).values({
        title,
        message,
        titleEn: titleEn || null,
        messageEn: messageEn || null,
        titleHe: titleHe || null,
        messageHe: messageHe || null,
        titleAr: titleAr || null,
        messageAr: messageAr || null,
        createdBy: user.id,
        sentAt: new Date()
      }).returning();

      // Send single notification with multilingual content
      const result = await PushNotificationService.sendMarketingNotification({
        title,
        message,
        titleEn,
        messageEn,
        titleHe,
        messageHe,
        titleAr,
        messageAr,
        notificationId: notification.id
      });

      let totalSent = 0;
      if (result.success) {
        totalSent = result.sent || 0;
        console.log(`📱 Marketing notification: ${totalSent} notifications sent successfully`);
      } else {
        console.error(`❌ Failed to send marketing notifications`, result.error);
      }

      // Update sent count
      await db
        .update(marketingNotifications)
        .set({ sentCount: totalSent })
        .where(sql`id = ${notification.id}`);

      res.json({ 
        message: 'Marketing notification sent successfully',
        sentCount: totalSent,
        notificationId: notification.id
      });
    } catch (error) {
      console.error('Error sending marketing notification:', error);
      res.status(500).json({ message: 'Failed to send marketing notification' });
    }
  });

  // Admin: Get push subscription statistics
  app.get('/api/admin/push/stats', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const db = await getDB();
      const subscriptionsCount = await db
        .select({ count: sql`count(*)`.mapWith(Number) })
        .from(pushSubscriptions);

      res.json({ 
        totalSubscriptions: subscriptionsCount[0]?.count || 0 
      });
    } catch (error) {
      console.error('Error fetching push statistics:', error);
      res.status(500).json({ message: 'Failed to fetch push statistics' });
    }
  });

  // Admin: Get marketing notifications history
  app.get('/api/admin/push/marketing', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const db = await getDB();
      const notifications = await db
        .select()
        .from(marketingNotifications)
        .orderBy(sql`created_at DESC`)
        .limit(50);

      res.json(notifications);
    } catch (error) {
      console.error('Error fetching marketing notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  // Test push notification (admin only)
  app.post('/api/admin/push/test', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      await PushNotificationService.sendToUser(user.id, {
        title: '🧪 Тестовое уведомление',
        body: 'Система push уведомлений работает корректно!',
        data: {
          type: 'test'
        }
      });

      res.json({ message: 'Test notification sent' });
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({ message: 'Failed to send test notification' });
    }
  });

  // Barcode system routes for Israeli weighing scales
  
  // Get barcode configuration from store settings
  app.get('/api/barcode/config', async (req: any, res) => {
    try {
      const storeSettings = await storage.getStoreSettings();
      
      if (!storeSettings) {
        return res.status(404).json({ message: 'Store settings not found' });
      }

      const barcodeConfig = {
        enabled: storeSettings.barcodeSystemEnabled || false,
        productCodeStart: storeSettings.barcodeProductCodeStart || 1,
        productCodeEnd: storeSettings.barcodeProductCodeEnd || 5,
        weightStart: storeSettings.barcodeWeightStart || 6,
        weightEnd: storeSettings.barcodeWeightEnd || 10,
        weightUnit: storeSettings.barcodeWeightUnit || 'g'
      };

      res.json(barcodeConfig);
    } catch (error) {
      console.error('Error fetching barcode configuration:', error);
      res.status(500).json({ message: 'Failed to fetch barcode configuration' });
    }
  });

  // Update barcode configuration (admin only)
  app.put('/api/admin/barcode/config', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { 
        enabled, 
        productCodeStart, 
        productCodeEnd, 
        weightStart, 
        weightEnd, 
        weightUnit 
      } = req.body;

      // Validate configuration
      if (productCodeStart >= productCodeEnd || weightStart >= weightEnd) {
        return res.status(400).json({ 
          message: 'Invalid barcode configuration: start positions must be less than end positions' 
        });
      }

      // Update store settings with barcode configuration
      const updatedSettings = await storage.updateStoreSettings({
        barcodeSystemEnabled: enabled,
        barcodeProductCodeStart: productCodeStart,
        barcodeProductCodeEnd: productCodeEnd,
        barcodeWeightStart: weightStart,
        barcodeWeightEnd: weightEnd,
        barcodeWeightUnit: weightUnit
      });

      res.json({ 
        message: 'Barcode configuration updated successfully',
        config: {
          enabled: updatedSettings.barcodeSystemEnabled,
          productCodeStart: updatedSettings.barcodeProductCodeStart,
          productCodeEnd: updatedSettings.barcodeProductCodeEnd,
          weightStart: updatedSettings.barcodeWeightStart,
          weightEnd: updatedSettings.barcodeWeightEnd,
          weightUnit: updatedSettings.barcodeWeightUnit
        }
      });
    } catch (error) {
      console.error('Error updating barcode configuration:', error);
      res.status(500).json({ message: 'Failed to update barcode configuration' });
    }
  });

  // Parse Israeli weighing scale barcode
  app.post('/api/barcode/parse', isAuthenticated, async (req: any, res) => {
    try {
      const { barcode } = req.body;

      if (!barcode || typeof barcode !== 'string') {
        return res.status(400).json({ message: 'Valid barcode string is required' });
      }

      // Get barcode configuration
      const storeSettings = await storage.getStoreSettings();
      
      if (!storeSettings?.barcodeSystemEnabled) {
        return res.status(400).json({ message: 'Barcode system is disabled' });
      }

      const config = {
        productCodeStart: storeSettings.barcodeProductCodeStart || 1,
        productCodeEnd: storeSettings.barcodeProductCodeEnd || 5,
        weightStart: storeSettings.barcodeWeightStart || 6,
        weightEnd: storeSettings.barcodeWeightEnd || 10,
        weightUnit: storeSettings.barcodeWeightUnit || 'g'
      };

      // Validate barcode length
      if (barcode.length < Math.max(config.productCodeEnd, config.weightEnd)) {
        return res.status(400).json({ 
          message: `Barcode too short. Expected at least ${Math.max(config.productCodeEnd, config.weightEnd)} digits` 
        });
      }

      // Extract product code and weight from barcode
      const productCode = barcode.substring(config.productCodeStart - 1, config.productCodeEnd);
      const weightStr = barcode.substring(config.weightStart - 1, config.weightEnd);
      
      // Convert weight to number (Israeli barcode format: weight in grams as-is)
      const weight = parseInt(weightStr, 10);
      
      if (isNaN(weight)) {
        return res.status(400).json({ message: 'Invalid weight in barcode' });
      }

      // Find product by barcode (product code)
      // First try exact match
      const products = await storage.searchProducts(productCode);
      let product = products.find(p => p.barcode === productCode);
      
      // If not found, try with leading zero
      if (!product) {
        const paddedCode = productCode.padStart(6, '0');
        const paddedProducts = await storage.searchProducts(paddedCode);
        product = paddedProducts.find(p => p.barcode === paddedCode);
      }
      
      // If still not found, try removing leading zeros from stored barcode
      if (!product) {
        const allProducts = await storage.searchProducts('');
        product = allProducts.find(p => p.barcode && p.barcode.replace(/^0+/, '') === productCode.replace(/^0+/, ''));
      }

      if (!product) {
        return res.status(404).json({ 
          message: 'Product not found for barcode',
          productCode,
          weight,
          weightUnit: config.weightUnit
        });
      }

      // Calculate price based on weight 
      let calculatedWeight = weight;
      let displayWeight = weight;
      let displayUnit = config.weightUnit;
      let totalPrice = 0;

      // Determine the correct price calculation based on product unit (multilingual support)
      const unitLower = product.unit.toLowerCase();
      
      // Debug logging
      console.log(`Barcode parsing debug:`, {
        productName: product.name,
        productUnit: product.unit,
        unitLower: unitLower,
        price: product.price,
        pricePerKg: product.pricePerKg,
        weight: weight,
        weightUnit: config.weightUnit
      });
      
      if (unitLower === 'кг' || unitLower === 'kg') {
        // Product is priced per kg
        const pricePerKg = product.pricePerKg || product.price;
        if (config.weightUnit === 'g') {
          // Convert grams to kg for calculation
          calculatedWeight = weight / 1000;
          displayWeight = calculatedWeight;
          displayUnit = product.unit;
        }
        totalPrice = Math.round(pricePerKg * calculatedWeight * 100) / 100;
      } else if (unitLower === 'г' || unitLower === 'g') {
        // Product is priced per gram
        const pricePerGram = product.price;
        if (config.weightUnit === 'g') {
          // Weight is already in grams
          calculatedWeight = weight;
        }
        totalPrice = Math.round(pricePerGram * calculatedWeight * 100) / 100;
      } else if (unitLower === '100г' || unitLower === '100g' || unitLower === '100 г' || unitLower === '100 g') {
        // Product is priced per 100g
        const pricePer100g = product.price;
        if (config.weightUnit === 'g') {
          // Convert grams to 100g units
          calculatedWeight = weight / 100;
          displayWeight = weight; // Show original weight in grams
          displayUnit = 'г'; // Show in grams
        }
        totalPrice = Math.round(pricePer100g * calculatedWeight * 100) / 100;
      } else if (unitLower.includes('порция') || unitLower.includes('portion') || unitLower.includes('pc') || unitLower.includes('шт')) {
        // Product is priced per piece/portion - use price as is
        totalPrice = Math.round(product.price * 100) / 100;
        calculatedWeight = 1;
        displayWeight = weight;
        displayUnit = config.weightUnit;
      } else {
        // Default case - assume per unit pricing
        totalPrice = Math.round(product.price * calculatedWeight * 100) / 100;
      }

      res.json({
        success: true,
        product: {
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          unit: product.unit,
          price: product.price,
          pricePerKg: product.pricePerKg
        },
        barcode: {
          raw: barcode,
          productCode,
          weight: displayWeight,
          weightUnit: displayUnit,
          totalPrice
        }
      });
    } catch (error) {
      console.error('Error parsing barcode:', error);
      res.status(500).json({ message: 'Failed to parse barcode' });
    }
  });

  // Translation management routes
  app.get("/api/translations/export", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { exportTranslations, generateExcelFile } = await import('./translation-manager');
      const translations = await exportTranslations();
      const excelBuffer = generateExcelFile(translations);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=translations.xlsx');
      res.send(excelBuffer);
    } catch (error) {
      console.error('Error exporting translations:', error);
      res.status(500).json({ message: 'Failed to export translations' });
    }
  });

  app.post("/api/translations/import", isAuthenticated, excelUpload.single('file'), async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { parseExcelFile, importTranslations } = await import('./translation-manager');
      const translations = parseExcelFile(req.file.buffer);
      
      await importTranslations(translations);
      
      // Clear cache to ensure updated translations are reflected
      clearCachePattern('settings');
      clearCachePattern('themes');
      clearCachePattern('products');
      clearCachePattern('categories');

      res.json({ success: true, message: 'Translations imported successfully', importedRows: translations.length });
    } catch (error) {
      console.error('Error importing translations:', error);
      res.status(500).json({ message: 'Failed to import translations' });
    }
  });

  // Helper function to get default language for feeds
  const getDefaultLanguageFromDB = async (): Promise<string> => {
    try {
      const db = await getDB();
      const storeData = await db.select().from(storeSettings).limit(1);
      return storeData?.[0]?.defaultLanguage || 'ru';
    } catch (error) {
      console.error('Error fetching default language for feeds:', error);
      return 'ru';
    }
  };

  // Product feeds for advertising platforms
  app.get("/api/feed/facebook", async (req, res) => {
    try {
      const defaultLang = await getDefaultLanguageFromDB();
      const language = req.query.lang as string || defaultLang;
      const format = req.query.format as string || 'xml'; // xml or csv
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      const { getFeedProducts, generateFacebookXMLFeed, generateFacebookCSVFeed } = await import('./feed-generator');
      const products = await getFeedProducts({ language, baseUrl });
      
      if (format === 'csv') {
        const csvFeed = generateFacebookCSVFeed(products);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=facebook_feed_${language}.csv`);
        res.send(csvFeed);
      } else {
        const xmlFeed = await generateFacebookXMLFeed(products, { language, baseUrl });
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.send(xmlFeed);
      }
    } catch (error) {
      console.error('Error generating Facebook feed:', error);
      res.status(500).json({ message: 'Failed to generate feed' });
    }
  });

  app.get("/api/feed/google", async (req, res) => {
    try {
      const defaultLang = await getDefaultLanguageFromDB();
      const language = req.query.lang as string || defaultLang;
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      const { getFeedProducts, generateGoogleXMLFeed } = await import('./feed-generator');
      const products = await getFeedProducts({ language, baseUrl });
      const xmlFeed = await generateGoogleXMLFeed(products, { language, baseUrl });
      
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.send(xmlFeed);
    } catch (error) {
      console.error('Error generating Google feed:', error);
      res.status(500).json({ message: 'Failed to generate feed' });
    }
  });

  app.get("/api/feed/yandex", async (req, res) => {
    try {
      const defaultLang = await getDefaultLanguageFromDB();
      const language = req.query.lang as string || defaultLang;
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      const { getFeedProducts, generateYandexXMLFeed } = await import('./feed-generator');
      const products = await getFeedProducts({ language, baseUrl });
      const xmlFeed = await generateYandexXMLFeed(products, { language, baseUrl });
      
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.send(xmlFeed);
    } catch (error) {
      console.error('Error generating Yandex feed:', error);
      res.status(500).json({ message: 'Failed to generate feed' });
    }
  });

  app.get("/api/feed/json", async (req, res) => {
    try {
      const defaultLang = await getDefaultLanguageFromDB();
      const language = req.query.lang as string || defaultLang;
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      const { getFeedProducts, generateJSONFeed } = await import('./feed-generator');
      const products = await getFeedProducts({ language, baseUrl });
      const jsonFeed = await generateJSONFeed(products, { language, baseUrl });
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.send(jsonFeed);
    } catch (error) {
      console.error('Error generating JSON feed:', error);
      res.status(500).json({ message: 'Failed to generate feed' });
    }
  });

  // Analytics endpoints (admin only)
  
  // Validation schemas for analytics endpoints
  const analyticsQuerySchema = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    tz: z.string().optional().default('UTC')
  });
  
  const timeseriesQuerySchema = analyticsQuerySchema.extend({
    granularity: z.enum(['day', 'week', 'month']).optional().default('day')
  });

  // Analytics summary endpoint
  app.get('/api/admin/analytics/summary', requireAdmin, async (req: any, res) => {
    try {
      const query = analyticsQuerySchema.parse(req.query);
      const db = await getDB();
      
      // Default to today in user's timezone if no dates provided
      const now = new Date();
      const defaultFrom = query.from || now.toISOString().split('T')[0];
      const defaultTo = query.to || now.toISOString().split('T')[0];
      const userTimezone = query.tz || 'UTC';
      
      console.log(`[Analytics Debug] Summary query params: from=${defaultFrom}, to=${defaultTo}, tz=${userTimezone}`);
      
      // Get orders by status for the period (simplified without timezone for now)
      const ordersResult = await db.execute(sql`
        SELECT status, COUNT(*) as count 
        FROM orders 
        WHERE created_at::date BETWEEN ${defaultFrom}::date AND ${defaultTo}::date
        GROUP BY status
      `);
      
      const ordersByStatus: Record<string, number> = {};
      let totalOrders = 0;
      let completedOrders = 0;
      
      for (const row of ordersResult.rows) {
        const status = row.status as string;
        const count = parseInt(row.count as string);
        ordersByStatus[status] = count;
        totalOrders += count;
        if (status === 'delivered') {
          completedOrders = count;
        }
      }
      
      // Get revenue from delivered orders (simplified)
      const revenueResult = await db.execute(sql`
        SELECT COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as count
        FROM orders 
        WHERE status = 'delivered' 
        AND created_at::date BETWEEN ${defaultFrom}::date AND ${defaultTo}::date
      `);
      
      const revenue = parseFloat(revenueResult.rows[0]?.revenue as string || '0');
      const conversionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
      const averageOrderValue = completedOrders > 0 ? revenue / completedOrders : 0;
      
      res.json({
        ordersByStatus,
        totalOrders,
        completedOrders,
        revenue,
        conversionRate: Math.round(conversionRate * 100) / 100, // Round to 2 decimals
        averageOrderValue: Math.round(averageOrderValue * 100) / 100
      });
      
    } catch (error) {
      console.error('Analytics summary error:', error);
      res.status(500).json({ message: 'Failed to fetch analytics summary' });
    }
  });
  
  // Analytics timeseries endpoint
  app.get('/api/admin/analytics/timeseries', requireAdmin, async (req: any, res) => {
    try {
      const query = timeseriesQuerySchema.parse(req.query);
      const db = await getDB();
      
      // Default to today if no dates provided
      const now = new Date();
      const defaultFrom = query.from || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const defaultTo = query.to || now.toISOString().split('T')[0];
      const userTimezone = query.tz || 'UTC';
      
      console.log(`[Analytics Debug] Timeseries query params: from=${defaultFrom}, to=${defaultTo}, tz=${userTimezone}, granularity=${query.granularity}`);
      
      // Get timeseries data for orders (simplified)
      const ordersTimeseries = await db.execute(sql`
        SELECT 
          DATE_TRUNC(${query.granularity}, created_at) as bucket,
          COUNT(*) as orders,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders
        FROM orders 
        WHERE created_at::date BETWEEN ${defaultFrom}::date AND ${defaultTo}::date
        GROUP BY bucket
        ORDER BY bucket ASC
      `);
      
      // Get revenue timeseries for delivered orders (simplified)
      const revenueTimeseries = await db.execute(sql`
        SELECT 
          DATE_TRUNC(${query.granularity}, created_at) as bucket,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM orders 
        WHERE status = 'delivered' 
        AND created_at::date BETWEEN ${defaultFrom}::date AND ${defaultTo}::date
        GROUP BY bucket
        ORDER BY bucket ASC
      `);
      
      // Merge the data
      const bucketMap = new Map();
      
      // Initialize with orders data
      for (const row of ordersTimeseries.rows) {
        const bucketKey = new Date(row.bucket as string).toISOString().split('T')[0];
        bucketMap.set(bucketKey, {
          bucketStart: bucketKey,
          orders: parseInt(row.orders as string),
          completedOrders: parseInt(row.completed_orders as string),
          revenue: 0
        });
      }
      
      // Add revenue data
      for (const row of revenueTimeseries.rows) {
        const bucketKey = new Date(row.bucket as string).toISOString().split('T')[0];
        const existing = bucketMap.get(bucketKey);
        if (existing) {
          existing.revenue = parseFloat(row.revenue as string);
        } else {
          bucketMap.set(bucketKey, {
            bucketStart: bucketKey,
            orders: 0,
            completedOrders: 0,
            revenue: parseFloat(row.revenue as string)
          });
        }
      }
      
      // Convert to array and sort
      const result = Array.from(bucketMap.values()).sort((a, b) => 
        new Date(a.bucketStart).getTime() - new Date(b.bucketStart).getTime()
      );
      
      res.json(result);
      
    } catch (error) {
      console.error('Analytics timeseries error:', error);
      res.status(500).json({ message: 'Failed to fetch analytics timeseries' });
    }
  });

  // Analytics active orders endpoint
  app.get('/api/admin/analytics/active-orders', requireAdmin, async (req: any, res) => {
    try {
      const db = await getDB();
      
      // Get current active orders (all statuses except 'delivered' and 'cancelled')
      const activeOrdersResult = await db.execute(sql`
        SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
        FROM orders 
        WHERE status NOT IN ('delivered', 'cancelled')
        GROUP BY status
        ORDER BY count DESC
      `);
      
      let totalActiveOrders = 0;
      let totalActiveAmount = 0;
      const ordersByStatus: Record<string, { count: number; amount: number }> = {};
      
      for (const row of activeOrdersResult.rows) {
        const status = row.status as string;
        const count = parseInt(row.count as string);
        const amount = parseFloat(row.amount as string);
        ordersByStatus[status] = { count, amount };
        totalActiveOrders += count;
        totalActiveAmount += amount;
      }
      
      res.json({
        ordersByStatus,
        totalActiveOrders,
        totalActiveAmount: Math.round(totalActiveAmount * 100) / 100
      });
      
    } catch (error) {
      console.error('Analytics active orders error:', error);
      res.status(500).json({ message: 'Failed to fetch active orders analytics' });
    }
  });

  // Get all closed dates (public endpoint for checkout)
  app.get('/api/closed-dates', async (req, res) => {
    try {
      const db = await getDB();
      const dates = await db.select().from(closedDates).orderBy(closedDates.date);
      res.json(dates);
    } catch (error) {
      console.error('Error fetching closed dates:', error);
      res.status(500).json({ message: 'Failed to fetch closed dates' });
    }
  });

  // Add closed date (admin only)
  app.post('/api/admin/closed-dates', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const validatedData = insertClosedDateSchema.parse(req.body);
      const db = await getDB();
      
      const [newDate] = await db.insert(closedDates)
        .values(validatedData)
        .returning();
      
      res.status(201).json(newDate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      // Check for duplicate date error (PostgreSQL unique constraint violation)
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        return res.status(409).json({ 
          message: 'Эта дата уже добавлена как выходной день',
          isDuplicate: true 
        });
      }
      
      console.error('Error adding closed date:', error);
      res.status(500).json({ message: 'Failed to add closed date' });
    }
  });

  // Delete closed date (admin only)
  app.delete('/api/admin/closed-dates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { id } = req.params;
      const db = await getDB();
      
      await db.delete(closedDates).where(sql`id = ${id}`);
      
      res.json({ message: 'Closed date deleted successfully' });
    } catch (error) {
      console.error('Error deleting closed date:', error);
      res.status(500).json({ message: 'Failed to delete closed date' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
