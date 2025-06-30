import React from 'react';
import { useLanguage } from '@/hooks/use-language';
import { getLocalizedStoreField, createStoreFieldUpdate, type MultilingualStoreSettings } from '@shared/multilingual-helpers';
import { type SupportedLanguage } from '@shared/localization';

// Helper functions for multilingual store settings without tabs
// Fields automatically show content for current language with fallback to default

export function getMultilingualFieldValue(
  storeSettings: MultilingualStoreSettings,
  baseField: string,
  currentLanguage: SupportedLanguage,
  defaultLanguage: SupportedLanguage = 'ru'
): string {
  // Try to get value for current language
  const currentValue = getLocalizedStoreField(storeSettings, baseField, currentLanguage);
  
  // If no value for current language, fallback to default language
  if (!currentValue && currentLanguage !== defaultLanguage) {
    return getLocalizedStoreField(storeSettings, baseField, defaultLanguage) || '';
  }
  
  return currentValue || '';
}

export function updateMultilingualField(
  baseField: string,
  value: string,
  currentLanguage: SupportedLanguage,
  onUpdate: (updates: Record<string, any>) => void
) {
  const updates = createStoreFieldUpdate(baseField, value, currentLanguage);
  onUpdate(updates);
}

// Helper hook for multilingual store settings
export function useMultilingualStoreSettings(
  storeSettings: MultilingualStoreSettings,
  onUpdate: (updates: Record<string, any>) => void
) {
  const { currentLanguage } = useLanguage();
  
  const getValue = (baseField: string) => {
    return getMultilingualFieldValue(storeSettings, baseField, currentLanguage);
  };
  
  const updateValue = (baseField: string, value: string) => {
    updateMultilingualField(baseField, value, currentLanguage, onUpdate);
  };
  
  return { getValue, updateValue, currentLanguage };
}