import { type Language } from '@/lib/i18n';

// Simple multilingual field helpers for store settings
// Automatically uses current language or falls back to default

const LANG_FALLBACK_ORDER: Language[] = ['ru', 'en', 'he', 'ar'];

function getFieldNameForLang(baseField: string, lang: Language): string {
  if (lang === 'ru') return baseField;
  const cap = lang.charAt(0).toUpperCase() + lang.slice(1);
  return `${baseField}${cap}`;
}

export function getMultilingualValue(
  storeSettings: any,
  baseField: string,
  currentLanguage: Language,
  defaultLanguage: Language = 'ru'
): string {
  if (!storeSettings) return '';

  // Try current language first
  const currentField = getFieldNameForLang(baseField, currentLanguage);
  const currentValue = storeSettings[currentField];
  if (currentValue && currentValue.trim() !== '') return currentValue;

  // Fallback through all languages in order (skip current already tried)
  for (const lang of LANG_FALLBACK_ORDER) {
    if (lang === currentLanguage) continue;
    const field = getFieldNameForLang(baseField, lang);
    const val = storeSettings[field];
    if (val && val.trim() !== '') return val;
  }

  return '';
}

export function createMultilingualUpdate(
  baseField: string,
  value: string,
  currentLanguage: Language
): Record<string, any> {
  // Column mapping is FIXED: Russian always uses base column (no suffix),
  // all other languages use camelCase suffix: storeNameHe, storeNameEn, storeNameAr.
  if (currentLanguage === 'ru') {
    return { [baseField]: value };
  }
  const cap = currentLanguage.charAt(0).toUpperCase() + currentLanguage.slice(1);
  return { [`${baseField}${cap}`]: value };
}