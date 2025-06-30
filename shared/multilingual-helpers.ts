import { type SupportedLanguage } from './localization';

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
  defaultLanguage: SupportedLanguage = 'ru'
): string {
  if (!obj) return '';
  
  // For Russian (base language), try base field first, then suffixed version
  if (language === 'ru') {
    const baseValue = obj[fieldName];
    if (baseValue) return baseValue;
    
    const suffixedValue = obj[`${fieldName}_ru`];
    if (suffixedValue) return suffixedValue;
  } else {
    // For other languages, try suffixed field first
    const suffixedValue = obj[`${fieldName}_${language}`];
    if (suffixedValue) return suffixedValue;
  }
  
  // Fallback to default language
  if (language !== defaultLanguage) {
    return getLocalizedStoreField(obj, fieldName, defaultLanguage, defaultLanguage);
  }
  
  // Final fallback to base field
  return obj[fieldName] || '';
}

/**
 * Get localized theme field value
 */
export function getLocalizedThemeField(
  theme: MultilingualTheme,
  fieldName: string,
  language: SupportedLanguage,
  defaultLanguage: SupportedLanguage = 'ru'
): string {
  if (!theme) return '';
  
  // For Russian (base language), try base field first
  if (language === 'ru') {
    const baseValue = theme[fieldName];
    if (baseValue) return baseValue;
  } else {
    // For other languages, try suffixed field first
    const suffixedValue = theme[`${fieldName}_${language}`];
    if (suffixedValue) return suffixedValue;
  }
  
  // Fallback to default language
  if (language !== defaultLanguage) {
    return getLocalizedThemeField(theme, fieldName, defaultLanguage, defaultLanguage);
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
 * Get localized payment method name with fallback to Russian
 */
export function getPaymentMethodName(
  method: any,
  language: SupportedLanguage,
  defaultLanguage: SupportedLanguage = 'ru'
): string {
  if (!method) return '';
  
  // For Russian (base language), try base field first
  if (language === 'ru') {
    return method.name || '';
  }
  
  // For other languages, try localized field first, then fallback
  const localizedField = `name_${language}`;
  const localizedValue = method[localizedField];
  
  if (localizedValue) {
    return localizedValue;
  }
  
  // Fallback to default language (Russian)
  return method.name || '';
}