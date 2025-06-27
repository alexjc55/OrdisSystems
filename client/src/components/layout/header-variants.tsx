import { useTranslation } from 'react-i18next';
import { Clock, Phone, CreditCard } from 'lucide-react';

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
      {/* Classic Gradient Overlay Banner - Full Width */}
      <div className="relative h-48 sm:h-64 md:h-80 w-full overflow-hidden">
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
        
        {/* Content with glass effect */}
        <div className="relative z-10 h-full flex items-center justify-start px-4 sm:px-6 md:px-16">
          <div className="max-w-3xl backdrop-blur-sm bg-white/10 rounded-xl p-4 sm:p-8 border border-white/20">
            <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold text-white mb-3 sm:mb-6 drop-shadow-xl">
              {storeSettings.welcomeTitle || "eDAHouse"}
            </h1>
            <p className="text-sm sm:text-xl md:text-2xl text-white/95 drop-shadow-lg leading-relaxed mb-4">
              {storeSettings.storeDescription || "Качественные готовые блюда с доставкой"}
            </p>
            {/* Decorative vignette */}
            <div className="flex items-center space-x-3 opacity-70">
              <div className="w-6 h-px bg-white/50"></div>
              <div className="w-1.5 h-1.5 bg-white/50 rounded-full"></div>
              <div className="w-3 h-3 border border-white/50 rounded-full"></div>
              <div className="w-1.5 h-1.5 bg-white/50 rounded-full"></div>
              <div className="w-6 h-px bg-white/50"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModernHeader({ storeSettings, t, isRTL }: { storeSettings: any, t: any, isRTL: boolean }) {
  return (
    <div className="relative w-full mb-6 sm:mb-8">
      {/* Modern Overlay Banner - Full Width */}
      <div className="relative h-56 sm:h-56 md:h-64 w-full overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center transform scale-105 w-full h-full"
          style={{
            backgroundImage: storeSettings?.bannerImage ? `url(${storeSettings.bannerImage})` : 'url(/api/uploads/Edahouse_sign__source_1750184330403.png)'
          }}
        />
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/75 to-black/60" />
        
        {/* Content */}
        <div className="relative z-10 h-full flex items-center justify-center text-center px-4 sm:px-6">
          <div className="max-w-sm sm:max-w-2xl md:max-w-4xl">
            <h1 className="text-3xl sm:text-3xl md:text-5xl font-medium sm:font-bold text-white mb-3 sm:mb-4 leading-tight" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
              {storeSettings.welcomeTitle || "eDAHouse"}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white max-w-sm sm:max-w-2xl mx-auto leading-normal sm:leading-relaxed mb-4" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>
              {storeSettings.storeDescription || "Качественные готовые блюда с доставкой"}
            </p>
            {/* Decorative vignette */}
            <div className="flex items-center justify-center space-x-2 opacity-80">
              <div className="w-8 h-px bg-white/60"></div>
              <div className="w-2 h-2 border border-white/60 rotate-45"></div>
              <div className="w-8 h-px bg-white/60"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MinimalHeader({ storeSettings, t, isRTL }: { storeSettings: any, t: any, isRTL: boolean }) {
  return (
    <div className="relative w-full mb-6 sm:mb-8">
      {/* Minimal Full Width Banner */}
      <div className="relative h-56 sm:h-48 md:h-64 w-full overflow-hidden">
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
        <div className="relative z-10 h-full flex items-center justify-center text-center px-4 sm:px-6 pt-12 pb-12">
          <div className="max-w-3xl">
            <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold sm:font-light text-gray-900 mb-2 sm:mb-4 tracking-wide">
              {storeSettings.welcomeTitle || "eDAHouse"}
            </h1>
            <p className="text-gray-700 text-sm sm:text-lg md:text-xl font-semibold sm:font-light leading-relaxed max-w-2xl mx-auto mb-4">
              {storeSettings.storeDescription || "Качественные готовые блюда с доставкой"}
            </p>
            {/* Call to Action Button */}
            <div className="mt-6">
              <button 
                onClick={() => {
                  const link = storeSettings.bannerButtonLink || "#categories";
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
                {storeSettings.bannerButtonText || "Смотреть каталог"}
              </button>
            </div>
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