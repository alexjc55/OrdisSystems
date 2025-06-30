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
  
  // Only return the value for the specific language field
  // No fallback to default language - if no translation exists, field should be empty
  return storeSettings?.[langField] || '';
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