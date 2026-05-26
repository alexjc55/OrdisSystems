import { Router } from "express";
import { isAuthenticated } from "../../middleware/auth-guard";
import { storage } from "../../storage";
import { db } from "../../db";
import { products } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

const router = Router();

function detectPlatform(url: string): 'wolt' | '10bis' | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('wolt.com')) return 'wolt';
    if (u.hostname.includes('10bis.co.il')) return '10bis';
  } catch {}
  return null;
}

function extractWoltSlug(url: string): string | null {
  const match = url.match(/\/restaurant\/([^/?#]+)/);
  return match ? match[1] : null;
}

function extract10bisId(url: string): string | null {
  const match = url.match(/\/restaurants\/menu\/(?:delivery|pickup)\/(\d+)/);
  if (match) return match[1];
  const match2 = url.match(/[?&]restaurantId=(\d+)/);
  return match2 ? match2[1] : null;
}

async function fetch10bisMenu(restaurantId: string) {
  const resp = await fetch(
    `https://www.10bis.co.il/NextApi/GetRestaurantMenu?restaurantId=${restaurantId}&deliveryMethod=delivery`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }
  );
  if (!resp.ok) throw new Error('Failed to fetch 10bis menu');
  const json = await resp.json() as any;

  // API wraps everything in json.Data
  const data = json.Data ?? json;
  const categoriesRaw: any[] = data.categoriesList || [];
  if (categoriesRaw.length === 0) throw new Error('No menu data in response');

  // Restaurant name not returned by this endpoint — use ID as fallback
  const restaurantName: string = data.ShopInfo?.restaurantName || `Restaurant #${restaurantId}`;

  const categories = categoriesRaw.map((cat: any) => ({
    id: String(cat.categoryID ?? cat.categoryId),
    name: cat.categoryName,
    itemCount: (cat.dishList || []).length,
    imageUrl: ''
  }));

  const items = categoriesRaw.flatMap((cat: any) => {
    const catId = String(cat.categoryID ?? cat.categoryId);
    return (cat.dishList || []).map((dish: any) => ({
      id: String(dish.dishId),
      name: dish.dishName,
      description: dish.dishDescription || '',
      price: Number(dish.dishPrice),
      imageUrl: dish.dishImageUrl || '',
      categoryId: catId
    }));
  });

  return { platform: '10bis' as const, restaurantName, categories, items };
}

async function fetchWoltMenu(slug: string) {
  const searchResp = await fetch('https://restaurant-api.wolt.com/v1/pages/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: JSON.stringify({ q: slug, target: 'venues', lat: '31.9890', lon: '34.7562' })
  });
  if (!searchResp.ok) throw new Error('Failed to search Wolt');
  const searchData = await searchResp.json() as any;

  let venueId: string | null = null;
  let restaurantName = slug;
  for (const section of (searchData.sections || [])) {
    for (const item of (section.items || [])) {
      const venue = item.venue;
      if (venue && (venue.slug === slug || item.track_id === `venue-${slug}`)) {
        venueId = venue.id;
        restaurantName = item.title || venue.name || slug;
        break;
      }
    }
    if (venueId) break;
  }

  if (!venueId) throw new Error('Restaurant not found on Wolt');

  const menuResp = await fetch(
    `https://restaurant-api.wolt.com/v4/venues/${venueId}/menu/data?unit_prices=true&show_subcategories=true`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }
  );
  if (!menuResp.ok) throw new Error('Failed to fetch Wolt menu');

  const text = await menuResp.text();
  if (!text || text.trim().length === 0) throw new Error('Empty response from Wolt');
  const menuData = JSON.parse(text) as any;

  const categories = (menuData.categories || []).map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    itemCount: cat.item_count || 0,
    imageUrl: cat.image || ''
  }));

  const items = (menuData.items || [])
    .filter((item: any) => item.enabled !== false)
    .map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: Math.round((item.baseprice || 0)) / 100,
      imageUrl: item.image || '',
      categoryId: item.category || ''
    }));

  return { platform: 'wolt' as const, restaurantName, categories, items };
}

router.post('/admin/catalog-import/fetch', isAuthenticated, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'invalid_url', message: 'URL обязателен' });
    }

    const platform = detectPlatform(url);
    if (!platform) {
      return res.status(400).json({ error: 'invalid_url', message: 'Неверная ссылка. Поддерживаются только Wolt (wolt.com) и 10bis (10bis.co.il)' });
    }

    let menuData;
    if (platform === '10bis') {
      const restaurantId = extract10bisId(url);
      if (!restaurantId) {
        return res.status(400).json({ error: 'invalid_url', message: 'Не удалось найти ID ресторана в ссылке 10bis' });
      }
      menuData = await fetch10bisMenu(restaurantId);
    } else {
      const slug = extractWoltSlug(url);
      if (!slug) {
        return res.status(400).json({ error: 'invalid_url', message: 'Не удалось найти slug ресторана в ссылке Wolt' });
      }
      menuData = await fetchWoltMenu(slug);
    }

    // Diff: find which external IDs already exist in DB for this platform
    const existingProducts = await db
      .select({ externalId: products.externalId })
      .from(products)
      .where(eq(products.externalSource, platform));

    const existingExternalIds = new Set(
      existingProducts.map(p => p.externalId).filter(Boolean)
    );

    res.json({ ...menuData, existingExternalIds: Array.from(existingExternalIds) });
  } catch (error: any) {
    console.error('Catalog import fetch error:', error.message);
    res.status(500).json({ error: 'fetch_failed', message: 'Не удалось получить меню с товарами: ' + error.message });
  }
});

router.post('/admin/catalog-import/import', isAuthenticated, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

    const { categories, items, targetLanguage, platform } = req.body;
    if (!Array.isArray(categories) || !Array.isArray(items)) {
      return res.status(400).json({ message: 'Invalid data' });
    }

    const lang = (targetLanguage && ['ru', 'en', 'he', 'ar'].includes(targetLanguage)) ? targetLanguage : 'ru';
    const nameField = lang === 'ru' ? 'name' : `name_${lang}`;
    const descField = lang === 'ru' ? 'description' : `description_${lang}`;

    const categoryIdMap = new Map<string, number>();
    let categoriesCreated = 0;

    for (const cat of categories) {
      const created = await storage.createCategory({
        [nameField]: cat.name,
        isActive: true,
        sortOrder: 0
      } as any);
      categoryIdMap.set(cat.externalId, created.id);
      categoriesCreated++;
    }

    const validUnits = ['piece', 'portion', 'kg', '100g', '100ml'];
    const validSource = ['wolt', '10bis'].includes(platform) ? platform : null;

    let itemsCreated = 0;
    for (const item of items) {
      const categoryId = categoryIdMap.get(item.categoryExternalId);
      const unit = validUnits.includes(item.unit) ? item.unit : 'piece';
      const price = String(Number(item.price).toFixed(2));
      await storage.createProduct({
        [nameField]: item.name,
        [descField]: item.description || null,
        price,
        pricePerKg: price,
        unit,
        imageUrl: item.imageUrl || null,
        isActive: true,
        isAvailable: true,
        stockStatus: 'in_stock',
        availabilityStatus: 'available',
        isSpecialOffer: false,
        sortOrder: 0,
        externalId: item.externalId || null,
        externalSource: validSource,
        categoryIds: categoryId ? [categoryId] : []
      } as any);
      itemsCreated++;
    }

    res.json({ categoriesCreated, itemsCreated });
  } catch (error: any) {
    console.error('Catalog import error:', error);
    res.status(500).json({ message: error.message || 'Import failed' });
  }
});

export default router;
