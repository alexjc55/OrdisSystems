import { type SupportedLanguage } from '@shared/localization';

// Simple multilingual field helpers for store settings
// Automatically uses current language or falls back to default

export function getMultilingualValue(
  storeSettings: any,
  baseField: string,
  currentLanguage: SupportedLanguage,
  defaultLanguage: SupportedLanguage = 'ru'
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
  
  // Only return the value for the specific language field
  // No fallback to default language - if no translation exists, field should be empty
  return storeSettings?.[langField] || '';
}

export function createMultilingualUpdate(
  baseField: string,
  value: string,
  currentLanguage: SupportedLanguage
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