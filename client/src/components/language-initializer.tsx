import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { updateDocumentDirection } from '@/lib/i18n';

type StoreSettings = {
  defaultLanguage?: string;
  enabledLanguages?: string[];
  [key: string]: any;
};

export function LanguageInitializer() {
  const { i18n } = useTranslation();
  
  const { data: storeSettings, isSuccess } = useQuery({
    queryKey: ['/api/settings'],
    staleTime: 5 * 60 * 1000,
  }) as { data: StoreSettings | undefined; isSuccess: boolean };

  useEffect(() => {
    if (isSuccess && storeSettings?.defaultLanguage) {
      const defaultLanguage = storeSettings.defaultLanguage;
      const currentLanguage = i18n.language;
      const savedLanguage = localStorage.getItem('language');
      
      // Only apply default language if user hasn't explicitly chosen a language
      if (!savedLanguage && defaultLanguage !== currentLanguage) {
        console.log('Applying default language from database:', defaultLanguage);
        i18n.changeLanguage(defaultLanguage).then(() => {
          updateDocumentDirection(defaultLanguage);
          // Update localStorage to persist the setting
          localStorage.setItem('language', defaultLanguage);
        });
      }
    }
  }, [isSuccess, storeSettings, i18n]);

  // This component doesn't render anything
  return null;
}