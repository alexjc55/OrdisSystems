import { type Language } from '@/lib/i18n';

// Simple multilingual field helpers for store settings
// Automatically uses current language or falls back by languageOrder
// (default language always has sort order 1, so it's always first in languageOrder)

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

  // Fallback through enabled languages in sort order
  // (default language is always first since it has sort order 1)
  const languageOrder: Language[] = (storeSettings.languageOrder || storeSettings.enabledLanguages || ['ru', 'en', 'he', 'ar']) as Language[];
  const enabledSet = new Set<string>(storeSettings.enabledLanguages || languageOrder);

  for (const lang of languageOrder) {
    if (lang === currentLanguage) continue;
    if (!enabledSet.has(lang)) continue;
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