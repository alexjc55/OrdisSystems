import React, { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { getLocalizedFieldForAdmin } from "@shared/multilingual-helpers";
import { createMultilingualUpdate } from "@/components/ui/multilingual-store-settings";
import { type SupportedLanguage } from "@shared/localization";

interface SliderSettingsProps {
  id: string;
  defaultValues?: {
    sliderAutoplay?: boolean;
    sliderSpeed?: number;
    sliderEffect?: string;
    slide1Image?: string;
    slide1Image_en?: string;
    slide1Image_he?: string;
    slide1Image_ar?: string;
    slide1Title?: string;
    slide1Subtitle?: string;
    slide1ButtonText?: string;
    slide1ButtonLink?: string;
    slide1TextPosition?: string;
    slide1TitleEn?: string;
    slide1SubtitleEn?: string;
    slide1ButtonTextEn?: string;
    slide1TitleHe?: string;
    slide1SubtitleHe?: string;
    slide1ButtonTextHe?: string;
    slide1TitleAr?: string;
    slide1SubtitleAr?: string;
    slide1ButtonTextAr?: string;
    slide2Image?: string;
    slide2Image_en?: string;
    slide2Image_he?: string;
    slide2Image_ar?: string;
    slide2Title?: string;
    slide2Subtitle?: string;
    slide2ButtonText?: string;
    slide2ButtonLink?: string;
    slide2TextPosition?: string;
    slide2TitleEn?: string;
    slide2SubtitleEn?: string;
    slide2ButtonTextEn?: string;
    slide2TitleHe?: string;
    slide2SubtitleHe?: string;
    slide2ButtonTextHe?: string;
    slide2TitleAr?: string;
    slide2SubtitleAr?: string;
    slide2ButtonTextAr?: string;
    slide3Image?: string;
    slide3Image_en?: string;
    slide3Image_he?: string;
    slide3Image_ar?: string;
    slide3Title?: string;
    slide3Subtitle?: string;
    slide3ButtonText?: string;
    slide3ButtonLink?: string;
    slide3TextPosition?: string;
    slide3TitleEn?: string;
    slide3SubtitleEn?: string;
    slide3ButtonTextEn?: string;
    slide3TitleHe?: string;
    slide3SubtitleHe?: string;
    slide3ButtonTextHe?: string;
    slide3TitleAr?: string;
    slide3SubtitleAr?: string;
    slide3ButtonTextAr?: string;
    slide4Image?: string;
    slide4Image_en?: string;
    slide4Image_he?: string;
    slide4Image_ar?: string;
    slide4Title?: string;
    slide4Subtitle?: string;
    slide4ButtonText?: string;
    slide4ButtonLink?: string;
    slide4TextPosition?: string;
    slide4TitleEn?: string;
    slide4SubtitleEn?: string;
    slide4ButtonTextEn?: string;
    slide4TitleHe?: string;
    slide4SubtitleHe?: string;
    slide4ButtonTextHe?: string;
    slide4TitleAr?: string;
    slide4SubtitleAr?: string;
    slide4ButtonTextAr?: string;
    slide5Image?: string;
    slide5Image_en?: string;
    slide5Image_he?: string;
    slide5Image_ar?: string;
    slide5Title?: string;
    slide5Subtitle?: string;
    slide5ButtonText?: string;
    slide5ButtonLink?: string;
    slide5TextPosition?: string;
    slide5TitleEn?: string;
    slide5SubtitleEn?: string;
    slide5ButtonTextEn?: string;
    slide5TitleHe?: string;
    slide5SubtitleHe?: string;
    slide5ButtonTextHe?: string;
    slide5TitleAr?: string;
    slide5SubtitleAr?: string;
    slide5ButtonTextAr?: string;
  };
}

export function SliderSettings({ id, defaultValues = {} }: SliderSettingsProps) {
  const { t: adminT, i18n } = useTranslation('admin');
  const currentLanguage = i18n.language as SupportedLanguage;

  const slides = [1, 2, 3, 4, 5];

  // Store all images per slide per language: key = `${slideNum}_${lang}`
  const [allSlideImages, setAllSlideImages] = useState<{[key: string]: string}>(() => {
    const result: {[key: string]: string} = {};
    slides.forEach(n => {
      result[`${n}_ru`] = (defaultValues as any)[`slide${n}Image`] || '';
      result[`${n}_en`] = (defaultValues as any)[`slide${n}Image_en`] || '';
      result[`${n}_he`] = (defaultValues as any)[`slide${n}Image_he`] || '';
      result[`${n}_ar`] = (defaultValues as any)[`slide${n}Image_ar`] || '';
    });
    return result;
  });

  // Re-sync images state when defaultValues arrive with real data (handles race condition
  // where storeSettings/editingTheme load after the component has already mounted)
  const prevImagesRef = useRef<string>('');
  useEffect(() => {
    const incoming = slides.flatMap(n => [
      (defaultValues as any)[`slide${n}Image`] || '',
      (defaultValues as any)[`slide${n}Image_en`] || '',
      (defaultValues as any)[`slide${n}Image_he`] || '',
      (defaultValues as any)[`slide${n}Image_ar`] || '',
    ]).join('|');

    if (incoming === prevImagesRef.current) return;
    prevImagesRef.current = incoming;

    // Only update slots that now have a real URL and the slot is currently empty
    // (so we never wipe edits the user has already made)
    setAllSlideImages(prev => {
      const next = { ...prev };
      let changed = false;
      slides.forEach(n => {
        const ru = (defaultValues as any)[`slide${n}Image`] || '';
        const en = (defaultValues as any)[`slide${n}Image_en`] || '';
        const he = (defaultValues as any)[`slide${n}Image_he`] || '';
        const ar = (defaultValues as any)[`slide${n}Image_ar`] || '';
        if (ru && !next[`${n}_ru`]) { next[`${n}_ru`] = ru; changed = true; }
        if (en && !next[`${n}_en`]) { next[`${n}_en`] = en; changed = true; }
        if (he && !next[`${n}_he`]) { next[`${n}_he`] = he; changed = true; }
        if (ar && !next[`${n}_ar`]) { next[`${n}_ar`] = ar; changed = true; }
      });
      return changed ? next : prev;
    });
  });

  // Returns the displayed image for the current language (lang-specific or fallback to Russian base)
  const getDisplayImage = (slideNum: number): string => {
    const lang = currentLanguage === 'ru' ? 'ru' : currentLanguage;
    return allSlideImages[`${slideNum}_${lang}`] || allSlideImages[`${slideNum}_ru`] || '';
  };

  // Returns true if the current language has its own image (not just the fallback)
  const hasOwnImage = (slideNum: number): boolean => {
    if (currentLanguage === 'ru') return !!allSlideImages[`${slideNum}_ru`];
    return !!allSlideImages[`${slideNum}_${currentLanguage}`];
  };

  // The field name for the hidden input for the current language
  const getFieldName = (slideNum: number): string => {
    if (currentLanguage === 'ru') return `slide${slideNum}Image`;
    return `slide${slideNum}Image_${currentLanguage}`;
  };

  const handleImageChange = (slideNum: number, url: string) => {
    const langKey = currentLanguage === 'ru' ? 'ru' : currentLanguage;
    setAllSlideImages(prev => {
      const next = { ...prev, [`${slideNum}_${langKey}`]: url };
      // Clearing the base (ru) image removes the slide entirely — wipe all language variants
      if (langKey === 'ru' && url === '') {
        next[`${slideNum}_en`] = '';
        next[`${slideNum}_he`] = '';
        next[`${slideNum}_ar`] = '';
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-sm font-medium mb-3 text-blue-900">{adminT("themes.sliderGeneralSettings")}</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`sliderAutoplay${id}`}>{adminT("themes.sliderAutoplay")}</Label>
            <select
              name="sliderAutoplay"
              id={`sliderAutoplay${id}`}
              defaultValue={defaultValues.sliderAutoplay !== false ? "true" : "false"}
              className="w-full px-3 py-2 border rounded-md bg-white text-sm"
            >
              <option value="true">{adminT("themes.enabled")}</option>
              <option value="false">{adminT("themes.disabled")}</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`sliderSpeed${id}`}>{adminT("themes.sliderSpeed")}</Label>
            <Input
              type="number"
              name="sliderSpeed"
              id={`sliderSpeed${id}`}
              defaultValue={defaultValues.sliderSpeed || 5000}
              min="2000"
              max="10000"
              step="500"
              className="text-sm"
            />
            <div className="text-xs text-gray-500">
              {adminT("themes.sliderSpeedDescription")}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`sliderEffect${id}`}>{adminT("themes.sliderEffect")}</Label>
            <select
              name="sliderEffect"
              id={`sliderEffect${id}`}
              defaultValue={defaultValues.sliderEffect || "fade"}
              className="w-full px-3 py-2 border rounded-md bg-white text-sm"
            >
              <option value="fade">{adminT("themes.fadeEffect")}</option>
              <option value="slide">{adminT("themes.slideEffect")}</option>
              <option value="slideVertical">{adminT("themes.slideVerticalEffect")}</option>
              <option value="zoom">{adminT("themes.zoomEffect")}</option>
              <option value="flip">{adminT("themes.flipEffect")}</option>
              <option value="slideScale">{adminT("themes.slideScaleEffect")}</option>
              <option value="coverflow">{adminT("themes.coverflowEffect")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Slides Configuration */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">{adminT("themes.slidesConfiguration")}</h4>
        <div className="text-xs text-gray-500 mb-4">
          {adminT("themes.slidesConfigurationDescription")}
        </div>
        
        {slides.map((slideNumber) => {
          const displayImage = getDisplayImage(slideNumber);
          const isFallback = !hasOwnImage(slideNumber) && currentLanguage !== 'ru' && !!allSlideImages[`${slideNumber}_ru`];
          const hasImage = !!displayImage;
          
          return (
            <div key={slideNumber} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="font-medium text-sm">
                  {adminT("themes.slide")} {slideNumber}
                </h5>
                {slideNumber > 1 && (
                  <div className="text-xs text-gray-500">
                    {adminT("themes.optional")}
                  </div>
                )}
              </div>
              
              {/* Image Upload */}
              <div className="space-y-2">
                <Label htmlFor={`slide${slideNumber}Image${id}`}>
                  {adminT("themes.slideImage")} {slideNumber === 1 && `(${adminT("themes.required")})`}
                </Label>

                {/* Fallback notice when viewing non-Russian lang and no own image */}
                {isFallback && (
                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    {adminT("themes.slideFallbackImage") || "Показывается изображение базового языка. Загрузите своё для этого языка."}
                  </div>
                )}

                <ImageUpload
                  value={displayImage}
                  onChange={(url: string) => {
                    handleImageChange(slideNumber, url);
                  }}
                />
                <div className="text-xs text-gray-500">{adminT("themes.sliderImageSize")}</div>

                {/* Hidden inputs for ALL language variants so the form always sends all values */}
                <input type="hidden" name={`slide${slideNumber}Image`} value={allSlideImages[`${slideNumber}_ru`] || ''} />
                <input type="hidden" name={`slide${slideNumber}Image_en`} value={allSlideImages[`${slideNumber}_en`] || ''} />
                <input type="hidden" name={`slide${slideNumber}Image_he`} value={allSlideImages[`${slideNumber}_he`] || ''} />
                <input type="hidden" name={`slide${slideNumber}Image_ar`} value={allSlideImages[`${slideNumber}_ar`] || ''} />
              </div>
              
              {/* Show content fields only if image exists or it's slide 1 */}
              {(hasImage || slideNumber === 1) && (() => {
                // Compute language-specific field names for this slide
                const cap = (l: string) => l.charAt(0).toUpperCase() + l.slice(1);
                const langSuffix = currentLanguage === 'ru' ? '' : cap(currentLanguage);
                const titleFieldName = `slide${slideNumber}Title${langSuffix}`;
                const subtitleFieldName = `slide${slideNumber}Subtitle${langSuffix}`;
                const buttonTextFieldName = `slide${slideNumber}ButtonText${langSuffix}`;
                const otherLangs: SupportedLanguage[] = (['ru', 'en', 'he', 'ar'] as SupportedLanguage[]).filter(l => l !== currentLanguage);

                // Get stored value for a specific language
                const getStoredValue = (baseField: string, lang: SupportedLanguage): string => {
                  const suffix = lang === 'ru' ? '' : cap(lang);
                  const key = `${baseField}${suffix}` as keyof typeof defaultValues;
                  return (defaultValues[key] as string) || '';
                };

                return (
                  <>
                    {/* Hidden inputs for all non-active languages so all language values always get submitted */}
                    {otherLangs.map(lang => (
                      <React.Fragment key={lang}>
                        <input type="hidden" name={`slide${slideNumber}Title${lang === 'ru' ? '' : cap(lang)}`} value={getStoredValue(`slide${slideNumber}Title`, lang)} />
                        <input type="hidden" name={`slide${slideNumber}Subtitle${lang === 'ru' ? '' : cap(lang)}`} value={getStoredValue(`slide${slideNumber}Subtitle`, lang)} />
                        <input type="hidden" name={`slide${slideNumber}ButtonText${lang === 'ru' ? '' : cap(lang)}`} value={getStoredValue(`slide${slideNumber}ButtonText`, lang)} />
                      </React.Fragment>
                    ))}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`${titleFieldName}${id}`}>{adminT("themes.slideTitle")}</Label>
                        <Input
                          type="text"
                          name={titleFieldName}
                          id={`${titleFieldName}${id}`}
                          defaultValue={getLocalizedFieldForAdmin(defaultValues, `slide${slideNumber}Title`, currentLanguage) || ''}
                          placeholder={adminT("themes.slideTitlePlaceholder")}
                          className="text-sm"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`slide${slideNumber}TextPosition${id}`}>{adminT("themes.textPosition")}</Label>
                        <select
                          name={`slide${slideNumber}TextPosition`}
                          id={`slide${slideNumber}TextPosition${id}`}
                          defaultValue={defaultValues[`slide${slideNumber}TextPosition` as keyof typeof defaultValues] as string || "left-center"}
                          className="w-full px-3 py-2 border rounded-md bg-white text-sm"
                        >
                          <option value="left-top">{adminT("themes.textLeftTop")}</option>
                          <option value="left-center">{adminT("themes.textLeftCenter")}</option>
                          <option value="left-bottom">{adminT("themes.textLeftBottom")}</option>
                          <option value="center-top">{adminT("themes.textCenterTop")}</option>
                          <option value="center-center">{adminT("themes.textCenterCenter")}</option>
                          <option value="center-bottom">{adminT("themes.textCenterBottom")}</option>
                          <option value="right-top">{adminT("themes.textRightTop")}</option>
                          <option value="right-center">{adminT("themes.textRightCenter")}</option>
                          <option value="right-bottom">{adminT("themes.textRightBottom")}</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`${subtitleFieldName}${id}`}>{adminT("themes.slideSubtitle")}</Label>
                      <Textarea
                        name={subtitleFieldName}
                        id={`${subtitleFieldName}${id}`}
                        defaultValue={getLocalizedFieldForAdmin(defaultValues, `slide${slideNumber}Subtitle`, currentLanguage) || ''}
                        placeholder={adminT("themes.slideSubtitlePlaceholder")}
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`${buttonTextFieldName}${id}`}>{adminT("themes.buttonText")}</Label>
                        <Input
                          type="text"
                          name={buttonTextFieldName}
                          id={`${buttonTextFieldName}${id}`}
                          defaultValue={getLocalizedFieldForAdmin(defaultValues, `slide${slideNumber}ButtonText`, currentLanguage) || ''}
                          placeholder={adminT("themes.buttonTextPlaceholder")}
                          className="text-sm"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`slide${slideNumber}ButtonLink${id}`}>{adminT("themes.buttonLink")}</Label>
                        <Input
                          type="text"
                          name={`slide${slideNumber}ButtonLink`}
                          id={`slide${slideNumber}ButtonLink${id}`}
                          defaultValue={defaultValues[`slide${slideNumber}ButtonLink` as keyof typeof defaultValues] as string || ''}
                          placeholder={adminT("themes.buttonLinkPlaceholder")}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
