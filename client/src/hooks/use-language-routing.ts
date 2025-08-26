import { useLocation, useRouter } from "wouter";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { LANGUAGES } from "@/lib/i18n";

export type LanguageCode = keyof typeof LANGUAGES;

// Extract language from URL path
export function extractLanguageFromPath(path: string): { language: LanguageCode | null; cleanPath: string } {
  const segments = path.split('/').filter(Boolean);
  const firstSegment = segments[0];
  
  if (firstSegment && Object.keys(LANGUAGES).includes(firstSegment)) {
    return {
      language: firstSegment as LanguageCode,
      cleanPath: '/' + segments.slice(1).join('/')
    };
  }
  
  return {
    language: null,
    cleanPath: path
  };
}

// Build URL with language prefix
export function buildLanguageUrl(path: string, language: LanguageCode): string {
  // Don't add prefix for Russian (default language)
  if (language === 'ru') {
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
  
  // Extract current language and clean path from URL
  const { language: urlLanguage, cleanPath } = extractLanguageFromPath(location);
  
  // Determine current language (URL takes precedence, fallback to i18n)
  const currentLanguage = urlLanguage || 'ru';
  
  // Function to navigate with language prefix
  const navigateWithLanguage = (path: string, language?: LanguageCode) => {
    const targetLanguage = language || currentLanguage;
    const newUrl = buildLanguageUrl(path, targetLanguage);
    navigate(newUrl);
  };
  
  // Function to change language and stay on same page
  const changeLanguage = (newLanguage: LanguageCode) => {
    const newUrl = buildLanguageUrl(cleanPath, newLanguage);
    
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
    isDefaultLanguage: currentLanguage === 'ru'
  };
}