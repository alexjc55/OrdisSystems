import { useTranslation } from 'react-i18next';
import { Clock, Phone, CreditCard } from 'lucide-react';

interface HeaderVariantProps {
  storeSettings: any;
  style: 'classic' | 'modern' | 'minimal';
}

export function HeaderVariant({ storeSettings, style }: HeaderVariantProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';

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
    <div className="relative">
      {/* Hero Banner */}
      <div 
        className="relative h-[400px] md:h-[500px] bg-cover bg-center rounded-2xl overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('/api/uploads/Edahouse_sign__source_1750184330403.png')`
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white px-4">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
              {storeSettings.welcomeTitle || "eDAHouse"}
            </h1>
            <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto drop-shadow-md">
              {storeSettings.welcomeDescription || t('home.welcome_description')}
            </p>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <InfoCard
          icon={<Clock className="w-6 h-6" />}
          title={t('home.working_hours')}
          content={storeSettings.workingHours || "09:00 - 21:00"}
          iconColor="var(--color-working-hours-icon)"
          isRTL={isRTL}
        />
        <InfoCard
          icon={<Phone className="w-6 h-6" />}
          title={t('home.contacts')}
          content={storeSettings.phone || "+972-XX-XXX-XXXX"}
          iconColor="var(--color-contacts-icon)"
          isRTL={isRTL}
        />
        <InfoCard
          icon={<CreditCard className="w-6 h-6" />}
          title={t('home.payment_delivery')}
          content={t('home.payment_delivery_info')}
          iconColor="var(--color-payment-delivery-icon)"
          isRTL={isRTL}
        />
      </div>
    </div>
  );
}

function ModernHeader({ storeSettings, t, isRTL }: { storeSettings: any, t: any, isRTL: boolean }) {
  return (
    <div className="relative">
      {/* Modern Split Layout */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 md:p-12">
          {/* Left Content */}
          <div className="flex flex-col justify-center space-y-6">
            <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full text-primary font-medium text-sm w-fit">
              {t('home.fresh_daily')}
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              {storeSettings.welcomeTitle || "eDAHouse"}
            </h1>
            
            <p className="text-lg text-gray-600 leading-relaxed max-w-md">
              {storeSettings.welcomeDescription || t('home.welcome_description')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-primary text-white px-8 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors">
                {t('home.order_now')}
              </button>
              <button className="border border-gray-300 text-gray-700 px-8 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                {t('home.view_menu')}
              </button>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative">
            <div 
              className="h-[300px] md:h-[400px] bg-cover bg-center rounded-2xl shadow-2xl"
              style={{
                backgroundImage: `url('/api/uploads/Edahouse_sign__source_1750184330403.png')`
              }}
            />
          </div>
        </div>
      </div>

      {/* Modern Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <ModernInfoCard
          icon={<Clock className="w-5 h-5" />}
          title={t('home.working_hours')}
          content={storeSettings.workingHours || "09:00 - 21:00"}
          iconColor="var(--color-working-hours-icon)"
          isRTL={isRTL}
        />
        <ModernInfoCard
          icon={<Phone className="w-5 h-5" />}
          title={t('home.contacts')}
          content={storeSettings.phone || "+972-XX-XXX-XXXX"}
          iconColor="var(--color-contacts-icon)"
          isRTL={isRTL}
        />
        <ModernInfoCard
          icon={<CreditCard className="w-5 h-5" />}
          title={t('home.payment_delivery')}
          content={t('home.payment_delivery_info')}
          iconColor="var(--color-payment-delivery-icon)"
          isRTL={isRTL}
        />
      </div>
    </div>
  );
}

function MinimalHeader({ storeSettings, t, isRTL }: { storeSettings: any, t: any, isRTL: boolean }) {
  return (
    <div className="relative">
      {/* Minimal Clean Layout */}
      <div className="text-center py-16 md:py-24">
        <h1 className="text-5xl md:text-7xl font-light text-gray-900 mb-6 tracking-tight">
          {storeSettings.welcomeTitle || "eDAHouse"}
        </h1>
        
        <p className="text-xl text-gray-500 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
          {storeSettings.welcomeDescription || t('home.welcome_description')}
        </p>

        <div className="w-24 h-px bg-primary mx-auto mb-12"></div>

        {/* Minimal Image */}
        <div className="max-w-4xl mx-auto">
          <div 
            className="h-[250px] md:h-[350px] bg-cover bg-center rounded-lg shadow-lg"
            style={{
              backgroundImage: `url('/api/uploads/Edahouse_sign__source_1750184330403.png')`
            }}
          />
        </div>
      </div>

      {/* Minimal Info Strip */}
      <div className="bg-gray-50 rounded-2xl p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <MinimalInfoItem
            icon={<Clock className="w-6 h-6" />}
            title={t('home.working_hours')}
            content={storeSettings.workingHours || "09:00 - 21:00"}
            iconColor="var(--color-working-hours-icon)"
          />
          <MinimalInfoItem
            icon={<Phone className="w-6 h-6" />}
            title={t('home.contacts')}
            content={storeSettings.phone || "+972-XX-XXX-XXXX"}
            iconColor="var(--color-contacts-icon)"
          />
          <MinimalInfoItem
            icon={<CreditCard className="w-6 h-6" />}
            title={t('home.payment_delivery')}
            content={t('home.payment_delivery_info')}
            iconColor="var(--color-payment-delivery-icon)"
          />
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