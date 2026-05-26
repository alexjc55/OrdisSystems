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
 *
 * Column mapping is FIXED (independent of defaultLanguage):
 *   ru → fieldName (base column), he → fieldName_he, en → fieldName_en, ar → fieldName_ar
 * defaultLanguage only controls the fallback priority when a field is empty.
 */
export function getLocalizedStoreField(
  obj: MultilingualStoreSettings,
  fieldName: string,
  language: SupportedLanguage,
  storeSettings?: { defaultLanguage?: string }
): string {
  const defaultLanguage = getEffectiveDefaultLanguage(storeSettings);
  if (!obj) return '';

  // Fixed column mapping: ru → base field, others → suffixed field
  function getValue(lang: SupportedLanguage): string {
    if (lang === 'ru') {
      return obj[fieldName] || obj[`${fieldName}_ru`] || '';
    }
    return obj[`${fieldName}_${lang}`] || '';
  }

  // 1. Try current language
  const currentValue = getValue(language);
  if (currentValue) return currentValue;

  // 2. Fallback to default language
  if (language !== defaultLanguage) {
    const fallbackValue = getValue(defaultLanguage);
    if (fallbackValue) return fallbackValue;
  }

  // 3. Try all other languages in order
  const allLangs: SupportedLanguage[] = ['ru', 'en', 'he', 'ar'];
  for (const lang of allLangs) {
    if (lang !== language && lang !== defaultLanguage) {
      const v = getValue(lang);
      if (v) return v;
    }
  }

  return '';
}

// No default theme values - system will show empty fields if no content exists

/**
 * Get localized theme field value with smart fallback
 *
 * Column mapping is FIXED: ru → fieldName (base), others → fieldName_he/en/ar
 * defaultLanguage only controls fallback priority.
 */
export function getLocalizedThemeField(
  theme: MultilingualTheme,
  fieldName: string,
  language: SupportedLanguage,
  storeSettings?: { defaultLanguage?: string }
): string {
  const defaultLanguage = getEffectiveDefaultLanguage(storeSettings);
  if (!theme) return '';

  // Fixed column mapping: ru → base field, others → suffixed field
  function getValue(lang: SupportedLanguage): string {
    if (lang === 'ru') {
      return theme[fieldName] || theme[`${fieldName}_ru`] || '';
    }
    return theme[`${fieldName}_${lang}`] || '';
  }

  // 1. Try current language
  const currentValue = getValue(language);
  if (currentValue) return currentValue;

  // 2. Fallback to default language
  if (language !== defaultLanguage) {
    const fallbackValue = getValue(defaultLanguage);
    if (fallbackValue) return fallbackValue;
  }

  // 3. Try all other languages in order
  const allLangs: SupportedLanguage[] = ['ru', 'en', 'he', 'ar'];
  for (const lang of allLangs) {
    if (lang !== language && lang !== defaultLanguage) {
      const v = getValue(lang);
      if (v) return v;
    }
  }

  return '';
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
 * Get localized image field value with smart fallback.
 *
 * Column mapping is FIXED: ru → fieldName (base), others → fieldName_he/en/ar
 * defaultLanguage only controls fallback priority.
 */
export function getLocalizedImageField(
  obj: Record<string, any>,
  fieldName: string,
  language: SupportedLanguage,
  defaultLanguage: SupportedLanguage = 'ru'
): string {
  if (!obj) return '';

  // Fixed column mapping: ru → base field, others → suffixed field
  function getValue(lang: SupportedLanguage): string {
    if (lang === 'ru') return obj[fieldName] || '';
    return obj[`${fieldName}_${lang}`] || '';
  }

  // 1. Try current language
  const current = getValue(language);
  if (current) return current;

  // 2. Fallback to default language
  if (language !== defaultLanguage) {
    const fallback = getValue(defaultLanguage);
    if (fallback) return fallback;
  }

  // 3. Try remaining languages
  const allLangs: SupportedLanguage[] = ['ru', 'en', 'he', 'ar'];
  for (const lang of allLangs) {
    if (lang !== language && lang !== defaultLanguage) {
      const v = getValue(lang);
      if (v) return v;
    }
  }

  return '';
}

/**
 * Get localized field value for ADMIN PANEL (no fallback — shows empty if not translated).
 *
 * Column mapping is FIXED (independent of defaultLanguage):
 *   ru → fieldName (base column, no suffix)
 *   he → fieldNameHe, en → fieldNameEn, ar → fieldNameAr (camelCase suffix)
 */
export function getLocalizedFieldForAdmin(
  obj: any,
  fieldName: string,
  language: SupportedLanguage,
  storeSettings?: { defaultLanguage?: string }
): string {
  if (!obj) return '';

  // Russian always maps to the base (un-suffixed) DB column.
  if (language === 'ru') {
    return obj[fieldName] || '';
  }

  // Other languages use camelCase suffix: storeNameHe, storeNameEn, storeNameAr.
  const cap = language.charAt(0).toUpperCase() + language.slice(1);
  return obj[`${fieldName}${cap}`] || '';
}