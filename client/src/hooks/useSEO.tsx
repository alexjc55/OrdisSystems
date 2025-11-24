import { SEOHead } from '@/components/SEOHead';

/**
 * DEPRECATED: This hook now uses SEOHead component internally
 * Consider using SEOHead component directly in your pages
 */
interface SEOData {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical?: string;
}

/**
 * Legacy hook that wraps the new SEOHead component
 * Maintains backward compatibility with existing pages
 */
export function useSEO(seoData: SEOData) {
  // Return JSX component for use in page
  return (
    <SEOHead
      title={seoData.title}
      description={seoData.description}
      keywords={seoData.keywords}
      ogImage={seoData.ogImage}
      canonical={seoData.canonical}
    />
  );
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