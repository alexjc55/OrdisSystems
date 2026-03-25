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
 * Meta Tag Injection Middleware
 * - For ALL HTML requests: replaces {{storeName}} and {{storeDescription}} placeholders
 *   with real values from the database, so bots and SEO tools always see the actual store name.
 * - For bot requests only: additionally injects structured data (JSON-LD) for rich results.
 */

// Simple in-memory cache so we don't re-read disk on every request
let _cachedHtmlTemplate: string | null = null;
let _cachedHtmlMtime = 0;

async function getHtmlTemplate(htmlPath: string): Promise<string> {
  try {
    const stat = await fs.promises.stat(htmlPath);
    const mtime = stat.mtimeMs;
    if (_cachedHtmlTemplate && mtime === _cachedHtmlMtime) {
      return _cachedHtmlTemplate;
    }
    _cachedHtmlTemplate = await fs.promises.readFile(htmlPath, 'utf-8');
    _cachedHtmlMtime = mtime;
    return _cachedHtmlTemplate;
  } catch {
    return '';
  }
}

// Settings cache (refresh every 60 s)
let _cachedSettings: any = null;
let _settingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 60_000;

async function getSettings() {
  if (_cachedSettings && Date.now() - _settingsCacheTime < SETTINGS_CACHE_TTL) {
    return _cachedSettings;
  }
  _cachedSettings = await storage.getStoreSettings();
  _settingsCacheTime = Date.now();
  return _cachedSettings;
}

export function metaInjectionMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only handle GET requests for HTML pages
    if (req.method !== 'GET') {
      return next();
    }

    // Skip ALL static asset paths
    if (
      req.path.startsWith('/api/') ||
      req.path.startsWith('/uploads/') ||
      req.path.startsWith('/assets/') ||
      req.path.startsWith('/src/') ||
      req.path.startsWith('/@') ||
      req.path.startsWith('/node_modules/') ||
      req.path.match(/\.(js|jsx|ts|tsx|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json|xml|txt|map)$/)
    ) {
      return next();
    }

    // Only proceed if Accept header includes HTML
    const acceptsHtml = req.headers.accept?.includes('text/html');
    if (!acceptsHtml) {
      return next();
    }

    try {
      // Determine HTML source (built dist in production)
      const htmlPath = path.resolve(process.cwd(), 'dist/public/index.html');
      let html = await getHtmlTemplate(htmlPath);

      if (!html) {
        return next();
      }

      // Load store settings
      const settings = await getSettings();
      const storeName = settings?.storeName || '';
      const storeDescription =
        settings?.welcomeSubtitle ||
        settings?.description ||
        '';

      // Replace placeholders — this runs for ALL visitors in production
      html = html.replace(/\{\{storeName\}\}/g, escapeHtml(storeName));
      html = html.replace(/\{\{storeDescription\}\}/g, escapeHtml(storeDescription));

      // ── Bot-only: inject structured data (JSON-LD) ──────────────────────────
      const userAgent = req.headers['user-agent'];
      const isBot = shouldUseSSR(userAgent, req.query);

      if (isBot) {
        console.log('[SEO Bot] Detected:', userAgent?.substring(0, 60));
        console.log('[SEO Bot] Path:', req.path);

        const allCategories = await storage.getCategories(false);
        const allProducts = await storage.getProducts();

        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5000';
        const origin = `${protocol}://${host}`;

        const logoUrl = settings?.logoUrl ? getFullImageUrl(settings.logoUrl, origin) : undefined;

        const structuredDataParts: string[] = [];

        // 1. Restaurant schema
        const restaurantSchema = generateRestaurantSchema(settings as any || null, origin, logoUrl);
        if (restaurantSchema) {
          structuredDataParts.push(`
    <script type="application/ld+json" data-restaurant="true">
      ${JSON.stringify(restaurantSchema, null, 2)}
    </script>`);
        }

        // 2. Categories ItemList (top 8 for Google sitelinks)
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

        // 3. Products ItemList (featured / special offers, up to 12)
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
          settings?.storeName ? `Специальные предложения ${settings.storeName}` : 'Специальные предложения'
        );
        if (productsSchema) {
          structuredDataParts.push(`
    <script type="application/ld+json" data-products="true">
      ${JSON.stringify(productsSchema, null, 2)}
    </script>`);
        }

        // Inject canonical link + structured data before </head>
        const injectedContent =
          generateCanonicalTag(req.path, req.query) +
          structuredDataParts.join('\n');

        html = html.replace('</head>', `${injectedContent}\n  </head>`);

        // Also update og:title / og:description / og:site_name in <head> for social bots
        html = injectOgTags(html, storeName, storeDescription);

        console.log('[SEO Bot] Injected structured data:', {
          restaurant: !!restaurantSchema,
          categories: topCategories.length,
          products: featuredProducts.length
        });
      }

      res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
    } catch (error) {
      console.error('[SEO] Error in meta injection middleware:', error);
      next(error);
    }
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Inject / update og:title, og:description, og:site_name meta tags */
function injectOgTags(html: string, storeName: string, description: string): string {
  const escaped = escapeHtml(storeName);
  const escapedDesc = escapeHtml(description);

  // Replace existing og:title content
  html = html.replace(
    /(<meta property="og:title" content=")[^"]*(")/,
    `$1${escaped}$2`
  );
  // Replace existing og:description content
  html = html.replace(
    /(<meta property="og:description" content=")[^"]*(")/,
    `$1${escapedDesc}$2`
  );
  // Replace existing og:site_name content
  html = html.replace(
    /(<meta property="og:site_name" content=")[^"]*(")/,
    `$1${escaped}$2`
  );
  return html;
}

/**
 * Generate canonical link tag and language meta based on route
 */
function generateCanonicalTag(urlPath: string, query: any): string {
  const tags: string[] = [];

  const langMatch = urlPath.match(/^\/(en|he|ar)\//);
  const lang = query.lang || (langMatch ? langMatch[1] : 'ru');

  const cleanPath = urlPath.replace(/^\/(en|he|ar)/, '');
  let canonicalPath = cleanPath || '/';
  if (canonicalPath !== '/' && canonicalPath.endsWith('/')) {
    canonicalPath = canonicalPath.slice(0, -1);
  }

  const fullCanonical = lang === 'ru' ? canonicalPath : `/${lang}${canonicalPath}`;

  tags.push(`<!-- Canonical URL for bots -->`);
  tags.push(`<link rel="canonical" href="${fullCanonical}" />`);
  tags.push(`<meta http-equiv="content-language" content="${lang}" />`);
  tags.push(`<!-- Page rendered for bot: ${new Date().toISOString()} -->`);

  return tags.join('\n    ');
}
