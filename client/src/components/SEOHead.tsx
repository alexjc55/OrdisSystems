import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  geo?: {
    region?: string;
    placename?: string;
    position?: string;
  };
  categories?: Array<{
    id: number;
    name: string;
    description?: string;
    url: string;
  }>;
  products?: Array<{
    id: number;
    name: string;
    description?: string;
    url: string;
  }>;
  productsListTitle?: string; // Custom title for products ItemList
}

const LOCALE_MAP: { [key: string]: string } = {
  'ru': 'ru_RU',
  'en': 'en_US',
  'he': 'he_IL',
  'ar': 'ar_SA'
};

const HREFLANG_MAP: { [key: string]: string } = {
  'ru': 'ru',
  'en': 'en',
  'he': 'he',
  'ar': 'ar'
};

// Helper to check if we're in browser environment
const isBrowser = typeof window !== 'undefined';

// Helper to get full URL for images
function getFullImageUrl(imageUrl: string): string {
  if (!isBrowser) return imageUrl;
  return imageUrl.startsWith('http') ? imageUrl : window.location.origin + imageUrl;
}

// Helper to get current URL components (SSR-safe)
function getUrlComponents() {
  if (!isBrowser) {
    return {
      origin: '',
      pathname: '/',
      search: '',
      hash: '',
      href: ''
    };
  }
  
  return {
    origin: window.location.origin,
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    href: window.location.href
  };
}

export function SEOHead({ 
  title, 
  description, 
  keywords, 
  canonical,
  ogImage,
  geo,
  categories,
  products,
  productsListTitle
}: SEOHeadProps) {
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
  });
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language || 'ru';
  const languages = ['ru', 'en', 'he', 'ar'];
  
  // Get URL components (SSR-safe)
  const { origin, pathname, search, hash, href } = getUrlComponents();
  
  // Optimize description length (SEO best practice: 155 chars)
  const optimizedDescription = description && description.length > 155 
    ? description.substring(0, 152) + '...' 
    : description;

  // Build full title
  const settingsData = settings as any;
  const fullTitle = title || (settingsData?.storeName 
    ? `${settingsData.storeName} - Доставка готовой еды` 
    : 'eDAHouse - Доставка готовой еды');

  // Build canonical URL
  const canonicalUrl = canonical ? origin + canonical : href;

  // Build hreflang links
  const currentPath = pathname.replace(/^\/(en|he|ar)/, '');
  const hreflangLinks = languages.map(lang => {
    const langPath = lang === 'ru' ? '' : `/${lang}`;
    return {
      rel: 'alternate',
      hreflang: HREFLANG_MAP[lang],
      href: origin + langPath + currentPath + search + hash
    };
  });

  // Add x-default hreflang
  hreflangLinks.push({
    rel: 'alternate',
    hreflang: 'x-default',
    href: origin + currentPath + search + hash
  });

  // Determine og:image URL
  let ogImageUrl = '';
  if (ogImage) {
    ogImageUrl = getFullImageUrl(ogImage);
  } else if (settingsData?.logoUrl) {
    ogImageUrl = getFullImageUrl(settingsData.logoUrl);
  }

  // Build og:locale alternates
  const ogLocaleAlternates = languages
    .filter(lang => lang !== currentLanguage)
    .map(lang => LOCALE_MAP[lang]);

  // Build structured data for Restaurant with delivery info
  const structuredData = settingsData ? {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": settingsData.storeName || "eDAHouse",
    "description": settingsData.welcomeTitle || "Доставка готовой еды на дом",
    "url": origin,
    "telephone": settingsData.contactPhone || "",
    "email": settingsData.contactEmail || "",
    "address": settingsData.address ? {
      "@type": "PostalAddress",
      "streetAddress": settingsData.address
    } : undefined,
    "servesCuisine": "Домашняя кухня",
    "priceRange": "$$",
    "serviceType": "Доставка еды",
    "areaServed": "Местная доставка",
    "openingHours": settingsData.workingHours ? 
      Object.entries(settingsData.workingHours)
        .filter(([_, hours]: [string, any]) => hours.isOpen)
        .map(([day, hours]: [string, any]) => {
          const dayMap: { [key: string]: string } = {
            'monday': 'Mo',
            'tuesday': 'Tu', 
            'wednesday': 'We',
            'thursday': 'Th',
            'friday': 'Fr',
            'saturday': 'Sa',
            'sunday': 'Su'
          };
          return `${dayMap[day]} ${hours.open}-${hours.close}`;
        }) : undefined,
    "image": ogImageUrl || undefined,
    // Delivery information
    "hasDeliveryMethod": settingsData.deliveryFee || settingsData.freeDeliveryFrom ? {
      "@type": "DeliveryMethod",
      "name": "Доставка на дом",
      "deliveryTime": settingsData.deliveryInfo || "В соответствии с расписанием работы",
      "deliveryCharge": settingsData.deliveryFee ? {
        "@type": "MonetaryAmount",
        "value": parseFloat(settingsData.deliveryFee),
        "currency": "ILS"
      } : undefined,
      "offers": settingsData.freeDeliveryFrom ? {
        "@type": "Offer",
        "name": "Бесплатная доставка",
        "eligibleTransactionVolume": {
          "@type": "PriceSpecification",
          "price": parseFloat(settingsData.freeDeliveryFrom),
          "priceCurrency": "ILS"
        }
      } : undefined
    } : undefined,
    // Payment methods
    "paymentAccepted": settingsData.paymentMethods && Array.isArray(settingsData.paymentMethods) 
      ? settingsData.paymentMethods.filter((pm: any) => pm.enabled).map((pm: any) => pm.name)
      : ["Наличные", "Кредитная карта"]
  } : null;

  // Build ItemList for categories (for sitelinks in Google)
  const categoriesListData = categories && categories.length > 0 ? {
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
  } : null;

  // Build ItemList for products (for special offers/featured products)
  const productsListData = products && products.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": productsListTitle || "Специальные предложения",
    "description": "Популярные блюда с доставкой",
    "itemListElement": products.map((product, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": product.name,
      "description": product.description || product.name,
      "url": origin + product.url
    }))
  } : null;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      {optimizedDescription && <meta name="description" content={optimizedDescription} />}
      {keywords && <meta name="keywords" content={keywords} />}
      <html lang={currentLanguage} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Hreflang Links for Multilingual SEO */}
      {hreflangLinks.map((link, index) => (
        <link key={index} {...link} />
      ))}
      
      {/* Open Graph Tags */}
      <meta property="og:type" content="website" />
      {title && <meta property="og:title" content={title} />}
      {optimizedDescription && <meta property="og:description" content={optimizedDescription} />}
      <meta property="og:url" content={href} />
      <meta property="og:locale" content={LOCALE_MAP[currentLanguage] || 'ru_RU'} />
      
      {/* og:locale:alternate for other languages */}
      {ogLocaleAlternates.map((locale, index) => (
        <meta key={index} property="og:locale:alternate" content={locale} />
      ))}
      
      {/* og:image (CRITICAL for social sharing) */}
      {ogImageUrl && (
        <>
          <meta property="og:image" content={ogImageUrl} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
        </>
      )}
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      {title && <meta name="twitter:title" content={title} />}
      {optimizedDescription && <meta name="twitter:description" content={optimizedDescription} />}
      {ogImageUrl && <meta name="twitter:image" content={ogImageUrl} />}
      
      {/* GEO Meta Tags for Local Business */}
      {geo?.region && <meta name="geo.region" content={geo.region} />}
      {geo?.placename && <meta name="geo.placename" content={geo.placename} />}
      {geo?.position && <meta name="geo.position" content={geo.position} />}
      
      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json" data-restaurant="true">
          {JSON.stringify(structuredData)}
        </script>
      )}
      
      {/* Categories ItemList for Sitelinks */}
      {categoriesListData && (
        <script type="application/ld+json" data-categories="true">
          {JSON.stringify(categoriesListData)}
        </script>
      )}
      
      {/* Products ItemList for Featured Products */}
      {productsListData && (
        <script type="application/ld+json" data-products="true">
          {JSON.stringify(productsListData)}
        </script>
      )}
    </Helmet>
  );
}

