import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
}

export function SEOHead({ 
  title, 
  description, 
  keywords, 
  canonical,
  ogImage 
}: SEOHeadProps) {
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
  });

  useEffect(() => {
    // Update document title
    if (title) {
      document.title = title;
    } else if (settings?.storeName) {
      document.title = `${settings.storeName} - Доставка готовой еды`;
    }

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && description) {
      metaDescription.setAttribute('content', description);
    }

    // Update meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords && keywords) {
      metaKeywords.setAttribute('content', keywords);
    }

    // Update canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    if (canonical) {
      canonicalLink.setAttribute('href', window.location.origin + canonical);
    }

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

    // Update Twitter Card tags
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle && title) {
      twitterTitle.setAttribute('content', title);
    }

    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription && description) {
      twitterDescription.setAttribute('content', description);
    }

    // Add structured data for local business
    if (settings && !document.querySelector('script[type="application/ld+json"]')) {
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
            }) : undefined
      };

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
  }, [title, description, keywords, canonical, ogImage, settings]);

  return null;
}

// Hook for easy SEO management
export function useSEO({
  title,
  description,
  keywords,
  canonical,
  ogImage
}: SEOHeadProps) {
  return <SEOHead 
    title={title}
    description={description}
    keywords={keywords}
    canonical={canonical}
    ogImage={ogImage}
  />;
}