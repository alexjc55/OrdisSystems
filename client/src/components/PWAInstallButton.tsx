import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('common');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);

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

    // Show button temporarily for testing
    setShowButton(true);
    console.log('Not in PWA mode, showing install button for testing');

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt event received');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowButton(true);
    };

    const handleAppInstalled = () => {
      console.log('App installed');
      setShowButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
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
    
    let message = '';
    
    if (isIOS) {
      message = 'Нажмите кнопку "Поделиться" ↗️ в Safari, затем "На экран Домой"';
    } else if (isAndroid || isChrome) {
      message = 'Откройте меню браузера (⋮) и выберите "Установить приложение"';
    } else {
      message = 'Откройте меню браузера и найдите "Установить приложение" или "Добавить на рабочий стол"';
    }
    
    // Показываем краткое уведомление с инструкцией
    alert(`Для установки приложения:\n${message}`);
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
      >
        <Download className="h-4 w-4" />
        <span className="hidden lg:inline">{t('pwa.installApp')}</span>
      </button>
    );
  }

  return (
    <div 
      className="flex items-center justify-center px-4 py-3 mx-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white transition-all duration-200 cursor-pointer transform hover:scale-105 shadow-lg"
      onClick={handleInstall}
    >
      <Download className="mr-3 h-5 w-5 rtl:ml-3 rtl:mr-0" />
      <span className="font-medium">{t('pwa.installApp')}</span>
    </div>
  );
}