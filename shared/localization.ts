/**
 * Utilities for handling multilingual content
 */

export type SupportedLanguage = 'ru' | 'en' | 'he' | 'ar';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['ru', 'en', 'he', 'ar'];

export const LANGUAGE_NAMES = {
  ru: 'Русский',
  en: 'English',
  he: 'עברית',
  ar: 'العربية'
} as const;

/**
 * Get the display name of a language in the current language
 */
export function getLanguageDisplayName(
  targetLanguage: SupportedLanguage,
  currentLanguage: SupportedLanguage
): string {
  const languageNames = {
    ru: {
      ru: 'русского',
      en: 'английского', 
      he: 'иврита',
      ar: 'арабского'
    },
    en: {
      ru: 'Russian',
      en: 'English',
      he: 'Hebrew', 
      ar: 'Arabic'
    },
    he: {
      ru: 'רוסית',
      en: 'אנגלית',
      he: 'עברית',
      ar: 'ערבית'
    },
    ar: {
      ru: 'الروسية',
      en: 'الإنجليزية',
      he: 'العبرية',
      ar: 'العربية'
    }
  };
  
  return languageNames[currentLanguage]?.[targetLanguage] || LANGUAGE_NAMES[targetLanguage];
}

/**
 * Get localized field value with fallback to configurable default language
 * Enhanced to support both storeSettings object and direct defaultLanguage parameter
 */
export function getLocalizedField(
  item: any,
  field: string,
  currentLanguage: SupportedLanguage,
  storeSettingsOrDefault?: { defaultLanguage?: string; languageOrder?: string[] } | SupportedLanguage
): string {
  if (!item) return '';
  
  // Handle flexible parameter type
  let defaultLanguage: SupportedLanguage = 'ru';
  let languageOrder: string[] = ['ru', 'en', 'he', 'ar'];
  if (typeof storeSettingsOrDefault === 'string') {
    defaultLanguage = storeSettingsOrDefault;
  } else if (storeSettingsOrDefault) {
    if (storeSettingsOrDefault.defaultLanguage) {
      defaultLanguage = storeSettingsOrDefault.defaultLanguage as SupportedLanguage;
    }
    if (storeSettingsOrDefault.languageOrder && Array.isArray(storeSettingsOrDefault.languageOrder) && storeSettingsOrDefault.languageOrder.length > 0) {
      languageOrder = storeSettingsOrDefault.languageOrder;
    }
  }

  // Helper: get field value for a given language code
  const getForLang = (lang: string): string => {
    if (lang === 'ru') return item[field] || '';
    const underscoreKey = `${field}_${lang}`;
    const camelKey = `${field}${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
    return item[underscoreKey] || item[camelKey] || '';
  };

  // 1. Try the requested language first
  const directValue = getForLang(currentLanguage);
  if (directValue) return directValue;

  // 2. Walk the language priority order (skip currentLanguage, already tried)
  for (const lang of languageOrder) {
    if (lang === currentLanguage) continue;
    const v = getForLang(lang);
    if (v) return v;
  }

  // 3. Last resort: try any language field that has a value
  const allLangs = ['ru', 'en', 'he', 'ar'];
  for (const lang of allLangs) {
    if (lang === currentLanguage || languageOrder.includes(lang)) continue;
    const v = getForLang(lang);
    if (v) return v;
  }

  return '';
}

/**
 * Get the field name for current language
 */
export function getFieldName(field: string, language: SupportedLanguage, defaultLanguage: SupportedLanguage = 'ru'): string {
  if (language === defaultLanguage) {
    return field;
  }
  return `${field}_${language}`;
}

/**
 * Get all translatable fields for an object
 */
export function getTranslatableFields(baseFields: string[]): string[] {
  const fields: string[] = [];
  
  baseFields.forEach(field => {
    // Add base field (default language)
    fields.push(field);
    // Add translated fields
    SUPPORTED_LANGUAGES.forEach(lang => {
      if (lang !== 'ru') { // ru is base language
        fields.push(`${field}_${lang}`);
      }
    });
  });
  
  return fields;
}

/**
 * Check how many translations are filled for given fields
 */
export function getTranslationProgress(
  item: any,
  baseFields: string[],
  currentLanguage: SupportedLanguage,
  defaultLanguage: SupportedLanguage = 'ru'
): { filled: number; total: number; percentage: number } {
  if (currentLanguage === defaultLanguage) {
    // For default language, count base fields
    const filled = baseFields.filter(field => item[field]).length;
    return {
      filled,
      total: baseFields.length,
      percentage: Math.round((filled / baseFields.length) * 100)
    };
  }
  
  // For translation languages, count translated fields
  const filled = baseFields.filter(field => {
    const translatedField = `${field}_${currentLanguage}`;
    return item[translatedField];
  }).length;
  
  return {
    filled,
    total: baseFields.length,
    percentage: Math.round((filled / baseFields.length) * 100)
  };
}

/**
 * Get empty translation fields for current language
 */
export function getEmptyTranslationFields(
  item: any,
  baseFields: string[],
  currentLanguage: SupportedLanguage,
  defaultLanguage: SupportedLanguage = 'ru'
): string[] {
  if (currentLanguage === defaultLanguage) {
    return baseFields.filter(field => !item[field]);
  }
  
  return baseFields.filter(field => {
    const translatedField = `${field}_${currentLanguage}`;
    return !item[translatedField];
  });
}

/**
 * Copy all fields from default language to target language
 */
export function copyFromDefaultLanguage(
  item: any,
  baseFields: string[],
  targetLanguage: SupportedLanguage,
  defaultLanguage: SupportedLanguage = 'ru'
): Record<string, string> {
  const updates: Record<string, string> = {};
  
  if (targetLanguage === defaultLanguage) {
    return updates; // No copying needed for default language
  }
  
  baseFields.forEach(field => {
    const sourceField = defaultLanguage === 'ru' ? field : `${field}_${defaultLanguage}`;
    const targetField = `${field}_${targetLanguage}`;
    
    // Always copy if source has value (overwrite existing translation)
    if (item[sourceField]) {
      updates[targetField] = item[sourceField];
    }
  });
  
  return updates;
}

/**
 * Clear all translation fields for target language
 */
export function clearTranslationFields(
  baseFields: string[],
  targetLanguage: SupportedLanguage,
  defaultLanguage: SupportedLanguage = 'ru'
): Record<string, string> {
  const updates: Record<string, string> = {};
  
  if (targetLanguage === defaultLanguage) {
    // Clear base fields for default language
    baseFields.forEach(field => {
      updates[field] = '';
    });
  } else {
    // Clear translated fields
    baseFields.forEach(field => {
      updates[`${field}_${targetLanguage}`] = '';
    });
  }
  
  return updates;
}

/**
 * Get language name for display
 */
export function getLanguageName(language: SupportedLanguage): string {
  return LANGUAGE_NAMES[language] || language;
}

/**
 * Check if language is RTL
 */
export function isRTLLanguage(language: SupportedLanguage): boolean {
  return language === 'he' || language === 'ar';
}