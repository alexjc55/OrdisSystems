import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  copyFromDefaultLanguage,
  clearTranslationFields,
  getFieldName,
  type SupportedLanguage
} from '@shared/localization';

interface UseTranslationManagerProps {
  defaultLanguage?: SupportedLanguage;
  baseFields: string[];
}

export function useTranslationManager({ 
  defaultLanguage = 'ru', 
  baseFields 
}: UseTranslationManagerProps) {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language as SupportedLanguage;

  const getFieldValue = useCallback((formData: any, field: string) => {
    const fieldName = getFieldName(field, currentLanguage, defaultLanguage);
    return formData[fieldName] || '';
  }, [currentLanguage, defaultLanguage]);

  const setFieldValue = useCallback((
    field: string, 
    value: string, 
    setFormData: (updater: (prev: any) => any) => void
  ) => {
    const fieldName = getFieldName(field, currentLanguage, defaultLanguage);
    setFormData((prev: any) => ({
      ...prev,
      [fieldName]: value
    }));
  }, [currentLanguage, defaultLanguage]);

  const copyAllFields = useCallback((
    formData: any,
    setFormData: (updater: (prev: any) => any) => void
  ) => {
    const updates = copyFromDefaultLanguage(
      formData,
      baseFields,
      currentLanguage,
      defaultLanguage
    );
    
    if (Object.keys(updates).length > 0) {
      setFormData((prev: any) => ({ ...prev, ...updates }));
      return Object.keys(updates).length;
    }
    return 0;
  }, [baseFields, currentLanguage, defaultLanguage]);

  const clearAllFields = useCallback((
    setFormData: (updater: (prev: any) => any) => void
  ) => {
    const updates = clearTranslationFields(
      baseFields,
      currentLanguage,
      defaultLanguage
    );
    
    if (Object.keys(updates).length > 0) {
      setFormData((prev: any) => ({ ...prev, ...updates }));
      return Object.keys(updates).length;
    }
    return 0;
  }, [baseFields, currentLanguage, defaultLanguage]);

  const getFieldLabel = useCallback((field: string, baseLabel: string) => {
    const languageNames = {
      ru: 'Русский',
      en: 'English',
      he: 'עברית',
      ar: 'العربية'
    };
    
    return `${baseLabel} (${languageNames[currentLanguage] || currentLanguage})`;
  }, [currentLanguage]);

  const isTranslationMode = currentLanguage !== defaultLanguage;

  return {
    currentLanguage,
    defaultLanguage,
    isTranslationMode,
    getFieldValue,
    setFieldValue,
    copyAllFields,
    clearAllFields,
    getFieldLabel
  };
}