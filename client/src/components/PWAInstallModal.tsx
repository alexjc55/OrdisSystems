import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Download, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function PWAInstallModal() {
  const { t, i18n } = useTranslation('common');
  const [showModal, setShowModal] = useState(false);
  const { isInstallable, installApp, isInstalled } = usePWAInstall();

  // Get PWA settings from database
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    select: (data: any) => data
  });

  useEffect(() => {
    if (isInstalled) {
      console.log('Already in PWA mode, not showing install modal');
      return;
    }

    // Check if user already dismissed this session
    const dismissedThisSession = sessionStorage.getItem('pwa-modal-dismissed');
    if (dismissedThisSession) {
      console.log('PWA modal already dismissed this session');
      return;
    }

    // Check if it's a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isMobile) {
      console.log('Not a mobile device, not showing PWA modal');
      return;
    }

    // Show modal after 3 seconds on mobile devices
    const timer = setTimeout(() => {
      setShowModal(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isInstalled]);

  const handleInstall = async () => {
    console.log('Install clicked from modal, isInstallable:', isInstallable);

    if (isInstallable) {
      try {
        await installApp();
        setShowModal(false);
        return;
      } catch (error) {
        console.error('Auto install failed:', error);
      }
    }

    // Fallback to instructions
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent);
    
    // Get app name from settings
    const currentLang = i18n.language;
    let appName = 'eDAHouse';
    
    if (settings) {
      const pwaNameField = `pwaName${currentLang === 'ru' ? '' : currentLang.charAt(0).toUpperCase() + currentLang.slice(1)}`;
      appName = settings[pwaNameField] || settings.pwaName || 'eDAHouse';
    }
    
    let message = '';
    
    if (isIOS) {
      message = t('pwa.ios');
    } else if (isAndroid) {
      message = t('pwa.android');
    } else if (isChrome) {
      message = t('pwa.chrome', { appName });
    } else {
      message = t('pwa.fallback');
    }
    
    alert(`${t('pwa.installInstructions')}\n${message}`);
    handleDismiss();
  };

  const handleDismiss = () => {
    setShowModal(false);
    sessionStorage.setItem('pwa-modal-dismissed', 'true');
  };

  if (!showModal) {
    return null;
  }

  // Get app name and description from settings
  const currentLang = i18n.language;
  let appName = 'eDAHouse';
  let appDescription = t('pwa.installDescription');
  
  if (settings) {
    const pwaNameField = `pwaName${currentLang === 'ru' ? '' : currentLang.charAt(0).toUpperCase() + currentLang.slice(1)}`;
    const pwaDescField = `pwaDescription${currentLang === 'ru' ? '' : currentLang.charAt(0).toUpperCase() + currentLang.slice(1)}`;
    
    appName = settings[pwaNameField] || settings.pwaName || 'eDAHouse';
    appDescription = settings[pwaDescField] || settings.pwaDescription || t('pwa.installDescription');
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 p-4">
      <div className="bg-white rounded-t-2xl w-full max-w-md p-6 shadow-2xl transform transition-transform duration-300 translate-y-0">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Download className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">{t('pwa.installTitle')} {appName}</h3>
              <p className="text-sm text-gray-600">{appDescription}</p>
            </div>
          </div>
          <button 
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={handleInstall}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('pwa.install')}
          </Button>
          <Button 
            onClick={handleDismiss}
            variant="outline"
            className="px-6"
          >
            {t('pwa.later')}
          </Button>
        </div>
      </div>
    </div>
  );
}