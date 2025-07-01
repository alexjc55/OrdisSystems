import React from 'react';
import { Wifi, WifiOff, Download } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { useTranslation } from 'react-i18next';

export default function PWAStatusBar() {
  const { isOnline } = usePWA();
  const { t } = useTranslation('common');

  // Only show offline indicator when offline
  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Offline indicator only */}
      <div className="bg-red-500 text-white text-center py-2 px-4 text-sm">
        <div className="flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>{t('pwa.offline', 'Работаем в офлайн режиме')}</span>
        </div>
      </div>
    </div>
  );
}