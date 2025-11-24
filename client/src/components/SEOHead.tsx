import { useEffect } from 'react';
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

export function SEOHead({ 
  title, 
  description, 
  keywords, 
  canonical,
  ogImage,
  geo 
}: SEOHeadProps) {
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
  });
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language || 'ru';

  useEffect(() => {
    // Update document title
    if (title) {
      document.title = title;
    } else if (settings?.storeName) {
      document.title = `${settings.storeName} - Доставка готовой еды`;
    }

    // Update meta description with optimal length (155 chars)
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && description) {
      const optimizedDescription = description.length > 155 
        ? description.substring(0, 152) + '...' 
        : description;
      metaDescription.setAttribute('content', optimizedDescription);
    }

    // Update meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords && keywords) {
      metaKeywords.setAttribute('content', keywords);
    }

    // Update canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    if (canonical) {
      canonicalLink.setAttribute('href', window.location.origin + canonical);
    }

    // Update hreflang tags for multilingual support
    const languages = ['ru', 'en', 'he', 'ar'];
    const existingHreflangs = document.querySelectorAll('link[rel="alternate"]');
    existingHreflangs.forEach(link => link.remove());

    languages.forEach(lang => {
      const hreflangLink = document.createElement('link');
      hreflangLink.setAttribute('rel', 'alternate');
      hreflangLink.setAttribute('hreflang', HREFLANG_MAP[lang]);
      const langPath = lang === 'ru' ? '' : `/${lang}`;
      const currentPath = window.location.pathname.replace(/^\/(en|he|ar)/, '');
      hreflangLink.setAttribute('href', window.location.origin + langPath + currentPath);
      document.head.appendChild(hreflangLink);
    });

    // Add x-default hreflang
    const defaultHreflang = document.createElement('link');
    defaultHreflang.setAttribute('rel', 'alternate');
    defaultHreflang.setAttribute('hreflang', 'x-default');
    defaultHreflang.setAttribute('href', window.location.origin + '/');
    document.head.appendChild(defaultHreflang);

    // Update Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && title) {
      ogTitle.setAttribute('content', title);
    }

    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription && description) {
      ogDescription.setAttribute('content', description);
    }

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', window.location.href);
    }

    // Update og:locale dynamically based on current language
    let ogLocale = document.querySelector('meta[property="og:locale"]');
    if (!ogLocale) {
      ogLocale = document.createElement('meta');
      ogLocale.setAttribute('property', 'og:locale');
      document.head.appendChild(ogLocale);
    }
    ogLocale.setAttribute('content', LOCALE_MAP[currentLanguage] || 'ru_RU');

    // Add og:locale:alternate for other languages
    const existingAlternates = document.querySelectorAll('meta[property="og:locale:alternate"]');
    existingAlternates.forEach(meta => meta.remove());
    
    languages.forEach(lang => {
      if (lang !== currentLanguage) {
        const altLocale = document.createElement('meta');
        altLocale.setAttribute('property', 'og:locale:alternate');
        altLocale.setAttribute('content', LOCALE_MAP[lang]);
        document.head.appendChild(altLocale);
      }
    });

    // Update og:image (CRITICAL for social sharing)
    let ogImageTag = document.querySelector('meta[property="og:image"]');
    if (!ogImageTag) {
      ogImageTag = document.createElement('meta');
      ogImageTag.setAttribute('property', 'og:image');
      document.head.appendChild(ogImageTag);
    }
    if (ogImage) {
      const imageUrl = ogImage.startsWith('http') ? ogImage : window.location.origin + ogImage;
      ogImageTag.setAttribute('content', imageUrl);
    } else if (settings?.logoUrl) {
      const imageUrl = settings.logoUrl.startsWith('http') ? settings.logoUrl : window.location.origin + settings.logoUrl;
      ogImageTag.setAttribute('content', imageUrl);
    }

    // Add og:image:width and og:image:height
    let ogImageWidth = document.querySelector('meta[property="og:image:width"]');
    if (!ogImageWidth) {
      ogImageWidth = document.createElement('meta');
      ogImageWidth.setAttribute('property', 'og:image:width');
      ogImageWidth.setAttribute('content', '1200');
      document.head.appendChild(ogImageWidth);
    }

    let ogImageHeight = document.querySelector('meta[property="og:image:height"]');
    if (!ogImageHeight) {
      ogImageHeight = document.createElement('meta');
      ogImageHeight.setAttribute('property', 'og:image:height');
      ogImageHeight.setAttribute('content', '630');
      document.head.appendChild(ogImageHeight);
    }

    // Update Twitter Card tags
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle && title) {
      twitterTitle.setAttribute('content', title);
    }

    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription && description) {
      twitterDescription.setAttribute('content', description);
    }

    // Update twitter:image (CRITICAL for Twitter sharing)
    let twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (!twitterImage) {
      twitterImage = document.createElement('meta');
      twitterImage.setAttribute('name', 'twitter:image');
      document.head.appendChild(twitterImage);
    }
    if (ogImage) {
      const imageUrl = ogImage.startsWith('http') ? ogImage : window.location.origin + ogImage;
      twitterImage.setAttribute('content', imageUrl);
    } else if (settings?.logoUrl) {
      const imageUrl = settings.logoUrl.startsWith('http') ? settings.logoUrl : window.location.origin + settings.logoUrl;
      twitterImage.setAttribute('content', imageUrl);
    }

    // Update GEO meta tags for local business
    if (geo) {
      let geoRegion = document.querySelector('meta[name="geo.region"]');
      if (!geoRegion && geo.region) {
        geoRegion = document.createElement('meta');
        geoRegion.setAttribute('name', 'geo.region');
        document.head.appendChild(geoRegion);
      }
      if (geoRegion && geo.region) {
        geoRegion.setAttribute('content', geo.region);
      }

      let geoPlacename = document.querySelector('meta[name="geo.placename"]');
      if (!geoPlacename && geo.placename) {
        geoPlacename = document.createElement('meta');
        geoPlacename.setAttribute('name', 'geo.placename');
        document.head.appendChild(geoPlacename);
      }
      if (geoPlacename && geo.placename) {
        geoPlacename.setAttribute('content', geo.placename);
      }

      let geoPosition = document.querySelector('meta[name="geo.position"]');
      if (!geoPosition && geo.position) {
        geoPosition = document.createElement('meta');
        geoPosition.setAttribute('name', 'geo.position');
        document.head.appendChild(geoPosition);
      }
      if (geoPosition && geo.position) {
        geoPosition.setAttribute('content', geo.position);
      }
    }

    // Add/Update structured data for local business
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    if (settings) {
      const structuredData = {
        "@context": "https://schema.org",
        "@type": "Restaurant",
        "name": settings.storeName || "eDAHouse",
        "description": settings.welcomeTitle || "Доставка готовой еды на дом",
        "url": window.location.origin,
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
        "image": ogImage || settings.logoUrl || undefined
      };

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
  }, [title, description, keywords, canonical, ogImage, geo, settings, currentLanguage]);

  return null;
}

// Hook for easy SEO management
export function useSEO({
  title,
  description,
  keywords,
  canonical,
  ogImage,
  geo
}: SEOHeadProps) {
  return <SEOHead 
    title={title}
    description={description}
    keywords={keywords}
    canonical={canonical}
    ogImage={ogImage}
    geo={geo}
  />;
}