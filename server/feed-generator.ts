import { db } from './db';
import { products, categories, productCategories, storeSettings } from '@shared/schema';
import { eq, and, isNotNull, isNull, or } from 'drizzle-orm';

interface FeedProduct {
  id: number;
  name: string;
  price: number;
  category: string;
  categoryId: number;
  image?: string;
  availability: 'in stock' | 'out of stock';
  link: string;
  description?: string;
}

interface FeedOptions {
  language?: string;
  baseUrl: string;
}

/**
 * Get the default language from settings
 */
async function getDefaultLanguage(): Promise<string> {
  try {
    const storeData = await db.select().from(storeSettings).limit(1);
    return storeData?.[0]?.defaultLanguage || 'ru';
  } catch (error) {
    console.error('Error fetching default language:', error);
    return 'ru';
  }
}

/**
 * Get products for feed generation
 */
export async function getFeedProducts(options: FeedOptions): Promise<FeedProduct[]> {
  const defaultLang = await getDefaultLanguage();
  const { language = defaultLang, baseUrl } = options;
  
  // Get products with their categories via junction table
  const productsWithCategories = await db
    .select({
      productId: products.id,
      productName: products.name,
      productNameEn: products.name_en,
      productNameHe: products.name_he,
      productNameAr: products.name_ar,
      productPrice: products.price,
      productImage: products.imageUrl,
      productDescription: products.description,
      productDescriptionEn: products.description_en,
      productDescriptionHe: products.description_he,
      productDescriptionAr: products.description_ar,
      productAvailable: products.isAvailable,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryNameEn: categories.name_en,
      categoryNameHe: categories.name_he,
      categoryNameAr: categories.name_ar,
    })
    .from(products)
    .leftJoin(productCategories, eq(products.id, productCategories.productId))
    .leftJoin(categories, eq(productCategories.categoryId, categories.id))
    .where(
      and(
        eq(products.isAvailable, true), // Only available products
        eq(products.isActive, true)     // Only active products
      )
    );

  // Transform to feed format
  const feedProducts: FeedProduct[] = productsWithCategories.map((row: any) => {
    // Get localized names
    const getLocalizedName = (base: string | null, en?: string | null, he?: string | null, ar?: string | null) => {
      switch (language) {
        case 'en': return en || base || 'Unnamed';
        case 'he': return he || base || 'ללא שם';
        case 'ar': return ar || base || 'بدون اسم';
        default: return base || 'Без названия';
      }
    };

    const getLocalizedDescription = (base: string | null, en?: string | null, he?: string | null, ar?: string | null) => {
      switch (language) {
        case 'en': return en || base || '';
        case 'he': return he || base || '';
        case 'ar': return ar || base || '';
        default: return base || '';
      }
    };

    const productName = getLocalizedName(row.productName, row.productNameEn, row.productNameHe, row.productNameAr);
    const categoryName = getLocalizedName(row.categoryName, row.categoryNameEn, row.categoryNameHe, row.categoryNameAr);
    const description = getLocalizedDescription(row.productDescription, row.productDescriptionEn, row.productDescriptionHe, row.productDescriptionAr);

    // Generate proper category link without hash fragments for external platforms
    const categoryLink = row.categoryId 
      ? `${baseUrl}/category/${row.categoryId}${language === defaultLang ? '' : `?lang=${language}`}`
      : `${baseUrl}${language === defaultLang ? '' : `?lang=${language}`}`;

    return {
      id: row.productId,
      name: productName,
      price: row.productPrice || 0,
      category: categoryName,
      categoryId: row.categoryId || 0,
      image: row.productImage ? `${baseUrl}${row.productImage.startsWith('/') ? row.productImage : `/${row.productImage}`}` : undefined,
      availability: row.productAvailable ? 'in stock' : 'out of stock',
      link: categoryLink,
      description: description || undefined
    };
  });

  return feedProducts;
}

/**
 * Generate Facebook XML feed
 */
