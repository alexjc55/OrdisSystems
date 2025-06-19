import { useTranslation } from 'react-i18next';
import { LANGUAGES, Language, isRTL, updateDocumentDirection } from '../lib/i18n';

export function useLanguage() {
  const { i18n } = useTranslation();
  
  const currentLanguage = i18n.language as Language;
  const currentLanguageInfo = LANGUAGES[currentLanguage] || LANGUAGES.ru;
  
  const changeLanguage = (lng: Language) => {
    i18n.changeLanguage(lng);
    updateDocumentDirection(lng);
  };
  
  return {
    currentLanguage,
    currentLanguageInfo,
    isCurrentRTL: isRTL(currentLanguage),
    languages: LANGUAGES,
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