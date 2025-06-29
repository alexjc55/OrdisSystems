import React from 'react';
import { Button } from './button';
import { Copy, Trash2, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  getLanguageName, 
  getTranslationProgress, 
  getEmptyTranslationFields,
  type SupportedLanguage 
} from '@shared/localization';

interface TranslationToolbarProps {
  currentLanguage: SupportedLanguage;
  defaultLanguage: SupportedLanguage;
  formData: any;
  baseFields: string[];
  onCopyAllFields: () => void;
  onClearAllFields: () => void;
}

export function TranslationToolbar({
  currentLanguage,
  defaultLanguage,
  formData,
  baseFields,
  onCopyAllFields,
  onClearAllFields
}: TranslationToolbarProps) {
  const { t } = useTranslation('admin');
  
  const isTranslationMode = currentLanguage !== defaultLanguage;
  
  if (!isTranslationMode) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            {t('translation.defaultLanguageMode', { language: getLanguageName(defaultLanguage) })}
          </span>
        </div>
        <p className="text-xs text-green-600 mt-1">
          {t('translation.defaultLanguageDescription')}
        </p>
      </div>
    );
  }
  
  const progress = getTranslationProgress(formData, baseFields, currentLanguage, defaultLanguage);
  const emptyFields = getEmptyTranslationFields(formData, baseFields, currentLanguage, defaultLanguage);
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-blue-800">
            {t('translation.translationMode')} {getLanguageName(currentLanguage)}
          </h4>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-xs text-blue-600">
              {t('translation.progress')}: {progress.filled}/{progress.total} ({progress.percentage}%)
            </span>
            {progress.percentage > 0 && (
              <div className="w-20 bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          {emptyFields.length > 0 && (
            <Button 
              size="sm"
              onClick={onCopyAllFields}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Copy className="h-4 w-4 mr-2" />
              {t('translation.copyFromDefault', { 
                language: getLanguageName(defaultLanguage),
                count: emptyFields.length 
              })}
            </Button>
          )}
          
          {progress.filled > 0 && (
            <Button 
              size="sm"
              variant="outline"
              onClick={onClearAllFields}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('translation.clearAll')}
            </Button>
          )}
        </div>
      </div>
      
      {emptyFields.length === 0 && progress.total > 0 && (
        <div className="mt-3 flex items-center gap-2 text-green-700">
          <Eye className="h-4 w-4" />
          <span className="text-xs font-medium">
            {t('translation.allFieldsTranslated')}
          </span>
        </div>
      )}
    </div>
  );
}