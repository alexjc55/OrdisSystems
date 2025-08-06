import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getLocalizedField, type SupportedLanguage } from '@shared/localization';
import { useLanguage } from '@/hooks/use-language';

// Import multilingual helper function with fallback to default language
function getMultilingualValue(
  storeSettings: any,
  baseField: string,
  currentLanguage: SupportedLanguage,
  defaultLanguage: SupportedLanguage = 'ru'
): string {
  let langField: string;
  
  if (currentLanguage === 'ru') {
    langField = baseField;
  } else {
    const capitalizedLang = currentLanguage.charAt(0).toUpperCase() + currentLanguage.slice(1);
    langField = `${baseField}${capitalizedLang}`;
  }
  
  // Try to get value for current language, fallback to default language if empty
  const currentValue = storeSettings?.[langField];
  if (currentValue && currentValue.trim() !== '') {
    return currentValue;
  }
  
  // Fallback to default language (Russian)
  return storeSettings?.[baseField] || '';
}

interface SliderHeaderProps {
  storeSettings: any;
  t: any;
  isRTL: boolean;
  currentLanguage: SupportedLanguage;
}

interface SlideData {
  image: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  textPosition: 'left' | 'center' | 'right';
}

export function SliderHeader({ storeSettings, t, isRTL, currentLanguage }: SliderHeaderProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(storeSettings?.sliderAutoplay !== false);
  const intervalRef = useRef<NodeJS.Timeout>();

  // Extract slides data from storeSettings with proper field mapping
  const slides: SlideData[] = [];
  for (let i = 1; i <= 5; i++) {
    // Use correct field names from store_settings (with underscore)
    const slideImage = storeSettings?.[`slide${i}Image`] || storeSettings?.[`slide${i}_image`];
    if (slideImage) {
      slides.push({
        image: slideImage,
        title: storeSettings?.[`slide${i}Title`] || storeSettings?.[`slide${i}_title`] || '',
        subtitle: storeSettings?.[`slide${i}Subtitle`] || storeSettings?.[`slide${i}_subtitle`] || '',
        buttonText: storeSettings?.[`slide${i}ButtonText`] || storeSettings?.[`slide${i}_button_text`] || '',
        buttonLink: storeSettings?.[`slide${i}ButtonLink`] || storeSettings?.[`slide${i}_button_link`] || '',
        textPosition: storeSettings?.[`slide${i}TextPosition`] || storeSettings?.[`slide${i}_text_position`] || 'left'
      });
    }
  }

  // If no slides, show fallback
  if (slides.length === 0) {
    return (
      <div className="relative h-[60vh] md:h-[80vh] bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            {getMultilingualValue(storeSettings, 'storeName', currentLanguage) || "eDAHouse"}
          </h1>
          <p className="text-xl md:text-2xl opacity-90">
            {getMultilingualValue(storeSettings, 'welcomeTitle', currentLanguage) || t('welcome')}
          </p>
        </div>
      </div>
    );
  }

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && slides.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, storeSettings?.sliderSpeed || 5000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, slides.length, storeSettings?.sliderSpeed]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const getTextAlignmentClasses = (position: string) => {
    switch (position) {
      case 'center':
        return 'text-center items-center justify-center';
      case 'right':
        return `text-right items-end ${isRTL ? 'justify-start' : 'justify-end'}`;
      default:
        return `text-left items-start ${isRTL ? 'justify-end' : 'justify-start'}`;
    }
  };

  const getContentPositionClasses = (position: string) => {
    switch (position) {
      case 'center':
        return 'left-1/2 transform -translate-x-1/2';
      case 'right':
        return isRTL ? 'left-4 md:left-12' : 'right-4 md:right-12';
      default:
        return isRTL ? 'right-4 md:right-12' : 'left-4 md:left-12';
    }
  };

  const effectClass = storeSettings?.sliderEffect === 'slide' ? 'transform transition-transform duration-500 ease-in-out' : 'transition-opacity duration-500 ease-in-out';

  return (
    <div className="relative h-[60vh] md:h-[80vh] overflow-hidden">
      {/* Slides Container */}
      <div className="relative w-full h-full">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 w-full h-full ${effectClass} ${
              storeSettings?.sliderEffect === 'slide'
                ? `translate-x-[${(index - currentSlide) * 100}%]`
                : index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url(${slide.image})`,
              }}
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
            
            {/* Content */}
            <div className={`absolute top-1/2 transform -translate-y-1/2 ${getContentPositionClasses(slide.textPosition)} max-w-lg z-10`}>
              <div className={`flex flex-col space-y-4 ${getTextAlignmentClasses(slide.textPosition)}`}>
                {slide.title && (
                  <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                    {slide.title}
                  </h1>
                )}
                
                {slide.subtitle && (
                  <p className="text-lg md:text-xl lg:text-2xl text-white/90 leading-relaxed">
                    {slide.subtitle}
                  </p>
                )}
                
                {slide.buttonText && slide.buttonLink && (
                  <div className="pt-4">
                    <Button
                      asChild
                      size="lg"
                      className="bg-primary hover:bg-primary-hover text-white px-8 py-3 text-lg font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
                    >
                      <a href={slide.buttonLink}>
                        {slide.buttonText}
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Controls - Only show if more than 1 slide */}
      {slides.length > 1 && (
        <>
          {/* Navigation Arrows - Desktop only */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full transition-all duration-200 hidden md:flex items-center justify-center z-20"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full transition-all duration-200 hidden md:flex items-center justify-center z-20"
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Slide Indicators */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentSlide
                    ? 'bg-white'
                    : 'bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Play/Pause Control */}
          <button
            onClick={togglePlayPause}
            className="absolute bottom-6 right-6 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-all duration-200 z-20"
            aria-label={isPlaying ? 'Pause autoplay' : 'Start autoplay'}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
        </>
      )}
    </div>
  );
}