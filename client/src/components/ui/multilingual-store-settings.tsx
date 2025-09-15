import { type Language } from '@/lib/i18n';

// Simple multilingual field helpers for store settings
// Automatically uses current language or falls back to default

export function getMultilingualValue(
  storeSettings: any,
  baseField: string,
  currentLanguage: Language,
  defaultLanguage: Language = 'ru'
): string {
  // Convert field name to proper database field format
  // Database uses camelCase: storeNameEn, welcomeTitleEn, etc.
  let langField: string;
  
  if (currentLanguage === 'ru') {
    // For Russian, use base field name
    langField = baseField;
  } else {
    // For other languages, capitalize the language code and append
    const capitalizedLang = currentLanguage.charAt(0).toUpperCase() + currentLanguage.slice(1);
    langField = `${baseField}${capitalizedLang}`;
  }
  
  // Try to get value for current language, fallback to default language if empty
  const currentValue = storeSettings?.[langField];
  if (currentValue && currentValue.trim() !== '') {
    return currentValue;
  }
  
  // Fallback to default language (Russian) if current language field is empty
  if (currentLanguage !== defaultLanguage) {
    return storeSettings?.[baseField] || '';
  }
  
  return currentValue || '';
}

export function createMultilingualUpdate(
  baseField: string,
  value: string,
  currentLanguage: Language
): Record<string, any> {
  // Convert field name to proper database field format
  let fieldName: string;
  
  if (currentLanguage === 'ru') {
    // For Russian, use base field name
    fieldName = baseField;
  } else {
    // For other languages, capitalize the language code and append
    const capitalizedLang = currentLanguage.charAt(0).toUpperCase() + currentLanguage.slice(1);
    fieldName = `${baseField}${capitalizedLang}`;
  }
  
  return { [fieldName]: value };
}