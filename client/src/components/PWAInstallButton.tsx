import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallButtonProps {
  variant?: 'mobile' | 'tablet';
}

export function PWAInstallButton({ variant = 'mobile' }: PWAInstallButtonProps) {
  const { t, i18n } = useTranslation('common');
  const { deferredPrompt, isInstallable, installApp, isInstalled } = usePWAInstall();
  const [showButton, setShowButton] = useState(false);
  
  // Get PWA settings from database
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    select: (data: any) => data
  });

  useEffect(() => {
    if (isInstalled) {
      setShowButton(false);
      return;
    }

    // Show button immediately for mobile devices, or when installable on desktop
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    if (isMobile || (isIOS && isSafari) || isInstallable) {
      setShowButton(true);
    } else {
      // Fallback: show button after 2 seconds for browsers that support PWA
      const supportsPWA = 'serviceWorker' in navigator;
      if (supportsPWA) {
        const timer = setTimeout(() => {
          setShowButton(true);
        }, 2000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isInstalled, isInstallable]);

  const handleInstall = async () => {
    console.log('Install button clicked, isInstallable:', isInstallable);
    
    // Сначала попробуем автоматическую установку через общий контекст
    if (isInstallable) {
      try {
        await installApp();
        setShowButton(false);
        return;
      } catch (error) {
        console.error('Auto install failed:', error);
      }
    }
    
    // Если автоматическая установка недоступна, направляем к меню браузера
    console.log('No auto-install available, directing to browser menu');
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent);
    
    // Get app name from settings or fallback to eDAHouse
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
    
    // Показываем краткое уведомление с инструкцией
    alert(`${t('pwa.installInstructions')}\n${message}`);
  };

  // Don't show if in PWA mode
  if (!showButton) {
    return null;
  }

  if (variant === 'tablet') {
    return (
      <button 
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white transition-all duration-200 hover:scale-105 shadow-md text-sm font-medium"
        onClick={handleInstall}
        title={isInstallable ? t('pwa.installApp') : t('pwa.installInstructions')}
      >
        <Download className="h-4 w-4" />
        <span className="hidden lg:inline">
          {t('pwa.installApp')}
          {!isInstallable && <span className="text-xs opacity-75 ml-1">📋</span>}
        </span>
      </button>
    );
  }

  return (
    <div 
      className="flex items-center justify-center px-4 py-3 mx-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white transition-all duration-200 cursor-pointer transform hover:scale-105 shadow-lg"
      onClick={handleInstall}
      title={deferredPrompt ? t('pwa.installApp') : t('pwa.installInstructions')}
    >
      <Download className="mr-3 h-5 w-5 rtl:ml-3 rtl:mr-0" />
      <span className="font-medium">
        {t('pwa.installApp')}
        {!deferredPrompt && <span className="text-xs opacity-75 ml-1">📋</span>}
      </span>
    </div>
  );
}