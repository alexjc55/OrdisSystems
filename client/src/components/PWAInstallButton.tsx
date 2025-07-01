import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

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
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);
  
  // Get PWA settings from database
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    select: (data: any) => data
  });

  useEffect(() => {
    // Check if running in PWA mode (standalone mode)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    const isPWAMode = isStandaloneMode || isIOSStandalone;
    
    console.log('PWA Detection:', { isStandaloneMode, isIOSStandalone, isPWAMode });
    
    if (isPWAMode) {
      // Already running as PWA, don't show install button
      console.log('Already in PWA mode, hiding install button');
      setShowButton(false);
      return;
    }

    // Check if browser supports PWA installation
    const supportsPWA = 'serviceWorker' in navigator;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    let fallbackTimer: NodeJS.Timeout | null = null;
    
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt event received');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowButton(true);
      
      // Clear fallback timer since we got the event
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
    };

    const handleAppInstalled = () => {
      console.log('App installed');
      setShowButton(false);
      setDeferredPrompt(null);
    };

    // Show button immediately for all mobile devices to avoid delay
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile || (isIOS && isSafari)) {
      setShowButton(true);
      console.log('Mobile device or iOS Safari detected, showing install button immediately');
    } else {
      setShowButton(false);
      console.log('Desktop - waiting for beforeinstallprompt event or showing fallback after timeout');
      
      // Fallback: show button after 2 seconds if no beforeinstallprompt event (reduced from 3 to 2)
      fallbackTimer = setTimeout(() => {
        if (supportsPWA) {
          setShowButton(true);
          console.log('Fallback: showing install button after timeout');
        }
      }, 2000);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    console.log('Install button clicked, deferredPrompt:', !!deferredPrompt);
    
    // Сначала попробуем автоматическую установку
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        console.log('Install outcome:', outcome);
        
        if (outcome === 'accepted') {
          setShowButton(false);
        }
        
        setDeferredPrompt(null);
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
        title={deferredPrompt ? t('pwa.installApp') : t('pwa.installInstructions')}
      >
        <Download className="h-4 w-4" />
        <span className="hidden lg:inline">
          {t('pwa.installApp')}
          {!deferredPrompt && <span className="text-xs opacity-75 ml-1">📋</span>}
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