export async function generateFacebookXMLFeed(products: FeedProduct[], options: FeedOptions): Promise<string> {
  const defaultLang = await getDefaultLanguage();
  const { language = defaultLang } = options;
  
  const xmlItems = products.map(product => `
    <item>
      <g:id>${product.id}</g:id>
      <g:title><![CDATA[${product.name}]]></g:title>
      <g:description><![CDATA[${product.description || product.name}]]></g:description>
      <g:link>${product.link}</g:link>
      ${product.image ? `<g:image_link>${product.image}</g:image_link>` : ''}
      <g:availability>${product.availability}</g:availability>
      <g:price>${product.price} ILS</g:price>
      <g:brand>eDAHouse</g:brand>
      <g:condition>new</g:condition>
      <g:product_type><![CDATA[${product.category}]]></g:product_type>
      <g:google_product_category>Food, Beverages &amp; Tobacco</g:google_product_category>
    </item>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>eDAHouse Product Feed - ${language.toUpperCase()}</title>
    <link>${options.baseUrl}</link>
    <description>eDAHouse products for ${language}</description>
    ${xmlItems}
  </channel>
</rss>`;
}

/**
 * Generate Google Merchant Center XML feed
 */
export async function generateGoogleXMLFeed(products: FeedProduct[], options: FeedOptions): Promise<string> {
  return await generateFacebookXMLFeed(products, options); // Same format as Facebook
}

/**
 * Generate Yandex Market XML feed
 */
export async function generateYandexXMLFeed(products: FeedProduct[], options: FeedOptions): Promise<string> {
  const defaultLang = await getDefaultLanguage();
  const { language = defaultLang } = options;
  
  // Get unique categories
  const categories = Array.from(new Set(products.map(p => ({ id: p.categoryId, name: p.category }))))
    .filter(cat => cat.id > 0);

  const categoriesXml = categories.map(cat => 
    `<category id="${cat.id}">${cat.name}</category>`
  ).join('\n    ');

  const offersXml = products.map(product => `
    <offer id="${product.id}" available="true">
      <name><![CDATA[${product.name}]]></name>
      <description><![CDATA[${product.description || product.name}]]></description>
      <url>${product.link}</url>
      ${product.image ? `<picture>${product.image}</picture>` : ''}
      <price>${product.price}</price>
      <currencyId>ILS</currencyId>
      <categoryId>${product.categoryId}</categoryId>
      <delivery>true</delivery>
    </offer>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${new Date().toISOString()}">
  <shop>
    <name>eDAHouse</name>
    <company>eDAHouse</company>
    <url>${options.baseUrl}</url>
    <currencies>
      <currency id="ILS" rate="1"/>
    </currencies>
    <categories>
    ${categoriesXml}
    </categories>
    <offers>
    ${offersXml}
    </offers>
  </shop>
</yml_catalog>`;
}

/**
 * Generate CSV feed for Facebook
 */
export function generateFacebookCSVFeed(products: FeedProduct[]): string {
  const headers = [
    'id', 'title', 'description', 'availability', 'condition', 'price', 
    'link', 'image_link', 'brand', 'product_type', 'google_product_category'
  ].join(',');

  const rows = products.map(product => [
    product.id,
    `"${product.name.replace(/"/g, '""')}"`,
    `"${(product.description || product.name).replace(/"/g, '""')}"`,
    product.availability,
    'new',
    `${product.price} ILS`,
    product.link,
    product.image || '',
    'eDAHouse',
    `"${product.category.replace(/"/g, '""')}"`,
    'Food, Beverages & Tobacco'
  ].join(','));

  return [headers, ...rows].join('\n');
}

/**
 * Generate JSON feed (universal format)
 */
export async function generateJSONFeed(products: FeedProduct[], options: FeedOptions): Promise<string> {
  const feed = {
    title: `eDAHouse Product Feed - ${options.language?.toUpperCase() || 'RU'}`,
    link: options.baseUrl,
    description: `eDAHouse products for ${options.language || 'ru'}`,
    language: options.language || 'ru',
    updated: new Date().toISOString(),
    products: products
  };

  return JSON.stringify(feed, null, 2);
}