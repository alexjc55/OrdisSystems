import i18n from './i18n';
import { LANGUAGES } from './i18n';

// Store for language settings
let languageSettings: {
  defaultLanguage: string;
  enabledLanguages: string[];
} | null = null;

// Load language settings from database
export const loadLanguageSettings = async () => {
  try {
    const response = await fetch('/api/settings');
    if (response.ok) {
      const settings = await response.json();
      languageSettings = {
        defaultLanguage: settings.defaultLanguage || 'ru',
        enabledLanguages: settings.enabledLanguages || ['ru', 'en', 'he']
      };
      return languageSettings;
    }
  } catch (error) {
    console.log('Failed to load language settings from database');
  }
  
  // Fallback settings
  languageSettings = {
    defaultLanguage: 'ru',
    enabledLanguages: ['ru', 'en', 'he']
  };
  return languageSettings;
};

// Get enabled languages for UI components
export const getEnabledLanguages = () => {
  if (!languageSettings) {
    return ['ru', 'en', 'he']; // Default fallback
  }
  return languageSettings.enabledLanguages;
};

// Get default language
export const getDefaultLanguage = () => {
  if (!languageSettings) {
    return 'ru'; // Default fallback
  }
  return languageSettings.defaultLanguage;
};

// Check if a language is enabled
export const isLanguageEnabled = (lang: string) => {
  const enabled = getEnabledLanguages();
  return enabled.includes(lang);
};

// Initialize language from database settings
export const initializeLanguageFromSettings = async () => {
  await loadLanguageSettings();
  const defaultLang = getDefaultLanguage();
  
  // Only change language if it's different and enabled
  if (defaultLang !== i18n.language && isLanguageEnabled(defaultLang)) {
    await i18n.changeLanguage(defaultLang);
  }
};

// Get available languages for language selector (only enabled ones)
export const getAvailableLanguages = () => {
  const enabled = getEnabledLanguages();
  const available: Record<string, any> = {};
  
  enabled.forEach(lang => {
    if (LANGUAGES[lang as keyof typeof LANGUAGES]) {
      available[lang] = LANGUAGES[lang as keyof typeof LANGUAGES];
    }
  });
  
  return available;
};