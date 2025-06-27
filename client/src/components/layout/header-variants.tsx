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
    <div className="relative w-full">
      {/* Classic Gradient Overlay Banner - Full Width */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden">
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
        <div className="relative z-10 h-full flex items-center justify-start px-6 md:px-16">
          <div className="max-w-3xl backdrop-blur-sm bg-white/10 rounded-xl p-8 border border-white/20">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-xl">
              {storeSettings.welcomeTitle || "eDAHouse"}
            </h1>
            <p className="text-xl md:text-2xl text-white/95 mb-8 drop-shadow-lg leading-relaxed">
              {storeSettings.storeDescription || "Качественные готовые блюда с доставкой"}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-white text-primary px-8 py-4 rounded-lg font-semibold hover:bg-white/90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-lg">
                Смотреть меню
              </button>
              <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-primary transition-all duration-300 text-lg">
                Контакты
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModernHeader({ storeSettings, t, isRTL }: { storeSettings: any, t: any, isRTL: boolean }) {
  return (
    <div className="relative w-full">
      {/* Modern Overlay Banner - Full Width */}
      <div className="relative h-60 md:h-96 w-full overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center transform scale-105 w-full h-full"
          style={{
            backgroundImage: storeSettings?.bannerImage ? `url(${storeSettings.bannerImage})` : 'url(/api/uploads/Edahouse_sign__source_1750184330403.png)'
          }}
        />
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
        
        {/* Content */}
        <div className="relative z-10 h-full flex items-center justify-center text-center px-6">
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-7xl font-bold text-white mb-6 drop-shadow-lg">
              {storeSettings.welcomeTitle || "eDAHouse"}
            </h1>
            <p className="text-xl md:text-3xl text-white/90 mb-8 drop-shadow-md max-w-3xl mx-auto leading-relaxed">
              {storeSettings.storeDescription || "Качественные готовые блюда с доставкой"}
            </p>
            <button className="bg-primary hover:bg-primary/90 text-white px-12 py-5 rounded-xl font-semibold transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 text-xl">
              Заказать сейчас
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MinimalHeader({ storeSettings, t, isRTL }: { storeSettings: any, t: any, isRTL: boolean }) {
  return (
    <div className="relative">
      {/* Minimal Animated Background */}
      <div className="relative h-40 md:h-48 rounded-2xl overflow-hidden">
        {/* Animated Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center animate-pulse-slow"
          style={{
            backgroundImage: storeSettings?.bannerImage ? `url(${storeSettings.bannerImage})` : 'url(/api/uploads/Edahouse_sign__source_1750184330403.png)',
            animation: 'float 6s ease-in-out infinite'
          }}
        />
        
        {/* Subtle Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white/40" />
        
        {/* Content */}
        <div className="relative z-10 h-full flex items-center justify-center text-center px-6">
          <div className="backdrop-blur-sm bg-white/10 rounded-2xl p-6 border border-white/20">
            <h1 className="text-2xl md:text-4xl font-light text-white mb-3 tracking-wide drop-shadow-lg">
              {storeSettings.welcomeTitle || "eDAHouse"}
            </h1>
            <p className="text-white/90 text-sm md:text-base font-light leading-relaxed max-w-md mx-auto drop-shadow-md">
              {storeSettings.storeDescription || "Качественные готовые блюда с доставкой"}
            </p>
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