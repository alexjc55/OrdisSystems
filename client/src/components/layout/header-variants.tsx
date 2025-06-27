import { useTranslation } from 'react-i18next';
import { Clock, Phone, CreditCard, Truck, Star, Shield, Heart, ChefHat } from 'lucide-react';

interface HeaderVariantProps {
  storeSettings: any;
  style: 'classic' | 'modern' | 'minimal';
}

export function HeaderVariant({ storeSettings, style }: HeaderVariantProps) {
  const { t, i18n } = useTranslation();
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
    return <ModernHeader storeSettings={storeSettings} t={t} isRTL={isRTL} />;
  }

  if (style === 'minimal') {
    return <MinimalHeader storeSettings={storeSettings} t={t} isRTL={isRTL} />;
  }

  // Default classic style (current implementation)
  return <ClassicHeader storeSettings={storeSettings} t={t} isRTL={isRTL} />;
}

function ClassicHeader({ storeSettings, t, isRTL }: { storeSettings: any, t: any, isRTL: boolean }) {
  return (
    <div className="relative w-full mb-6 sm:mb-8">
      {/* Classic Gradient Overlay Banner - Auto height with min height */}
      <div className="relative min-h-[14rem] sm:min-h-[12rem] md:min-h-[16rem] w-full overflow-hidden"
           style={{ height: 'auto' }}>
        {/* Background Image with subtle animation */}
        <div 
          className="absolute inset-0 bg-cover bg-center w-full h-full"
          style={{
            backgroundImage: storeSettings?.bannerImage ? `url(${storeSettings.bannerImage})` : 'url(/api/uploads/Edahouse_sign__source_1750184330403.png)',
            animation: 'subtle-zoom 8s ease-in-out infinite'
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/60 to-transparent" />
        
        {/* Glass Effect Content Card */}
        <div className="relative z-10 flex flex-col justify-center text-center px-4 sm:px-6 py-12">
          <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-md rounded-3xl p-6 sm:p-8 md:p-10 border border-white/20 shadow-2xl">
            <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
              {storeSettings.welcomeTitle || "eDAHouse"}
            </h1>
            <p className="text-sm sm:text-lg md:text-xl text-white/95 leading-relaxed max-w-2xl mx-auto mb-6" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
              {storeSettings.storeDescription || "Качественные готовые блюда с доставкой"}
            </p>
            
            {/* Dotted decorative elements */}
            <div className="flex items-center justify-center space-x-3 opacity-80">
              <div className="w-2 h-2 bg-white/70 rounded-full"></div>
              <div className="w-1 h-1 bg-white/50 rounded-full"></div>
              <div className="w-3 h-3 bg-white/80 rounded-full"></div>
              <div className="w-1 h-1 bg-white/50 rounded-full"></div>
              <div className="w-2 h-2 bg-white/70 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModernInfoBlocks({ storeSettings }: { storeSettings: any }) {
  // Function to get icon component by name  
  const getIcon = (iconName: string) => {
    const iconProps = "h-5 w-5 sm:h-6 sm:w-6";
    switch (iconName) {
      case 'clock': return <Clock className={iconProps} />;
      case 'phone': return <Phone className={iconProps} />;
      case 'truck': return <Truck className={iconProps} />;
      case 'credit-card': return <CreditCard className={iconProps} />;
      case 'star': return <Star className={iconProps} />;
      case 'shield': return <Shield className={iconProps} />;
      case 'heart': return <Heart className={iconProps} />;
      case 'chef-hat': return <ChefHat className={iconProps} />;
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

function ModernHeader({ storeSettings, t, isRTL }: { storeSettings: any, t: any, isRTL: boolean }) {
  return (
    <div className="relative w-full mb-6 sm:mb-8">
      {/* Modern Overlay Banner - Full height on mobile, adaptive on larger screens */}
      <div className="relative h-screen sm:min-h-[12rem] md:min-h-[16rem] w-full overflow-hidden"
           style={{ height: 'auto' }}>
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center transform scale-105 w-full h-full"
          style={{
            backgroundImage: storeSettings?.bannerImage ? `url(${storeSettings.bannerImage})` : 'url(/api/uploads/Edahouse_sign__source_1750184330403.png)'
          }}
        />
        
        {/* Dark Gradient Overlay - lighter at top, darker at bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/80 to-black/90" />
        
        {/* Content with internal padding */}
        <div className="relative z-10 flex flex-col justify-center text-center px-4 sm:px-6 py-12">
          <div className="max-w-sm sm:max-w-2xl md:max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-4xl md:text-5xl font-medium sm:font-bold text-white mb-3 sm:mb-4 leading-tight" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
              {storeSettings.welcomeTitle || "eDAHouse"}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white max-w-sm sm:max-w-2xl mx-auto leading-normal sm:leading-relaxed mb-6" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>
              {storeSettings.storeDescription || "Качественные готовые блюда с доставкой"}
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
      </div>
    </div>
  );
}

function MinimalHeader({ storeSettings, t, isRTL }: { storeSettings: any, t: any, isRTL: boolean }) {
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
            backgroundImage: storeSettings?.bannerImage ? `url(${storeSettings.bannerImage})` : 'url(/api/uploads/Edahouse_sign__source_1750184330403.png)',
            animation: 'float 6s ease-in-out infinite'
          }}
        />
        
        {/* Strong White Overlay for readability */}
        <div className="absolute inset-0 bg-white/85" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center text-center px-4 sm:px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold sm:font-light text-gray-900 mb-2 sm:mb-4 tracking-wide">
              {storeSettings.welcomeTitle || "eDAHouse"}
            </h1>
            <p className="text-gray-700 text-sm sm:text-lg md:text-xl font-semibold sm:font-light leading-relaxed max-w-2xl mx-auto mb-4">
              {storeSettings.storeDescription || "Качественные готовые блюда с доставкой"}
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