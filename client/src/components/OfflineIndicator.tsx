import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePWA } from './PWAInstaller';

export function OfflineIndicator() {
  const { t } = useTranslation('common');
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">
        {t('pwa.offline', 'You are offline')}
      </span>
    </div>
  );
}

export function OnlineIndicator() {
  const { t } = useTranslation('common');
  const [showOnlineMessage, setShowOnlineMessage] = React.useState(false);
  const { isOnline } = usePWA();
  const [wasOffline, setWasOffline] = React.useState(false);

  React.useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline && isOnline) {
      setShowOnlineMessage(true);
      setWasOffline(false);
      
      // Hide message after 3 seconds
      const timer = setTimeout(() => {
        setShowOnlineMessage(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!showOnlineMessage) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-in slide-in-from-top duration-300">
      <Wifi className="h-4 w-4" />
      <span className="text-sm font-medium">
        {t('pwa.online', 'Connection restored')}
      </span>
    </div>
  );
}