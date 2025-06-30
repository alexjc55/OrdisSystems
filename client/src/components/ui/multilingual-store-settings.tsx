import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { useAdminTranslation, useLanguage } from '@/hooks/use-language';
import { getLocalizedStoreField, createStoreFieldUpdate, type MultilingualStoreSettings } from '@shared/multilingual-helpers';
import { type SupportedLanguage } from '@shared/localization';
import { Languages, Globe, FileText, Type, MousePointer } from 'lucide-react';

interface MultilingualStoreSettingsProps {
  storeSettings: MultilingualStoreSettings;
  onUpdate: (updates: Record<string, any>) => void;
  isLoading?: boolean;
}

export function MultilingualStoreSettings({ 
  storeSettings, 
  onUpdate, 
  isLoading = false 
}: MultilingualStoreSettingsProps) {
  const { adminT } = useAdminTranslation();
  const [activeLanguageTab, setActiveLanguageTab] = useState<SupportedLanguage>('ru');

  // Get enabled languages from store settings
  const { data: settingsData } = useQuery({
    queryKey: ['/api/settings'],
    staleTime: 5 * 60 * 1000,
  });

  const enabledLanguages = (settingsData?.enabledLanguages as string[]) || ['ru', 'en', 'he', 'ar'];
  
  // Create available language tabs
  const availableLanguageTabs = enabledLanguages.map(lang => ({
    code: lang as SupportedLanguage,
    name: {
      ru: 'Русский',
      en: 'English', 
      he: 'עברית',
      ar: 'العربية'
    }[lang as SupportedLanguage] || lang
  }));

  // Handle field updates
  const handleFieldUpdate = (fieldName: string, value: string) => {
    const update = createStoreFieldUpdate(fieldName, activeLanguageTab, value);
    onUpdate(update);
  };

  // Get field value for current language
  const getFieldValue = (fieldName: string) => {
    return getLocalizedStoreField(storeSettings, fieldName, activeLanguageTab);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5" />
          {adminT('storeSettings.multilingualContent')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeLanguageTab} onValueChange={(value) => setActiveLanguageTab(value as SupportedLanguage)}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${availableLanguageTabs.length}, 1fr)` }}>
            {availableLanguageTabs.map(({ code, name }) => (
              <TabsTrigger key={code} value={code} className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">{name}</span>
                <span className="sm:hidden">{code.toUpperCase()}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {availableLanguageTabs.map(({ code }) => (
            <TabsContent key={code} value={code} className="space-y-6 mt-6">
              {/* Store Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  {adminT('storeSettings.storeName')} ({code.toUpperCase()})
                </label>
                <Input
                  value={getFieldValue('storeName')}
                  onChange={(e) => handleFieldUpdate('storeName', e.target.value)}
                  placeholder={adminT('storeSettings.storeNamePlaceholder')}
                  disabled={isLoading}
                />
              </div>

              {/* Welcome Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  {adminT('storeSettings.welcomeTitle')} ({code.toUpperCase()})
                </label>
                <Input
                  value={getFieldValue('welcomeTitle')}
                  onChange={(e) => handleFieldUpdate('welcomeTitle', e.target.value)}
                  placeholder={adminT('storeSettings.welcomeTitlePlaceholder')}
                  disabled={isLoading}
                />
              </div>

              {/* Store Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {adminT('storeSettings.storeDescription')} ({code.toUpperCase()})
                </label>
                <Textarea
                  value={getFieldValue('storeDescription')}
                  onChange={(e) => handleFieldUpdate('storeDescription', e.target.value)}
                  placeholder={adminT('storeSettings.storeDescriptionPlaceholder')}
                  rows={3}
                  disabled={isLoading}
                />
              </div>

              {/* Delivery Info */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {adminT('storeSettings.deliveryInfo')} ({code.toUpperCase()})
                </label>
                <Textarea
                  value={getFieldValue('deliveryInfo')}
                  onChange={(e) => handleFieldUpdate('deliveryInfo', e.target.value)}
                  placeholder={adminT('storeSettings.deliveryInfoPlaceholder')}
                  rows={3}
                  disabled={isLoading}
                />
              </div>

              {/* About Text */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {adminT('storeSettings.aboutText')} ({code.toUpperCase()})
                </label>
                <Textarea
                  value={getFieldValue('aboutText')}
                  onChange={(e) => handleFieldUpdate('aboutText', e.target.value)}
                  placeholder={adminT('storeSettings.aboutTextPlaceholder')}
                  rows={4}
                  disabled={isLoading}
                />
              </div>

              {/* Banner Button Text */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <ButtonIcon className="h-4 w-4" />
                  {adminT('storeSettings.bannerButtonText')} ({code.toUpperCase()})
                </label>
                <Input
                  value={getFieldValue('bannerButtonText')}
                  onChange={(e) => handleFieldUpdate('bannerButtonText', e.target.value)}
                  placeholder={adminT('storeSettings.bannerButtonTextPlaceholder')}
                  disabled={isLoading}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}