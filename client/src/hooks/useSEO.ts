import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface SEOData {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical?: string;
}

export function useSEO(seoData: SEOData) {
  const { i18n } = useTranslation();

  useEffect(() => {
    console.log('SEO Hook called with data:', seoData);
    
    // Update document title
    if (seoData.title) {
      document.title = seoData.title;
      console.log('Updated title to:', seoData.title);
    }

    // Update meta description
    updateMetaTag('name', 'description', seoData.description);
    
    // Update meta keywords
    updateMetaTag('name', 'keywords', seoData.keywords);

    // Update Open Graph tags
    updateMetaTag('property', 'og:title', seoData.ogTitle || seoData.title);
    updateMetaTag('property', 'og:description', seoData.ogDescription || seoData.description);
    updateMetaTag('property', 'og:image', seoData.ogImage);

    // Update Twitter tags
    updateMetaTag('name', 'twitter:title', seoData.ogTitle || seoData.title);
    updateMetaTag('name', 'twitter:description', seoData.ogDescription || seoData.description);
    updateMetaTag('name', 'twitter:image', seoData.ogImage);

    // Update HTML lang attribute
    document.documentElement.lang = i18n.language;

    // Update canonical URL
    if (seoData.canonical) {
      updateLinkTag('canonical', seoData.canonical);
    }
  }, [seoData, i18n.language]);
}

function updateMetaTag(attribute: string, value: string, content?: string) {
  if (!content) return;

  console.log(`Updating meta tag: ${attribute}="${value}" content="${content}"`);
  
  let tag = document.querySelector(`meta[${attribute}="${value}"]`);
  
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, value);
    document.head.appendChild(tag);
    console.log(`Created new meta tag: ${attribute}="${value}"`);
  }
  
  tag.setAttribute('content', content);
  console.log(`Updated meta tag content to: ${content}`);
}

function updateLinkTag(rel: string, href: string) {
  let tag = document.querySelector(`link[rel="${rel}"]`);
  
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  
  tag.setAttribute('href', href);
}

// Generate keywords from title and description
export function generateKeywords(title?: string, description?: string): string {
  if (!title && !description) return '';
  
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  
  // Extract meaningful words (longer than 2 characters, not common words)
  const excludeWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'из', 'на', 'в', 'и', 'с', 'для', 'от', 'до', 'по', 'за', 'את', 'של', 'על', 'עם', 'אל', 'من', 'في', 'على', 'مع', 'إلى'];
  
  const words = text
    .replace(/[^\w\s\u0590-\u05FF\u0600-\u06FF]/g, ' ') // Keep Hebrew, Arabic, and Latin characters
    .split(/\s+/)
    .filter(word => word.length > 2 && !excludeWords.includes(word))
    .slice(0, 10); // Limit to 10 keywords
  
  return Array.from(new Set(words)).join(', '); // Remove duplicates and join
}