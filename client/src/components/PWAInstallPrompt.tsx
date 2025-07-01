import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const { t } = useTranslation('common');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed (standalone mode)
    const checkStandalone = () => {
      return window.matchMedia('(display-mode: standalone)').matches ||
             (window.navigator as any).standalone ||
             document.referrer.includes('android-app://');
    };

    // Check if device is iOS
    const checkIOS = () => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent);
    };

    setIsStandalone(checkStandalone());
    setIsIOS(checkIOS());
    setIsInstalled(checkStandalone());

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Don't show if already installed or dismissed recently
      const lastDismissed = localStorage.getItem('pwa-dismissed');
      const daysSinceDismissal = lastDismissed ? 
        (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24) : 999;
      
      if (!checkStandalone() && daysSinceDismissal > 7) {
        setShowPrompt(true);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS, show install prompt after some time if not standalone
    if (checkIOS() && !checkStandalone()) {
      const iosPromptShown = localStorage.getItem('ios-prompt-shown');
      if (!iosPromptShown) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 10000); // Show after 10 seconds
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted PWA install');
      } else {
        console.log('User dismissed PWA install');
        localStorage.setItem('pwa-dismissed', Date.now().toString());
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Error during PWA install:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-dismissed', Date.now().toString());
    
    if (isIOS) {
      localStorage.setItem('ios-prompt-shown', 'true');
    }
  };

  // Don't show if already installed
  if (isInstalled || isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50">
      <div className="bg-white border border-primary/20 rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {isIOS ? <Smartphone className="h-5 w-5 text-primary" /> : <Download className="h-5 w-5 text-primary" />}
            <h3 className="font-semibold text-gray-900">
              {t('pwa.installTitle', 'Установить приложение')}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          {isIOS 
            ? t('pwa.installDescriptionIOS', 'Добавьте eDAHouse на главный экран для быстрого доступа')
            : t('pwa.installDescription', 'Установите eDAHouse для удобного доступа без браузера')
          }
        </p>

        {isIOS ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs">
                1
              </div>
              <span>Нажмите кнопку "Поделиться" <span className="inline-block">📤</span></span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs">
                2
              </div>
              <span>Выберите "На экран Домой" <span className="inline-block">📱</span></span>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleInstallClick} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
              <Download className="h-4 w-4 mr-2" />
              {t('pwa.install', 'Установить')}
            </Button>
            <Button variant="outline" onClick={handleDismiss} className="border-blue-600 text-blue-600 hover:bg-blue-50">
              {t('pwa.later', 'Позже')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}