import { Request, Response, NextFunction } from 'express';
import { shouldUseSSR } from './bot-detection';
import * as fs from 'fs';
import * as path from 'path';
import { storage } from './storage';
import {
  generateRestaurantSchema,
  generateCategoriesItemListSchema,
  generateProductsItemListSchema,
  getFullImageUrl
} from '../shared/seo-schemas';
import type { CategoryWithCount, ProductWithCategories } from '@shared/schema';

/**
 * Simple Meta Tag Injection for Bots
 * Injects dynamic meta tags AND structured data (JSON-LD) into HTML for search engines
 * without full React SSR overhead
 */
export function metaInjectionMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only handle GET requests for HTML pages
    if (req.method !== 'GET') {
      return next();
    }

    // CRITICAL: Very strict filtering to avoid breaking static assets
    // Skip ALL static asset paths first
    if (
      req.path.startsWith('/api/') ||
      req.path.startsWith('/uploads/') ||
      req.path.startsWith('/assets/') ||  // Vite bundled assets
      req.path.startsWith('/src/') ||     // Dev mode source files
      req.path.startsWith('/@') ||        // Vite special paths
      req.path.startsWith('/node_modules/') || // Dependencies
      req.path.match(/\.(js|jsx|ts|tsx|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json|xml|txt|map)$/) // File extensions
    ) {
      return next();
    }
    
    // Only proceed if Accept header explicitly includes HTML
    const acceptsHtml = req.headers.accept?.includes('text/html');
    if (!acceptsHtml) {
      return next();
    }

    // Check if this is a bot
    const userAgent = req.headers['user-agent'];
    const isBot = shouldUseSSR(userAgent, req.query);
    
    if (!isBot) {
      return next(); // Regular user - let normal flow handle it
    }

    try {
      console.log('[SEO Bot] Detected:', userAgent?.substring(0, 60));
      console.log('[SEO Bot] Path:', req.path);

      // Read index.html from disk
      const htmlPath = path.resolve(process.cwd(), 'client/index.html');
      let html = await fs.promises.readFile(htmlPath, 'utf-8');

      // Load data from database
      const settings = await storage.getStoreSettings();
      const allCategories = await storage.getCategories(false); // Only active categories
      const allProducts = await storage.getProducts();

      // Determine origin URL
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5000';
      const origin = `${protocol}://${host}`;

      // Get logo URL
      const logoUrl = settings?.logoUrl ? getFullImageUrl(settings.logoUrl, origin) : undefined;

      // Generate structured data using shared functions
      const structuredDataParts: string[] = [];

      // 1. Restaurant schema
      const restaurantSchema = generateRestaurantSchema(settings as any || null, origin, logoUrl);
      if (restaurantSchema) {
        structuredDataParts.push(`
    <script type="application/ld+json" data-restaurant="true">
      ${JSON.stringify(restaurantSchema, null, 2)}
    </script>`);
      }

      // 2. Categories ItemList (limit to top 8 for Google sitelinks)
      const topCategories = allCategories.slice(0, 8).map((cat: CategoryWithCount) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description || undefined,
        url: `/category/${cat.id}`
      }));
      
      const categoriesSchema = generateCategoriesItemListSchema(topCategories, origin);
      if (categoriesSchema) {
        structuredDataParts.push(`
    <script type="application/ld+json" data-categories="true">
      ${JSON.stringify(categoriesSchema, null, 2)}
    </script>`);
      }

      // 3. Products ItemList (limit to 6-12 special offers/featured products)
      const featuredProducts = allProducts
        .filter((p: ProductWithCategories) => p.isSpecialOffer)
        .slice(0, 12)
        .map((p: ProductWithCategories) => ({
          id: p.id,
          name: p.name,
          description: p.description || undefined,
          url: `/product/${p.id}`
        }));
      
      const productsSchema = generateProductsItemListSchema(
        featuredProducts, 
        origin, 
        'Специальные предложения'
      );
      if (productsSchema) {
        structuredDataParts.push(`
    <script type="application/ld+json" data-products="true">
      ${JSON.stringify(productsSchema, null, 2)}
    </script>`);
      }

      // Inject canonical and structured data before </head>
      const injectedContent = generateMetaTags(req.path, req.query) + 
        structuredDataParts.join('\n');
      
      html = html.replace('</head>', `${injectedContent}\n  </head>`);

      console.log('[SEO Bot] Injected structured data:', {
        restaurant: !!restaurantSchema,
        categories: topCategories.length,
        products: featuredProducts.length
      });

      res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
    } catch (error) {
      console.error('[SEO Bot] Error:', error);
      next(error);
    }
  };
}

/**
 * Generate dynamic meta tags based on route
 * Supports path segments: /, /category/:id, /all-products, /en/category/:id, etc.
 */
function generateMetaTags(path: string, query: any): string {
  const tags: string[] = [];

  // Extract language from path (e.g., /en/category/47 -> en)
  const langMatch = path.match(/^\/(en|he|ar)\//);
  const lang = query.lang || (langMatch ? langMatch[1] : 'ru');
  
  // Remove language prefix from path for canonical
  const cleanPath = path.replace(/^\/(en|he|ar)/, '');
  
  // Determine canonical URL based on path
  let canonicalPath = cleanPath || '/';
  
  // Normalize path (remove trailing slash except for root)
  if (canonicalPath !== '/' && canonicalPath.endsWith('/')) {
    canonicalPath = canonicalPath.slice(0, -1);
  }

  // Build full canonical URL with language prefix if needed
  const fullCanonical = lang === 'ru' 
    ? canonicalPath 
    : `/${lang}${canonicalPath}`;

  tags.push(`<!-- Canonical URL for bots -->`);
  tags.push(`<link rel="canonical" href="${fullCanonical}" />`);

  // Language detection
  tags.push(`<meta http-equiv="content-language" content="${lang}" />`);

  // Add structured data hint
  tags.push(`<!-- Page rendered for bot: ${new Date().toISOString()} -->`);

  return tags.join('\n    ');
}
