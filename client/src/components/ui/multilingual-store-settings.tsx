import { type SupportedLanguage } from '@shared/localization';

// Simple multilingual field helpers for store settings
// Automatically uses current language or falls back to default

export function getMultilingualValue(
  storeSettings: any,
  baseField: string,
  currentLanguage: SupportedLanguage,
  defaultLanguage: SupportedLanguage = 'ru'
): string {
  // Get field name for current language
  const langField = currentLanguage === 'ru' ? baseField : `${baseField}_${currentLanguage}`;
  
  // Try current language value
  const currentValue = storeSettings?.[langField];
  
  // If no value and not default language, fallback to default
  if (!currentValue && currentLanguage !== defaultLanguage) {
    return storeSettings?.[baseField] || '';
  }
  
  return currentValue || '';
}

export function createMultilingualUpdate(
  baseField: string,
  value: string,
  currentLanguage: SupportedLanguage
): Record<string, any> {
  // For Russian use base field, for others add language suffix
  const fieldName = currentLanguage === 'ru' ? baseField : `${baseField}_${currentLanguage}`;
  
  return { [fieldName]: value };
}