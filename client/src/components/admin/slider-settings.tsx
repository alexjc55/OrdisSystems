import React, { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface SliderSettingsProps {
  id: string;
  defaultValues?: {
    sliderAutoplay?: boolean;
    sliderSpeed?: number;
    sliderEffect?: string;
    slide1Image?: string;
    slide1Title?: string;
    slide1Subtitle?: string;
    slide1ButtonText?: string;
    slide1ButtonLink?: string;
    slide1TextPosition?: string;
    slide2Image?: string;
    slide2Title?: string;
    slide2Subtitle?: string;
    slide2ButtonText?: string;
    slide2ButtonLink?: string;
    slide2TextPosition?: string;
    slide3Image?: string;
    slide3Title?: string;
    slide3Subtitle?: string;
    slide3ButtonText?: string;
    slide3ButtonLink?: string;
    slide3TextPosition?: string;
    slide4Image?: string;
    slide4Title?: string;
    slide4Subtitle?: string;
    slide4ButtonText?: string;
    slide4ButtonLink?: string;
    slide4TextPosition?: string;
    slide5Image?: string;
    slide5Title?: string;
    slide5Subtitle?: string;
    slide5ButtonText?: string;
    slide5ButtonLink?: string;
    slide5TextPosition?: string;
  };
}

export function SliderSettings({ id, defaultValues = {} }: SliderSettingsProps) {
  const { t: adminT } = useTranslation('admin');

  const slides = [1, 2, 3, 4, 5];
  const hiddenInputRefs = useRef<{[key: number]: HTMLInputElement | null}>({});
  
  // Track image URLs for each slide
  const [slideImages, setSlideImages] = useState<{[key: number]: string}>(() => {
    const initialImages: {[key: number]: string} = {};
    slides.forEach(slideNumber => {
      const slideImage = defaultValues[`slide${slideNumber}Image` as keyof typeof defaultValues] as string;
      initialImages[slideNumber] = slideImage || '';
    });
    return initialImages;
  });

  // Update slide images when defaultValues change
  useEffect(() => {
    const updatedImages: {[key: number]: string} = {};
    slides.forEach(slideNumber => {
      const slideImage = defaultValues[`slide${slideNumber}Image` as keyof typeof defaultValues] as string;
      updatedImages[slideNumber] = slideImage || '';
    });
    setSlideImages(updatedImages);
  }, [defaultValues]);

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
          const slideImage = slideImages[slideNumber] || '';
          const hasImage = slideImage && slideImage.trim() !== '';
          
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
                <ImageUpload
                  value={slideImage}
                  onChange={(url: string) => {
                    setSlideImages(prev => ({...prev, [slideNumber]: url}));
                    // Update the hidden input value directly
                    if (hiddenInputRefs.current[slideNumber]) {
                      hiddenInputRefs.current[slideNumber]!.value = url;
                    }
                  }}
                />
                <input 
                  ref={(el) => { hiddenInputRefs.current[slideNumber] = el; }}
                  type="hidden" 
                  name={`slide${slideNumber}Image`} 
                  defaultValue={slideImages[slideNumber] || ''} 
                />
              </div>
              
              {/* Show content fields only if image exists or it's slide 1 */}
              {(hasImage || slideNumber === 1) && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`slide${slideNumber}Title${id}`}>{adminT("themes.slideTitle")}</Label>
                      <Input
                        type="text"
                        name={`slide${slideNumber}Title`}
                        id={`slide${slideNumber}Title${id}`}
                        defaultValue={defaultValues[`slide${slideNumber}Title` as keyof typeof defaultValues] as string || ''}
                        placeholder={adminT("themes.slideTitlePlaceholder")}
                        className="text-sm"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`slide${slideNumber}TextPosition${id}`}>{adminT("themes.textPosition")}</Label>
                      <select
                        name={`slide${slideNumber}TextPosition`}
                        id={`slide${slideNumber}TextPosition${id}`}
                        defaultValue={defaultValues[`slide${slideNumber}TextPosition` as keyof typeof defaultValues] as string || "left"}
                        className="w-full px-3 py-2 border rounded-md bg-white text-sm"
                      >
                        <option value="left">{adminT("themes.textLeft")}</option>
                        <option value="center">{adminT("themes.textCenter")}</option>
                        <option value="right">{adminT("themes.textRight")}</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`slide${slideNumber}Subtitle${id}`}>{adminT("themes.slideSubtitle")}</Label>
                    <Textarea
                      name={`slide${slideNumber}Subtitle`}
                      id={`slide${slideNumber}Subtitle${id}`}
                      defaultValue={defaultValues[`slide${slideNumber}Subtitle` as keyof typeof defaultValues] as string || ''}
                      placeholder={adminT("themes.slideSubtitlePlaceholder")}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`slide${slideNumber}ButtonText${id}`}>{adminT("themes.buttonText")}</Label>
                      <Input
                        type="text"
                        name={`slide${slideNumber}ButtonText`}
                        id={`slide${slideNumber}ButtonText${id}`}
                        defaultValue={defaultValues[`slide${slideNumber}ButtonText` as keyof typeof defaultValues] as string || ''}
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}