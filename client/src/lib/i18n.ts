import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import commonRu from '../locales/ru/common.json';
import shopRu from '../locales/ru/shop.json';
import adminRu from '../locales/ru/admin.json';

import commonEn from '../locales/en/common.json';
import shopEn from '../locales/en/shop.json';
import adminEn from '../locales/en/admin.json';

import commonHe from '../locales/he/common.json';
import shopHe from '../locales/he/shop.json';
import adminHe from '../locales/he/admin.json';

import commonAr from '../locales/ar/common.json';
import shopAr from '../locales/ar/shop.json';
import adminAr from '../locales/ar/admin.json';

// Language configuration with CSS flag classes for better browser compatibility
// Hebrew first as requested
export const LANGUAGES = {
  he: { 
    name: 'Hebrew', 
    nativeName: 'עברית',
    dir: 'rtl',
    flag: 'HE',
    flagClass: 'flag-he'
  },
  ar: {
    name: 'Arabic',
    nativeName: 'العربية',
    dir: 'rtl',
    flag: 'AR',
    flagClass: 'flag-ar'
  },
  ru: { 
    name: 'Русский', 
    nativeName: 'Русский',
    dir: 'ltr',
    flag: 'RU',
    flagClass: 'flag-ru'
  },
  en: { 
    name: 'English', 
    nativeName: 'English',
    dir: 'ltr',
    flag: 'EN',
    flagClass: 'flag-en'
  }
} as const;

export type Language = keyof typeof LANGUAGES;

// Translation resources
const resources = {
  ru: {
    common: commonRu,
    shop: shopRu,
    admin: adminRu,
  },
  en: {
    common: commonEn,
    shop: shopEn,
    admin: adminEn,
  },
  he: {
    common: commonHe,
    shop: shopHe,
    admin: adminHe,
  },
  ar: {
    common: commonAr,
    shop: shopAr,
    admin: adminAr,
  },
};

// RTL languages
export const RTL_LANGUAGES = ['he', 'ar'] as const;

// Check if language is RTL
export const isRTL = (lng: string): boolean => {
  return RTL_LANGUAGES.includes(lng as any);
};

// Update document direction based on language
export const updateDocumentDirection = (lng: string) => {
  const direction = isRTL(lng) ? 'rtl' : 'ltr';
  document.documentElement.dir = direction;
  document.documentElement.lang = lng;
  
  // Update CSS custom properties for RTL
  const root = document.documentElement;
  if (isRTL(lng)) {
    root.style.setProperty('--text-align-start', 'right');
    root.style.setProperty('--text-align-end', 'left');
    root.style.setProperty('--margin-start', '0');
    root.style.setProperty('--margin-end', '1rem');
    root.style.setProperty('--padding-start', '0');
    root.style.setProperty('--padding-end', '1rem');
  } else {
    root.style.setProperty('--text-align-start', 'left');
    root.style.setProperty('--text-align-end', 'right');
    root.style.setProperty('--margin-start', '1rem');
    root.style.setProperty('--margin-end', '0');
    root.style.setProperty('--padding-start', '1rem');
    root.style.setProperty('--padding-end', '0');
  }
};

// Get initial language from localStorage (database loading happens later)
const getInitialLanguage = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('language');
    if (saved && Object.keys(LANGUAGES).includes(saved)) {
      return saved;
    }
  }
  return 'ru';
};

// Initialize i18n with localStorage language first
const initialLang = getInitialLanguage();
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: 'en', // Use English as fallback instead of Russian
    defaultNS: 'common',
    ns: ['common', 'shop', 'admin'],
    
    interpolation: {
      escapeValue: false,
    },
    
    detection: {
      order: ['localStorage', 'querystring', 'navigator'],
      lookupLocalStorage: 'language',
      lookupQuerystring: 'lng',
      caches: [],
    },
    
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged',
      bindI18nStore: '',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i'],
    },
    
    // Force synchronous loading
    partialBundledLanguages: true,
    debug: false,
    
    // Prevent showing keys when translation is missing
    saveMissing: false,
    missingKeyHandler: false,
    
    // Return fallback for missing translations  
    returnEmptyString: false,
    returnNull: false,
    returnObjects: false,
    // Disable keySeparator to prevent namespace issues
    keySeparator: '.',
    nsSeparator: ':',
  })
  .then(() => {

    
    // Apply initial direction
    updateDocumentDirection(initialLang);
    
    // Ensure all namespaces are loaded
    return Promise.all([
      i18n.loadNamespaces(['common', 'shop', 'admin']),
      i18n.changeLanguage(initialLang)
    ]);
  });

// Listen for language changes and update document direction
i18n.on('languageChanged', (lng) => {
  updateDocumentDirection(lng);
});

// Force load all namespaces for all languages
Object.keys(LANGUAGES).forEach(lang => {
  ['common', 'shop', 'admin'].forEach(ns => {
    i18n.loadNamespaces(ns);
  });
});

// Initialize document direction on load
updateDocumentDirection(i18n.language || 'ru');

export default i18n;