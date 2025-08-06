import { useTranslation } from 'react-i18next';
import { Clock, Phone, MapPin, CreditCard, Truck, Star, Shield, Heart, ChefHat, Zap, Award, Users, ThumbsUp, CheckCircle, Gift, Smile } from 'lucide-react';
import { getLocalizedField, type SupportedLanguage } from '@shared/localization';
import { useLanguage } from '@/hooks/use-language';
import { useState, useEffect } from 'react';

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

// Helper function to get icon component
const getIconComponent = (iconName: string) => {
  const iconProps = "h-6 w-6";
  switch (iconName) {
    case 'Clock': return <Clock className={iconProps} />;
    case 'Phone': return <Phone className={iconProps} />;
    case 'MapPin': return <MapPin className={iconProps} />;
    case 'Truck': return <Truck className={iconProps} />;
    case 'Star': return <Star className={iconProps} />;
    case 'Shield': return <Shield className={iconProps} />;
    case 'Heart': return <Heart className={iconProps} />;
    case 'ChefHat': return <ChefHat className={iconProps} />;
    default: return <Clock className={iconProps} />;
  }
};

interface HeaderVariantProps {
  storeSettings: any;
  style: 'classic' | 'modern' | 'minimal';
}

export function HeaderVariant({ storeSettings, style }: HeaderVariantProps) {
  const { t, i18n } = useTranslation();
  const { currentLanguage } = useLanguage();
  const isRTL = i18n.language === 'he';

  // Return loading state if storeSettings is not yet loaded
  if (!storeSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (style === 'modern') {
    return <ModernHeader storeSettings={storeSettings} t={t} isRTL={isRTL} currentLanguage={currentLanguage} />;
  }

  if (style === 'minimal') {
    return <MinimalHeader storeSettings={storeSettings} t={t} isRTL={isRTL} currentLanguage={currentLanguage} />;
  }

  // Default classic style (current implementation)
  return <ClassicHeader storeSettings={storeSettings} t={t} isRTL={isRTL} currentLanguage={currentLanguage} />;
}

function ClassicHeader({ storeSettings, t, isRTL, currentLanguage }: { storeSettings: any, t: any, isRTL: boolean, currentLanguage: string }) {
  return (
    <>
      {/* Pure Image Banner - Only show if enabled */}
      {storeSettings?.showBannerImage !== false && (
        <div className="relative h-32 sm:h-40 overflow-hidden">
          <img 
            src={storeSettings.bannerImageUrl || storeSettings.bannerImage || "/api/uploads/Edahouse_sign__source_1750184330403.png"} 
            alt="Background" 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {/* Text Content Section Below Banner - Only show if enabled */}
      {storeSettings?.showTitleDescription !== false && (
        <div className="header-banner bg-gray-50 py-12 text-center">
          <div className="banner-content container mx-auto px-6">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              {getMultilingualValue(storeSettings, 'welcomeTitle', currentLanguage as SupportedLanguage) || getMultilingualValue(storeSettings, 'storeName', currentLanguage as SupportedLanguage)}
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed mb-6">
              {getMultilingualValue(storeSettings, 'storeDescription', currentLanguage as SupportedLanguage)}
            </p>
            
            {/* Orange underline accent */}
            <div className="flex justify-center">
              <div 
                className="h-1 w-16 rounded-full"
                style={{ backgroundColor: 'var(--color-primary, #ff6600)' }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ModernInfoBlocks({ storeSettings }: { storeSettings: any }) {
  // Function to get icon component by name  
  const getIcon = (iconName: string) => {
    const iconProps = "h-5 w-5 sm:h-6 sm:w-6";
    switch (iconName) {
      case 'Clock': return <Clock className={iconProps} />;
      case 'Phone': return <Phone className={iconProps} />;
      case 'Truck': return <Truck className={iconProps} />;
      case 'CreditCard': return <CreditCard className={iconProps} />;
      case 'Star': return <Star className={iconProps} />;
      case 'Shield': return <Shield className={iconProps} />;
      case 'Heart': return <Heart className={iconProps} />;
      case 'ChefHat': return <ChefHat className={iconProps} />;
      case 'MapPin': return <MapPin className={iconProps} />;
      case 'Zap': return <Zap className={iconProps} />;
      case 'Award': return <Award className={iconProps} />;
      case 'Users': return <Users className={iconProps} />;
      case 'ThumbsUp': return <ThumbsUp className={iconProps} />;
      case 'CheckCircle': return <CheckCircle className={iconProps} />;
      case 'Gift': return <Gift className={iconProps} />;
      case 'Smile': return <Smile className={iconProps} />;
      default: return <Star className={iconProps} />;
    }
  };

  // Collect valid blocks (only show blocks with text)
  const blocks = [];
  
  if (storeSettings?.modernBlock1Text?.trim()) {
    blocks.push({
      icon: getIcon(storeSettings.modernBlock1Icon || 'star'),
      text: storeSettings.modernBlock1Text
    });
  }
  
  if (storeSettings?.modernBlock2Text?.trim()) {
    blocks.push({
      icon: getIcon(storeSettings.modernBlock2Icon || 'star'),
      text: storeSettings.modernBlock2Text
    });
  }
  
  if (storeSettings?.modernBlock3Text?.trim()) {
    blocks.push({
      icon: getIcon(storeSettings.modernBlock3Icon || 'star'),
      text: storeSettings.modernBlock3Text
    });
  }

  // Don't render anything if no blocks
  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mt-4 max-w-4xl mx-auto px-2">
      {blocks.map((block, index) => (
        <div 
          key={index}
          className="flex flex-col items-center justify-center text-center min-h-[5rem] sm:min-h-[6rem]"
          style={{ 
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            color: 'rgba(255, 255, 255, 0.95)'
          }}
        >
          <div 
            className="flex-shrink-0 p-3 sm:p-3.5 rounded-full mb-3"
            style={{ 
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-primary-foreground)'
            }}
          >
            {block.icon}
          </div>
          <span className="text-base sm:text-lg font-medium leading-tight px-2 break-words">
            {block.text}
          </span>
        </div>
      ))}
    </div>
  );
}

function ModernHeader({ storeSettings, t, isRTL, currentLanguage }: { storeSettings: any, t: any, isRTL: boolean, currentLanguage: string }) {
  const [appHash, setAppHash] = useState<string>('');

  // Get app hash for cache busting
  useEffect(() => {
    const fetchAppHash = async () => {
      try {
        const response = await fetch('/api/version');
        if (response.ok) {
          const data = await response.json();
          setAppHash(data.appHash || Date.now().toString());
        }
      } catch (error) {
        console.warn('Failed to fetch app hash, using timestamp');
        setAppHash(Date.now().toString());
      }
    };
    
    fetchAppHash();
    
    // Listen for theme updates to refresh banner
    const handleThemeUpdate = () => {
      fetchAppHash();
      // Force re-render with new timestamp
      setTimeout(() => {
        setAppHash(Date.now().toString());
      }, 100);
    };
    
    window.addEventListener('themeUpdated', handleThemeUpdate);
    
    return () => {
      window.removeEventListener('themeUpdated', handleThemeUpdate);
    };
  }, []);

  // Only show header if banner is enabled, otherwise return null
  if (storeSettings?.showBannerImage === false) {
    return null;
  }

  return (
    <div className="relative w-full mb-0 sm:mb-8">
      {/* Modern Overlay Banner - Full height on mobile, adaptive on larger screens */}
      <div className="relative h-dvh sm:h-auto sm:min-h-[12rem] md:min-h-[16rem] w-full overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center transform scale-105 w-full h-full"
          style={{
            backgroundImage: storeSettings?.bannerImageUrl ? `url(${storeSettings.bannerImageUrl}?v=${appHash})` : (storeSettings?.bannerImage ? `url(${storeSettings.bannerImage}?v=${appHash})` : 'url(/api/uploads/Edahouse_sign__source_1750184330403.png)')
          }}
        />
        
        {/* Dark Gradient Overlay - lighter at top, darker at bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/80 to-black/90" />
        
        {/* Content with internal padding - Only show title/description if enabled */}
        {storeSettings?.showTitleDescription !== false && (
          <div className="header-banner relative z-10 flex flex-col justify-center text-center px-4 sm:px-6 py-12">
            <div className="banner-content max-w-sm sm:max-w-2xl md:max-w-4xl mx-auto">
              <h1 
                className="font-bold text-white mb-4 sm:mb-4 leading-none modern-header-title"
                style={{ 
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                  lineHeight: '1 !important'
                }}
              >
                {getMultilingualValue(storeSettings, 'welcomeTitle', currentLanguage as SupportedLanguage) || getMultilingualValue(storeSettings, 'storeName', currentLanguage as SupportedLanguage)}
              </h1>
              <p className="text-xl sm:text-lg md:text-xl text-white max-w-sm sm:max-w-2xl mx-auto leading-normal sm:leading-relaxed mb-8" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>
                {getMultilingualValue(storeSettings, 'storeDescription', currentLanguage as SupportedLanguage)}
              </p>
            
              {/* Decorative vignette */}
              <div className="flex items-center justify-center space-x-2 opacity-80 mb-8">
                <div className="w-8 h-px bg-white/60"></div>
                <div className="w-2 h-2 border border-white/60 rotate-45"></div>
                <div className="w-8 h-px bg-white/60"></div>
              </div>

              {/* Modern Info Blocks */}
              <ModernInfoBlocks storeSettings={storeSettings} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MinimalHeader({ storeSettings, t, isRTL, currentLanguage }: { storeSettings: any, t: any, isRTL: boolean, currentLanguage: string }) {
  // Only show header if banner is enabled, otherwise return null
  if (storeSettings?.showBannerImage === false) {
    return null;
  }

  // Check if button should be shown - only if text is explicitly provided
  const buttonText = storeSettings?.bannerButtonText;
  const showButton = buttonText && 
                     typeof buttonText === 'string' && 
                     buttonText.trim() !== '';
  
  return (
    <div className="relative w-full mb-6 sm:mb-8">
      {/* Minimal Full Width Banner - Auto height with min height */}
      <div className="relative min-h-[14rem] sm:min-h-[12rem] md:min-h-[16rem] w-full overflow-hidden"
           style={{ height: 'auto' }}>
        {/* Background Image with strong overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center w-full h-full"
          style={{
            backgroundImage: storeSettings?.bannerImageUrl ? `url(${storeSettings.bannerImageUrl})` : (storeSettings?.bannerImage ? `url(${storeSettings.bannerImage})` : 'url(/api/uploads/Edahouse_sign__source_1750184330403.png)'),
            animation: 'float 6s ease-in-out infinite'
          }}
        />
        
        {/* Strong White Overlay for readability */}
        <div className="absolute inset-0 bg-white/85" />
        
        {/* Content - Only show title/description if enabled */}
        {storeSettings?.showTitleDescription !== false && (
          <div className="header-banner relative z-10 flex flex-col justify-center text-center px-4 sm:px-6 py-12">
            <div className="banner-content max-w-3xl mx-auto">
              <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold sm:font-light text-gray-900 mb-2 sm:mb-4 tracking-wide">
                {getMultilingualValue(storeSettings, 'welcomeTitle', currentLanguage as SupportedLanguage) || getMultilingualValue(storeSettings, 'storeName', currentLanguage as SupportedLanguage)}
              </h1>
              <p className="text-gray-700 text-sm sm:text-lg md:text-xl font-semibold sm:font-light leading-relaxed max-w-2xl mx-auto mb-4">
                {getMultilingualValue(storeSettings, 'storeDescription', currentLanguage as SupportedLanguage)}
              </p>
              {/* Call to Action Button - only show if button text is provided */}
              {showButton && (
                <div className="mt-6">
                  <button 
                    onClick={() => {
                      // Use provided link or default to categories section
                      const link = storeSettings.bannerButtonLink && storeSettings.bannerButtonLink.trim() !== '' 
                        ? storeSettings.bannerButtonLink 
                        : "#categories";
                      if (link.startsWith('#')) {
                        const element = document.querySelector(link);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth' });
                        }
                      } else {
                        window.location.href = link;
                      }
                    }}
                    className="inline-flex items-center px-6 py-3 font-medium text-sm sm:text-base rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-primary-foreground)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                    }}
                  >
                    {storeSettings.bannerButtonText}
                  </button>
                </div>
              )}
              {/* Decorative vignette */}
              <div className="flex items-center justify-center space-x-2 opacity-60 mt-4">
                <div className="w-8 h-px bg-primary/40"></div>
                <div className="w-2 h-2 bg-primary/60 rounded-full"></div>
                <div className="w-4 h-px bg-primary/60"></div>
                <div className="w-2 h-2 bg-primary/60 rounded-full"></div>
                <div className="w-8 h-px bg-primary/40"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function InfoCard({ icon, title, content, iconColor, isRTL }: any) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
      <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-4' : 'space-x-4'} mb-4`}>
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md"
          style={{ backgroundColor: iconColor }}
        >
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-gray-600 leading-relaxed">{content}</p>
    </div>
  );
}

function ModernInfoCard({ icon, title, content, iconColor, isRTL }: any) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 transition-colors">
      <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'} mb-3`}>
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: iconColor }}
        >
          {icon}
        </div>
        <h3 className="text-base font-medium text-gray-900">{title}</h3>
      </div>
      <p className="text-sm text-gray-600">{content}</p>
    </div>
  );
}

function MinimalInfoItem({ icon, title, content, iconColor }: any) {
  return (
    <div className="space-y-3">
      <div 
        className="w-12 h-12 rounded-full flex items-center justify-center text-white mx-auto"
        style={{ backgroundColor: iconColor }}
      >
        {icon}
      </div>
      <h3 className="text-base font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-600">{content}</p>
    </div>
  );
}