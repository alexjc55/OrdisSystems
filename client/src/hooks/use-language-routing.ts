import { useLocation, useRouter } from "wouter";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { LANGUAGES } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";

export type LanguageCode = keyof typeof LANGUAGES;

// Extract language from URL path based on primary language
export function extractLanguageFromPath(path: string, primaryLanguage: LanguageCode = 'ru'): { language: LanguageCode | null; cleanPath: string } {
  const segments = path.split('/').filter(Boolean);
  const firstSegment = segments[0];
  
  if (firstSegment && Object.keys(LANGUAGES).includes(firstSegment)) {
    return {
      language: firstSegment as LanguageCode,
      cleanPath: '/' + segments.slice(1).join('/')
    };
  }
  
  // If no language prefix, assume primary language
  return {
    language: primaryLanguage,
    cleanPath: path
  };
}

// Build URL with language prefix based on primary language
export function buildLanguageUrl(path: string, language: LanguageCode, primaryLanguage: LanguageCode = 'ru'): string {
  // Don't add prefix for primary language
  if (language === primaryLanguage) {
    return path;
  }
  
  // Remove leading slash if exists for clean concatenation
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `/${language}/${cleanPath}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

export function useLanguageRouting() {
  const [location, navigate] = useLocation();
  const { i18n } = useTranslation();
  const router = useRouter();
  
  // Get store settings to determine primary language
  const { data: storeSettings } = useQuery({
    queryKey: ['/api/settings'],
  });
  
  // Extract primary language from store settings
  const primaryLanguage = (storeSettings?.primaryLanguage as LanguageCode) || 'ru';
  
  // Extract current language and clean path from URL
  const { language: urlLanguage, cleanPath } = extractLanguageFromPath(location, primaryLanguage);
  
  // Determine current language (URL takes precedence, fallback to primary language)
  const currentLanguage = urlLanguage || primaryLanguage;
  
  // Function to navigate with language prefix
  const navigateWithLanguage = (path: string, language?: LanguageCode) => {
    const targetLanguage = language || currentLanguage;
    const newUrl = buildLanguageUrl(path, targetLanguage, primaryLanguage);
    navigate(newUrl);
  };
  
  // Function to change language and stay on same page
  const changeLanguage = (newLanguage: LanguageCode) => {
    const newUrl = buildLanguageUrl(cleanPath, newLanguage, primaryLanguage);
    
    // Update i18n language
    i18n.changeLanguage(newLanguage);
    
    // Navigate to new URL
    navigate(newUrl);
  };
  
  // Sync URL language with i18n on mount and URL changes
  useEffect(() => {
    if (currentLanguage !== i18n.language) {
      i18n.changeLanguage(currentLanguage);
    }
  }, [currentLanguage, i18n]);
  
  return {
    currentLanguage,
    cleanPath,
    navigateWithLanguage,
    changeLanguage,
    urlLanguage,
    primaryLanguage,
    isDefaultLanguage: currentLanguage === primaryLanguage
  };
}