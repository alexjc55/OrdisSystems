import { type SupportedLanguage } from './localization';

/**
 * Get default language from store settings or fallback to 'ru'
 * This should be called with actual store settings when available
 */
export function getEffectiveDefaultLanguage(storeSettings?: { defaultLanguage?: string }): SupportedLanguage {
  if (storeSettings?.defaultLanguage) {
    return storeSettings.defaultLanguage as SupportedLanguage;
  }
  return 'ru'; // Fallback
}

// Type definitions for multilingual settings
export interface MultilingualStoreSettings {
  storeName?: string | null;
  storeName_en?: string | null;
  storeName_he?: string | null;
  storeName_ar?: string | null;
  
  welcomeTitle?: string | null;
  welcomeTitle_en?: string | null;
  welcomeTitle_he?: string | null;
  welcomeTitle_ar?: string | null;
  
  storeDescription?: string | null;
  storeDescription_en?: string | null;
  storeDescription_he?: string | null;
  storeDescription_ar?: string | null;
  
  deliveryInfo?: string | null;
  deliveryInfo_en?: string | null;
  deliveryInfo_he?: string | null;
  deliveryInfo_ar?: string | null;
  
  aboutText?: string | null;
  aboutText_ru?: string | null;
  aboutText_en?: string | null;
  aboutText_he?: string | null;
  aboutText_ar?: string | null;
  
  bannerButtonText?: string | null;
  bannerButtonText_ru?: string | null;
  bannerButtonText_en?: string | null;
  bannerButtonText_he?: string | null;
  bannerButtonText_ar?: string | null;
  
  [key: string]: any;
}

export interface MultilingualTheme {
  name: string;
  name_en?: string | null;
  name_he?: string | null;
  name_ar?: string | null;
  
  description?: string | null;
  description_en?: string | null;
  description_he?: string | null;
  description_ar?: string | null;
  
  bannerButtonText?: string;
  bannerButtonText_en?: string | null;
  bannerButtonText_he?: string | null;
  bannerButtonText_ar?: string | null;
  
  [key: string]: any;
}

/**
 * Get localized field value from multilingual object
 */
export function getLocalizedStoreField(
  obj: MultilingualStoreSettings,
  fieldName: string,
  language: SupportedLanguage,
  storeSettings?: { defaultLanguage?: string }
): string {
  const defaultLanguage = getEffectiveDefaultLanguage(storeSettings);
  if (!obj) return '';
  
  // Internal helper function to avoid type issues with recursion
  function getValue(lang: SupportedLanguage): string {
    if (lang === defaultLanguage) {
      // For default language, try base field first, then suffixed version
      const baseValue = obj[fieldName];
      if (baseValue) return baseValue;
      
      const suffixedValue = obj[`${fieldName}_${defaultLanguage}`];
      if (suffixedValue) return suffixedValue;
    } else {
      // For non-default languages, try suffixed field first
      const suffixedValue = obj[`${fieldName}_${lang}`];
      if (suffixedValue) return suffixedValue;
    }
    return '';
  }
  
  // Try current language first
  const currentValue = getValue(language);
  if (currentValue) return currentValue;
  
  // Fallback to default language if different (for public website)
  if (language !== defaultLanguage) {
    const fallbackValue = getValue(defaultLanguage);
    if (fallbackValue) return fallbackValue;
  }
  
  // Final fallback to base field
  return obj[fieldName] || '';
}

// No default theme values - system will show empty fields if no content exists

/**
 * Get localized theme field value with smart fallback
 */
export function getLocalizedThemeField(
  theme: MultilingualTheme,
  fieldName: string,
  language: SupportedLanguage,
  storeSettings?: { defaultLanguage?: string }
): string {
  const defaultLanguage = getEffectiveDefaultLanguage(storeSettings);
  if (!theme) return '';
  
  // Internal helper function to avoid type issues with recursion
  function getValue(lang: SupportedLanguage): string {
    if (lang === defaultLanguage) {
      // For default language, try base field first
      const baseValue = theme[fieldName];
      if (baseValue) return baseValue;
      // Also try suffixed version for consistency
      const suffixedValue = theme[`${fieldName}_${lang}`];
      if (suffixedValue) return suffixedValue;
    } else {
      // For non-default languages, try suffixed field first
      const suffixedValue = theme[`${fieldName}_${lang}`];
      if (suffixedValue) return suffixedValue;
    }
    return '';
  }
  
  // Try current language first
  const currentValue = getValue(language);
  if (currentValue) return currentValue;
  
  // Fallback to default language if different (for public website)
  if (language !== defaultLanguage) {
    const fallbackValue = getValue(defaultLanguage);
    if (fallbackValue) return fallbackValue;
  }
  
  // Final fallback to base field
  return theme[fieldName] || '';
}

/**
 * Get all language-specific field names for a base field
 */
