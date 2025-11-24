/**
 * Shared SEO Schema Generators
 * Used by both client-side SEOHead component and server-side bot meta injection
 */

interface StoreSettings {
  storeName?: string;
  welcomeTitle?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  workingHours?: {
    [key: string]: { isOpen: boolean; open: string; close: string };
  };
  deliveryFee?: string;
  freeDeliveryFrom?: string;
  deliveryInfo?: string;
  paymentMethods?: Array<{ name: string; enabled: boolean }>;
}

interface Category {
  id: number;
  name: string;
  description?: string;
  url: string;
}

interface Product {
  id: number;
  name: string;
  description?: string;
  url: string;
  price?: number;
  imageUrl?: string;
  category?: string;
  isAvailable?: boolean;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Generate Restaurant structured data schema
 */
export function generateRestaurantSchema(
  settings: StoreSettings | null,
  origin: string,
  logoUrl?: string
): object | null {
  if (!settings) return null;

  const dayMap: { [key: string]: string } = {
    'monday': 'Mo',
    'tuesday': 'Tu', 
    'wednesday': 'We',
    'thursday': 'Th',
    'friday': 'Fr',
    'saturday': 'Sa',
    'sunday': 'Su'
  };

  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": settings.storeName || "eDAHouse",
    "description": settings.welcomeTitle || "Доставка готовой еды на дом",
    "url": origin,
    "telephone": settings.contactPhone || "",
    "email": settings.contactEmail || "",
    "address": settings.address ? {
      "@type": "PostalAddress",
      "streetAddress": settings.address
    } : undefined,
    "servesCuisine": "Домашняя кухня",
    "priceRange": "$$",
    "serviceType": "Доставка еды",
    "areaServed": "Местная доставка",
    "openingHours": settings.workingHours ? 
      Object.entries(settings.workingHours)
        .filter(([_, hours]: [string, any]) => hours.isOpen)
        .map(([day, hours]: [string, any]) => {
          return `${dayMap[day]} ${hours.open}-${hours.close}`;
        }) : undefined,
    "image": logoUrl || undefined,
    // Delivery information
    "hasDeliveryMethod": settings.deliveryFee || settings.freeDeliveryFrom ? {
      "@type": "DeliveryMethod",
      "name": "Доставка на дом",
      "deliveryTime": settings.deliveryInfo || "В соответствии с расписанием работы",
      "deliveryCharge": settings.deliveryFee ? {
        "@type": "MonetaryAmount",
        "value": parseFloat(settings.deliveryFee),
        "currency": "ILS"
      } : undefined,
      "offers": settings.freeDeliveryFrom ? {
        "@type": "Offer",
        "name": "Бесплатная доставка",
        "eligibleTransactionVolume": {
          "@type": "PriceSpecification",
          "price": parseFloat(settings.freeDeliveryFrom),
          "priceCurrency": "ILS"
        }
      } : undefined
    } : undefined,
    // Payment methods
    "paymentAccepted": settings.paymentMethods && Array.isArray(settings.paymentMethods) 
      ? settings.paymentMethods.filter((pm: any) => pm.enabled).map((pm: any) => pm.name)
      : ["Наличные", "Кредитная карта"]
  };
}

/**
 * Generate ItemList schema for categories (for Google sitelinks)
 */
export function generateCategoriesItemListSchema(
  categories: Category[],
  origin: string
): object | null {
  if (!categories || categories.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Категории товаров",
    "description": "Категории блюд для доставки",
    "itemListElement": categories.map((category, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": category.name,
      "description": category.description || category.name,
      "url": origin + category.url
    }))
  };
}

/**
 * Generate ItemList schema for products (for special offers/featured products)
 */
export function generateProductsItemListSchema(
  products: Product[],
  origin: string,
  title?: string
): object | null {
  if (!products || products.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": title || "Специальные предложения",
    "description": "Популярные блюда с доставкой",
    "itemListElement": products.map((product, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": product.name,
      "description": product.description || product.name,
      "url": origin + product.url
    }))
  };
}

/**
 * Generate Product structured data schema
 */
export function generateProductSchema(
  product: Product,
  origin: string,
  currentUrl: string
): object {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description || product.name,
    "image": product.imageUrl ? (product.imageUrl.startsWith('http') ? product.imageUrl : origin + product.imageUrl) : undefined,
    "category": product.category || "Готовая еда",
    "offers": {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": "ILS",
      "availability": product.isAvailable !== false ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "url": currentUrl,
      "seller": {
        "@type": "Restaurant",
        "name": "eDAHouse"
      }
    }
  };
}

/**
 * Generate BreadcrumbList structured data schema
 */
export function generateBreadcrumbSchema(
  items: BreadcrumbItem[],
  origin: string
): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": origin + item.url
    }))
  };
}

/**
 * Helper to generate full URL for images
 */
export function getFullImageUrl(imageUrl: string, origin: string): string {
  return imageUrl.startsWith('http') ? imageUrl : origin + imageUrl;
}
