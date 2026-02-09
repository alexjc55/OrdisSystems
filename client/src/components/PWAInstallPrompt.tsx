import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { 
  isIOSDevice, 
  isStandaloneMode, 
  shouldShowPWAInstallPrompt, 
  markPWAPromptDismissed,
  setPWAPromptShowing,
  trackVisit
} from '@/lib/prompt-utils';

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

  useEffect(() => {
    // Track user visit
    trackVisit();
    
    const checkIOS = isIOSDevice();
    const checkStandalone = isStandaloneMode();
    
    setIsIOS(checkIOS);
    setIsInstalled(checkStandalone);

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Check if we should show the prompt (includes desktop check, visit count, etc.)
      if (shouldShowPWAInstallPrompt()) {
        setTimeout(() => {
          setShowPrompt(true);
          setPWAPromptShowing(true);
        }, 3000); // 3 second delay
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      setPWAPromptShowing(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS, show install prompt after delay if conditions are met
    if (checkIOS && !checkStandalone) {
      if (shouldShowPWAInstallPrompt()) {
        setTimeout(() => {
          setShowPrompt(true);
          setPWAPromptShowing(true);
        }, 5000); // 5 second delay for iOS to give user time to explore
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
        console.log('✅ User accepted PWA install');
        setPWAPromptShowing(false);
        
        // After successful install, trigger push notification request after delay
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('pwa-installed'));
        }, 15000); // 15 second delay before showing push request
      } else {
        console.log('❌ User dismissed PWA install');
        markPWAPromptDismissed(false);
        setPWAPromptShowing(false);
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Error during PWA install:', error);
      setPWAPromptShowing(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setPWAPromptShowing(false);
    markPWAPromptDismissed(isIOS);
  };

  const handleIOSInstall = () => {
    setShowPrompt(false);
    setPWAPromptShowing(false);
    markPWAPromptDismissed(true);
    
    // Trigger push notification request after iOS "installation" with longer delay
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('pwa-installed'));
    }, 20000); // 20 second delay for iOS - give user time to add to home screen
  };

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  if (!showPrompt) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" />
      
      {/* Install Prompt */}
      <div className="fixed bottom-0 left-0 right-0 z-[61] p-4 bg-white border-t border-gray-200 shadow-lg">
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