export function getStoreFieldNames(baseFieldName: string): string[] {
  const languages: SupportedLanguage[] = ['ru', 'en', 'he', 'ar'];
  
  // For fields that don't have base versions, return all suffixed
  const fieldsWithoutBase = ['aboutText', 'bannerButtonText'];
  
  if (fieldsWithoutBase.includes(baseFieldName)) {
    return languages.map(lang => `${baseFieldName}_${lang}`);
  }
  
  // For fields with base versions, include base + suffixed
  return [
    baseFieldName, // Base field (Russian)
    ...languages.filter(lang => lang !== 'ru').map(lang => `${baseFieldName}_${lang}`)
  ];
}

/**
 * Get all language-specific field names for theme fields
 */
export function getThemeFieldNames(baseFieldName: string): string[] {
  const languages: SupportedLanguage[] = ['ru', 'en', 'he', 'ar'];
  
  // Theme fields always have base version + suffixed versions
  return [
    baseFieldName, // Base field (Russian)
    ...languages.filter(lang => lang !== 'ru').map(lang => `${baseFieldName}_${lang}`)
  ];
}

/**
 * Create update object for multilingual store field
 */
export function createStoreFieldUpdate(
  baseFieldName: string,
  language: SupportedLanguage,
  value: string
): Record<string, string> {
  if (language === 'ru') {
    // For Russian, update base field
    const fieldsWithoutBase = ['aboutText', 'bannerButtonText'];
    if (fieldsWithoutBase.includes(baseFieldName)) {
      return { [`${baseFieldName}_ru`]: value };
    }
    return { [baseFieldName]: value };
  }
  
  // For other languages, update suffixed field
  return { [`${baseFieldName}_${language}`]: value };
}

/**
 * Create update object for multilingual theme field
 */
export function createThemeFieldUpdate(
  baseFieldName: string,
  language: SupportedLanguage,
  value: string
): Record<string, string> {
  if (language === 'ru') {
    // For Russian, update base field
    return { [baseFieldName]: value };
  }
  
  // For other languages, update suffixed field
  return { [`${baseFieldName}_${language}`]: value };
}

/**
 * Get localized payment method name with fallback to configurable default language
 */
export function getPaymentMethodName(
  method: any,
  language: SupportedLanguage,
  storeSettings?: { defaultLanguage?: string }
): string {
  if (!method) return '';
  
  const defaultLanguage = getEffectiveDefaultLanguage(storeSettings);
  
  // For default language, try base field first
  if (language === defaultLanguage) {
    return method.name || '';
  }
  
  // For other languages, try localized field first, then fallback
  const localizedField = `name_${language}`;
  const localizedValue = method[localizedField];
  
  if (localizedValue) {
    return localizedValue;
  }
  
  // Fallback to default language
  if (defaultLanguage === 'ru') {
    return method.name || '';
  } else {
    return method[`name_${defaultLanguage}`] || method.name || '';
  }
}

// No default image values - system will show empty fields if no images exist

/**
 * Get localized image field value with smart fallback to Russian, then empty string
 */
export function getLocalizedImageField(
  obj: Record<string, any>,
  fieldName: string,
  language: SupportedLanguage,
  defaultLanguage: SupportedLanguage = 'ru'
): string {
  if (!obj) return '';
  
  // Convert camelCase to proper field names for different languages
  const getFieldForLanguage = (base: string, lang: SupportedLanguage) => {
    if (lang === 'ru') {
      return base; // Russian uses base field name
    } else {
      // For other languages, use camelCase format: logoUrl -> logoUrlEn
      const capitalizedLang = lang.charAt(0).toUpperCase() + lang.slice(1);
      return `${base}${capitalizedLang}`;
    }
  };
  
  // Try current language field first
  const currentField = getFieldForLanguage(fieldName, language);
  const currentValue = obj[currentField];
  if (currentValue) return currentValue;
  
  // Fallback to default language if different from current
  if (language !== defaultLanguage) {
    const fallbackField = getFieldForLanguage(fieldName, defaultLanguage);
    const fallbackValue = obj[fallbackField];
    if (fallbackValue) return fallbackValue;
  }
  
  // Final fallback to base field
  return obj[fieldName] || '';
}

/**
 * Get localized field value for ADMIN PANEL (no fallback to default language)
 * Shows empty if field is not translated for specific language
 */
export function getLocalizedFieldForAdmin(
  obj: any,
  fieldName: string,
  language: SupportedLanguage,
  storeSettings?: { defaultLanguage?: string }
): string {
  if (!obj) return '';
  
  const defaultLanguage = getEffectiveDefaultLanguage(storeSettings);
  
  // For default language, try base field first, then suffixed version
  if (language === defaultLanguage) {
    const baseValue = obj[fieldName];
    if (baseValue) return baseValue;
    
    const suffixedValue = obj[`${fieldName}_${defaultLanguage}`];
    if (suffixedValue) return suffixedValue;
  } else {
    // For non-default languages, only return suffixed field (no fallback)
    const suffixedValue = obj[`${fieldName}_${language}`];
    if (suffixedValue) return suffixedValue;
  }
  
  // Return empty string (no fallback to default language)
  return '';
}