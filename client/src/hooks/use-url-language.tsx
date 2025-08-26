import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, Language, updateDocumentDirection } from '../lib/i18n';

type StoreSettings = {
  enabledLanguages?: string[];
  defaultLanguage?: string;
  [key: string]: any;
};

/**
 * Hook that handles URL parameter language switching
 * Only switches language if it's enabled in admin settings
 */
export function useUrlLanguage() {
  const { i18n } = useTranslation();
  
  // Load store settings to check enabled languages
  const { data: storeSettings } = useQuery({
    queryKey: ['/api/settings'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  }) as { data: StoreSettings | undefined };

  useEffect(() => {
    if (!storeSettings) return; // Wait for settings to load
    
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    
    if (!langParam) return; // No language parameter in URL
    
    console.log('URL language parameter detected:', langParam);
    console.log('Store settings enabled languages:', storeSettings.enabledLanguages);
    
    // Check if the language exists and is supported
    if (!Object.keys(LANGUAGES).includes(langParam)) {
      console.warn(`Language "${langParam}" is not supported`);
      return;
    }
    
    // Check if the language is enabled in admin settings
    // If enabledLanguages is null, undefined, or empty array, don't allow switching
    const enabledLanguages = storeSettings.enabledLanguages;
    if (!enabledLanguages || !Array.isArray(enabledLanguages) || enabledLanguages.length === 0) {
      console.warn('No enabled languages found in admin settings');
      return;
    }
    
    if (!enabledLanguages.includes(langParam)) {
      console.warn(`Language "${langParam}" is not enabled in admin settings. Enabled: [${enabledLanguages.join(', ')}]`);
      return;
    }
    
    // Only switch if it's different from current language
    if (i18n.language !== langParam) {
      console.log(`Switching language to "${langParam}" from URL parameter`);
      
      // Change language and update document
      i18n.changeLanguage(langParam as Language);
      updateDocumentDirection(langParam);
      
      // Store preference
      localStorage.setItem('language', langParam);
      
      // Keep URL parameter for sharing purposes (don't remove it)
      // This allows users to share language-specific links
      
      // Trigger re-render event
      setTimeout(() => {
        window.dispatchEvent(new Event('languageChanged'));
      }, 100);
    }
  }, [storeSettings, i18n]);

  return null; // This hook doesn't return anything, it just handles side effects
}