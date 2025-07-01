import React from 'react';
import { Wifi, WifiOff, Download } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { useTranslation } from 'react-i18next';

export default function PWAStatusBar() {
  const { isOnline, isStandalone } = usePWA();
  const { t } = useTranslation('common');

  // Don't show anything if online and not standalone
  if (isOnline && !isStandalone) {
    return null;
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${isStandalone ? 'block' : ''}`}>
      {/* Offline indicator */}
      {!isOnline && (
        <div className="bg-red-500 text-white text-center py-2 px-4 text-sm">
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span>{t('pwa.offline', 'Работаем в офлайн режиме')}</span>
          </div>
        </div>
      )}
      
      {/* Standalone mode indicator */}
      {isStandalone && (
        <div className="bg-green-600 text-white text-center py-1 px-4 text-xs">
          <div className="flex items-center justify-center gap-1">
            <Download className="h-3 w-3" />
            <span>{t('pwa.installedMode', 'Приложение установлено')}</span>
          </div>
        </div>
      )}
    </div>
  );
}