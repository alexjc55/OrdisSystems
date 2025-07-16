import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { LANGUAGES, Language, isRTL, updateDocumentDirection } from '../lib/i18n';

type StoreSettingsWithLanguage = {
  defaultLanguage?: string;
  enabledLanguages?: string[];
  [key: string]: any;
};

export function useLanguage() {
  const { i18n } = useTranslation();
  
  // Load store settings to get language configuration
  const { data: storeSettings } = useQuery({
    queryKey: ['/api/settings'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  }) as { data: StoreSettingsWithLanguage | undefined };
  
  const currentLanguage = (i18n.language || 'ru') as Language;
  const currentLanguageInfo = LANGUAGES[currentLanguage] || LANGUAGES.ru;
  
  // Get enabled languages from database settings with fixed order (Hebrew first)
  const getEnabledLanguages = () => {
    const languageOrder = ['he', 'ar', 'ru', 'en']; // Hebrew first, then Arabic as requested
    
    if (storeSettings?.enabledLanguages && Array.isArray(storeSettings.enabledLanguages)) {
      const enabledLangs: Record<string, any> = {};
      // Maintain order by iterating through languageOrder
      languageOrder.forEach((lang) => {
        if (storeSettings.enabledLanguages?.includes(lang) && LANGUAGES[lang as keyof typeof LANGUAGES]) {
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
    enabledLanguages: storeSettings?.enabledLanguages || ['ru', 'en', 'he', 'ar'],
    changeLanguage,
  };
}

// Hook for common translations
export function useCommonTranslation() {
  const { t, i18n } = useTranslation('common');
  
  // Enhanced translation function with fallback
  const enhancedT = (key: string, fallback?: string) => {
    const translation = t(key);
    
    // If translation returns the key itself, it means translation is missing
    if (translation === key) {
      return fallback || key;
    }
    return translation;
  };
  
  return { t: enhancedT, i18n };
}

// Hook for shop translations  
export function useShopTranslation() {
  const { t, i18n } = useTranslation('shop');
  
  // Enhanced translation function with fallback
  const enhancedT = (key: string, fallback?: string) => {
    const translation = t(key);
    

    
    // If translation returns the key itself, it means translation is missing
    if (translation === key) {
      return fallback || key;
    }
    return translation;
  };
  
  return { t: enhancedT, i18n };
}

// Hook for admin translations
export function useAdminTranslation() {
  const { t, i18n } = useTranslation('admin');
  
  // Multilingual fallback values
  const fallbackValues: Record<string, Record<string, string>> = {
    'common.save': {
      ru: 'Сохранить',
      en: 'Save',
      he: 'שמור'
    },
    'common.saving': {
      ru: 'Сохранение...',
      en: 'Saving...',
      he: 'שומר...'
    },
    'common.saveChanges': {
      ru: 'Сохранить изменения',
      en: 'Save Changes',
      he: 'שמור שינויים'
    },
    'common.cancel': {
      ru: 'Отмена',
      en: 'Cancel',
      he: 'ביטול'
    },
    'common.delete': {
      ru: 'Удалить',
      en: 'Delete',
      he: 'מחק'
    },
    'common.free': {
      ru: 'Бесплатно',
      en: 'Free',
      he: 'חינם'
    },
    'common.error': {
      ru: 'Ошибка',
      en: 'Error',
      he: 'שגיאה'
    }
  };
  
  // Enhanced translation function with multilingual fallback
  const enhancedT = (key: string, fallback?: string) => {
    try {
      const translation = t(key);
      
      // Add debugging for specific problematic keys
      if (key.startsWith('settings.') && i18n.language === 'he') {
        console.log('🐛 Admin Translation Debug:', {
          key,
          translation,
          currentLanguage: i18n.language,
          translationExists: translation !== key,
          i18nResources: i18n.getResourceBundle('he', 'admin'),
          settingsSection: i18n.getResourceBundle('he', 'admin')?.settings
        });
      }
      
      // If translation returns the key itself or is empty, use fallback or multilingual fallback
      if (translation === key || !translation || translation.trim() === '') {
        // Try to get language-specific fallback
        const currentLang = i18n.language;
        const langFallback = fallbackValues[key]?.[currentLang];
        if (langFallback) {
          return langFallback;
        }
        // Use provided fallback or key parts
        return fallback || key.split('.').pop() || key;
      }
      return translation;
    } catch (error) {
      console.error('Translation error for key:', key, error);
      const currentLang = i18n.language;
      const langFallback = fallbackValues[key]?.[currentLang];
      return langFallback || fallback || key.split('.').pop() || key;
    }
  };
  
  return { t: enhancedT, i18n };
}