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

// Language configuration
export const LANGUAGES = {
  ru: { 
    name: 'Русский', 
    nativeName: 'Русский',
    dir: 'ltr',
    flag: '🇷🇺'
  },
  en: { 
    name: 'English', 
    nativeName: 'English',
    dir: 'ltr',
    flag: '🇺🇸'
  },
  he: { 
    name: 'Hebrew', 
    nativeName: 'עברית',
    dir: 'rtl',
    flag: '🇮🇱'
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

// Initialize i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ru', // Set initial language
    fallbackLng: 'ru',
    defaultNS: 'common',
    ns: ['common', 'shop', 'admin'],
    
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    detection: {
      order: ['localStorage', 'querystring', 'navigator'],
      lookupLocalStorage: 'language',
      lookupQuerystring: 'lng',
      caches: ['localStorage'],
    },
    
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged',
      bindI18nStore: '',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i'],
    },
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