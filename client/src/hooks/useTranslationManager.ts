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

  const getFieldKey = useCallback((field: string, language: SupportedLanguage) => {
    return getFieldName(field, language, defaultLanguage);
  }, [defaultLanguage]);

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
    console.log('TranslationManager copyAllFields called with:', {
      formData,
      baseFields,
      currentLanguage,
      defaultLanguage
    });
    
    const updates = copyFromDefaultLanguage(
      formData,
      baseFields,
      currentLanguage,
      defaultLanguage
    );
    
    console.log('Generated updates:', updates);
    
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

  const getAllLanguageFields = useCallback((formData: any): any => {
    const result: any = {};
    
    // Get all multilingual fields for all languages
    baseFields.forEach(field => {
      (['ru', 'en', 'he', 'ar'] as SupportedLanguage[]).forEach(lang => {
        const fieldKey = getFieldKey(field, lang);
        if (formData[fieldKey] !== undefined) {
          result[fieldKey] = formData[fieldKey];
        }
      });
    });
    
    return result;
  }, [baseFields, getFieldKey]);

  const isTranslationMode = currentLanguage !== defaultLanguage;

  return {
    currentLanguage,
    defaultLanguage,
    isTranslationMode,
    getFieldKey,
    getFieldValue,
    setFieldValue,
    copyAllFields,
    clearAllFields,
    getFieldLabel,
    getAllLanguageFields
  };
}