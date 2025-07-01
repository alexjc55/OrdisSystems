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

export function PWAInstallButton() {
  const { t } = useTranslation('common');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running in PWA mode (standalone mode)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    const isPWAMode = isStandaloneMode || isIOSStandalone;
    
    if (isPWAMode) {
      // Already running as PWA, don't show install button
      setIsInstalled(true);
      return;
    }

    // Check if already installed
    if ('serviceWorker' in navigator && 'getInstalledRelatedApps' in navigator) {
      // @ts-ignore
      navigator.getInstalledRelatedApps().then((apps: any[]) => {
        setIsInstalled(apps.length > 0);
      }).catch(() => {
        // Fallback detection
        setIsInstalled(false);
      });
    } else {
      // Default to not installed for browsers that don't support detection
      setIsInstalled(false);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
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
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Install failed:', error);
    }
  };

  // Don't show if already installed or no install prompt available
  if (isInstalled || !deferredPrompt) {
    return null;
  }

  return (
    <div className="px-2 py-2">
      <div 
        className="flex items-center justify-center px-4 py-3 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 transition-colors cursor-pointer"
        onClick={handleInstall}
      >
        <Download className="mr-3 h-5 w-5 rtl:ml-3 rtl:mr-0" />
        <span className="font-medium">{t('pwa.installApp')}</span>
      </div>
    </div>
  );
}