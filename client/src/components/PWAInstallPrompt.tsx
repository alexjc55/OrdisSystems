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

  // Push notifications are handled by separate PushNotificationRequest component

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
      
      // Don't show if already installed
      if (!checkStandalone()) {
        setShowPrompt(true);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS, show install prompt after some time if not standalone
    if (checkIOS() && !checkStandalone()) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
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
        // After successful install, automatically request push permissions
        setTimeout(() => {
          // Trigger push notification request after PWA installation
          window.dispatchEvent(new CustomEvent('pwa-installed'));
        }, 1000);
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
    if (isIOS) {
      localStorage.setItem('ios-prompt-shown', 'true');
    } else {
      localStorage.setItem('pwa-dismissed', Date.now().toString());
    }
  };

  const handleIOSInstall = () => {
    setShowPrompt(false);
    localStorage.setItem('ios-prompt-shown', 'true');
    // Trigger push notification request after iOS "installation"
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('pwa-installed'));
    }, 2000); // Longer delay for iOS
    // For iOS, we can't auto-request push permission, user needs to do it manually
  };

  // Don't show if already installed
  if (isInstalled || isStandalone) {
    return null;
  }

  if (!showPrompt) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
      
      {/* Install Prompt */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              {isIOS ? <Smartphone className="w-5 h-5 text-white" /> : <Download className="w-5 h-5 text-white" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {isIOS ? t('pwa.iosInstallTitle') : t('pwa.installTitle')}
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                {isIOS ? t('pwa.iosInstallMessage') : t('pwa.installMessage')}
              </p>
              
              {isIOS ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>1.</span>
                    <span>{t('pwa.iosStep1')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>2.</span>
                    <span>{t('pwa.iosStep2')}</span>
                  </div>
                </div>
              ) : null}
            </div>
            
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex gap-2 mt-4">
            {!isIOS && (
              <Button 
                onClick={handleInstallClick}
                className="flex-1 text-xs"
                size="sm"
              >
                {t('pwa.install')}
              </Button>
            )}
            {isIOS && (
              <Button 
                onClick={handleIOSInstall}
                className="flex-1 text-xs"
                size="sm"
              >
                {t('pwa.gotIt')}
              </Button>
            )}
            <Button 
              onClick={handleDismiss}
              variant="outline"
              className="flex-1 text-xs"
              size="sm"
            >
              {t('pwa.later')}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}