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
  textPosition: 'left-top' | 'left-center' | 'left-bottom' | 'center-top' | 'center-center' | 'center-bottom' | 'right-top' | 'right-center' | 'right-bottom' | 'left' | 'center' | 'right';
}

export function SliderHeader({ storeSettings, t, isRTL, currentLanguage }: SliderHeaderProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(storeSettings?.sliderAutoplay !== false);
  const intervalRef = useRef<NodeJS.Timeout>();
  
  // Touch/swipe support for mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

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
        textPosition: storeSettings?.[`slide${i}TextPosition`] || storeSettings?.[`slide${i}_text_position`] || 'left-center'
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

  // Touch event handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && slides.length > 1) {
      // In RTL, left swipe should go to previous slide
      if (isRTL) {
        prevSlide();
      } else {
        nextSlide();
      }
    }
    
    if (isRightSwipe && slides.length > 1) {
      // In RTL, right swipe should go to next slide
      if (isRTL) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
  };

  const getTextAlignmentClasses = (position: string) => {
    // Handle combined position format (horizontal-vertical)
    const [horizontal] = position.split('-');
    
    switch (horizontal) {
      case 'center':
        return 'text-center items-center justify-center';
      case 'right':
        return `text-right items-end ${isRTL ? 'justify-start' : 'justify-end'}`;
      default: // left or any legacy value
        return `text-left items-start ${isRTL ? 'justify-end' : 'justify-start'}`;
    }
  };

  const getContentPositionClasses = (position: string) => {
    // Handle combined position format (horizontal-vertical)
    const [horizontal, vertical] = position.split('-');
    
    // Determine if we need transforms
    const needsHorizontalTransform = horizontal === 'center';
    const needsVerticalTransform = !vertical || vertical === 'center';
    
    // Build transform class if needed
    let transformClass = '';
    if (needsHorizontalTransform && needsVerticalTransform) {
      transformClass = 'transform -translate-x-1/2 -translate-y-1/2';
    } else if (needsHorizontalTransform) {
      transformClass = 'transform -translate-x-1/2';
    } else if (needsVerticalTransform) {
      transformClass = 'transform -translate-y-1/2';
    }
    
    // Get horizontal positioning
    let horizontalClass = '';
    switch (horizontal) {
      case 'center':
        horizontalClass = 'left-1/2';
        break;
      case 'right':
        horizontalClass = isRTL ? 'left-4 md:left-12' : 'right-4 md:right-12';
        break;
      default: // left or any legacy value
        horizontalClass = isRTL ? 'right-4 md:right-12' : 'left-4 md:left-12';
        break;
    }
    
    // Get vertical positioning
    let verticalClass = '';
    switch (vertical) {
      case 'top':
        verticalClass = 'top-8 md:top-16';
        break;
      case 'bottom':
        // Add extra bottom padding to account for slide indicators (dots)
        verticalClass = 'bottom-16 md:bottom-24';
        break;
      default: // center or any legacy value
        verticalClass = 'top-1/2';
        break;
    }
    
    return `${horizontalClass} ${verticalClass} ${transformClass}`.trim();
  };

  // Enhanced transition effect system
  const getSlideTransform = (slideIndex: number, effect: string) => {
    const isActive = slideIndex === currentSlide;
    const position = slideIndex - currentSlide;
    
    switch (effect) {
      case 'slide':
        return {
          transform: `translateX(${position * 100}%)`,
          opacity: 1,
          transition: 'transform 0.5s ease-in-out'
        };
      case 'slideVertical':
        return {
          transform: `translateY(${position * 100}%)`,
          opacity: 1,
          transition: 'transform 0.5s ease-in-out'
        };
      case 'zoom':
        return {
          transform: isActive ? 'scale(1)' : position > 0 ? 'scale(1.1)' : 'scale(0.9)',
          opacity: isActive ? 1 : 0,
          transition: 'transform 0.5s ease-in-out, opacity 0.5s ease-in-out'
        };
      case 'flip':
        return {
          transform: isActive ? 'rotateY(0deg)' : position > 0 ? 'rotateY(90deg)' : 'rotateY(-90deg)',
          opacity: isActive ? 1 : 0,
          transition: 'transform 0.6s ease-in-out, opacity 0.3s ease-in-out'
        };
      case 'slideScale':
        if (isActive) {
          return {
            transform: 'translateX(0%) scale(1)',
            opacity: 1,
            transition: 'transform 0.6s ease-in-out, opacity 0.6s ease-in-out',
            zIndex: 10
          };
        } else if (position < 0) {
          // Previous slide - scale down and move left
          return {
            transform: `translateX(-20%) scale(0.7)`,
            opacity: 0.6,
            transition: 'transform 0.6s ease-in-out, opacity 0.6s ease-in-out',
            zIndex: 1
          };
        } else {
          // Next slide - stay off screen to the right
          return {
            transform: `translateX(100%) scale(1)`,
            opacity: 0,
            transition: 'transform 0.6s ease-in-out, opacity 0.6s ease-in-out',
            zIndex: 1
          };
        }
      case 'coverflow':
        const angle = position * 45;
        const translateZ = Math.abs(position) * -200;
        return {
          transform: `translateX(${position * 70}%) rotateY(${angle}deg) translateZ(${translateZ}px)`,
          opacity: Math.abs(position) <= 2 ? 1 - Math.abs(position) * 0.3 : 0,
          transition: 'transform 0.6s ease-in-out, opacity 0.6s ease-in-out',
          zIndex: isActive ? 10 : 10 - Math.abs(position)
        };
      default: // fade
        return {
          opacity: isActive ? 1 : 0,
          transition: 'opacity 0.5s ease-in-out'
        };
    }
  };

  const containerStyle = storeSettings?.sliderEffect === 'coverflow' ? {
    perspective: '1000px',
    perspectiveOrigin: 'center center'
  } : {};

  return (
    <div 
      className="slider-container relative h-[60vh] md:h-[80vh] overflow-hidden select-none" 
      style={containerStyle}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides Container */}
      <div className="relative w-full h-full">
        {slides.map((slide, index) => (
          <div
            key={index}
            className="absolute inset-0 w-full h-full"
            style={getSlideTransform(index, storeSettings?.sliderEffect || 'fade')}
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
            <div className={`absolute ${getContentPositionClasses(slide.textPosition)} z-10`} style={{
              maxWidth: slide.textPosition.includes('center-') ? '600px' : '500px',
              width: slide.textPosition.includes('center-') ? 'calc(100vw - 2rem)' : 'auto'
            }}>
              <div className={`relative p-6 rounded-lg backdrop-blur-sm bg-black/30 ${getTextAlignmentClasses(slide.textPosition)}`}>
                <div className="flex flex-col space-y-4">
                  {slide.title && (
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
                      {slide.title}
                    </h1>
                  )}
                  
                  {slide.subtitle && (
                    <p className="text-xl sm:text-2xl md:text-2xl lg:text-3xl text-white/90 leading-relaxed">
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
          </div>
        ))}
      </div>

      {/* Navigation Controls - Only show if more than 1 slide */}
      {slides.length > 1 && (
        <>
          {/* Navigation Arrows - Desktop only */}
          <button
            onClick={prevSlide}
            className="slider-nav-arrow absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full transition-all duration-200 hidden md:flex items-center justify-center z-20"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          
          <button
            onClick={nextSlide}
            className="slider-nav-arrow absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full transition-all duration-200 hidden md:flex items-center justify-center z-20"
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