// Hook for easy SEO management
export function useSEO({
  title,
  description,
  keywords,
  canonical,
  ogImage,
  geo,
  categories,
  products,
  productsListTitle
}: SEOHeadProps) {
  return <SEOHead 
    title={title}
    description={description}
    keywords={keywords}
    canonical={canonical}
    ogImage={ogImage}
    geo={geo}
    categories={categories}
    products={products}
    productsListTitle={productsListTitle}
  />;
}

// Add Product structured data for product pages (browser-only)
export function addProductStructuredData(product: {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category?: string;
  isAvailable?: boolean;
}) {
  if (!isBrowser) return;
  
  const existingProductScript = document.querySelector('script[type="application/ld+json"][data-product]');
  if (existingProductScript) {
    existingProductScript.remove();
  }

  const productData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description || product.name,
    "image": product.imageUrl ? getFullImageUrl(product.imageUrl) : undefined,
    "category": product.category || "Готовая еда",
    "offers": {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": "ILS",
      "availability": product.isAvailable !== false ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "url": window.location.href,
      "seller": {
        "@type": "Restaurant",
        "name": "eDAHouse"
      }
    }
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-product', 'true');
  script.textContent = JSON.stringify(productData);
  document.head.appendChild(script);
}

// Add BreadcrumbList structured data (browser-only)
export function addBreadcrumbStructuredData(items: Array<{ name: string; url: string }>) {
  if (!isBrowser) return;
  
  const existingBreadcrumbScript = document.querySelector('script[type="application/ld+json"][data-breadcrumb]');
  if (existingBreadcrumbScript) {
    existingBreadcrumbScript.remove();
  }

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": window.location.origin + item.url
    }))
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-breadcrumb', 'true');
  script.textContent = JSON.stringify(breadcrumbData);
  document.head.appendChild(script);
}
