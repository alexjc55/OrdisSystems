import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { LANGUAGES, Language, isRTL, updateDocumentDirection } from '../lib/i18n';

export function useLanguage() {
  const { i18n } = useTranslation();
  
  // Load store settings to get language configuration
  const { data: storeSettings } = useQuery({
    queryKey: ['/api/settings'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  
  const currentLanguage = (i18n.language || 'ru') as Language;
  const currentLanguageInfo = LANGUAGES[currentLanguage] || LANGUAGES.ru;
  
  // Get enabled languages from database settings
  const getEnabledLanguages = () => {
    if (storeSettings?.enabledLanguages && Array.isArray(storeSettings.enabledLanguages)) {
      const enabledLangs: Record<string, any> = {};
      storeSettings.enabledLanguages.forEach((lang: string) => {
        if (LANGUAGES[lang as keyof typeof LANGUAGES]) {
          enabledLangs[lang] = LANGUAGES[lang as keyof typeof LANGUAGES];
        }
      });
      return enabledLangs;
    }
    return LANGUAGES; // Fallback to all languages if no settings
  };
  
  const changeLanguage = async (lng: Language) => {
    console.log('Changing language to:', lng);
    await i18n.changeLanguage(lng);
    updateDocumentDirection(lng);
    localStorage.setItem('language', lng);
    // Force re-render by triggering a small delay
    setTimeout(() => {
      window.dispatchEvent(new Event('languageChanged'));
    }, 100);
  };
  
  return {
    currentLanguage,
    currentLanguageInfo,
    isCurrentRTL: isRTL(currentLanguage),
    languages: getEnabledLanguages(), // Use enabled languages from database
    allLanguages: LANGUAGES, // All available languages
    defaultLanguage: storeSettings?.defaultLanguage || 'ru',
    enabledLanguages: storeSettings?.enabledLanguages || ['ru', 'en', 'he'],
    changeLanguage,
  };
}

// Hook for common translations
export function useCommonTranslation() {
  return useTranslation('common');
}

// Hook for shop translations  
export function useShopTranslation() {
  return useTranslation('shop');
}

// Hook for admin translations
export function useAdminTranslation() {
  return useTranslation('admin');
}