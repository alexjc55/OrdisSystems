import { useState, useEffect } from 'react';

interface PWAState {
  isInstalled: boolean;
  isInstallable: boolean;
  isStandalone: boolean;
  isOnline: boolean;
  deferredPrompt: any;
}

export function usePWA() {
  const [pwaState, setPwaState] = useState<PWAState>({
    isInstalled: false,
    isInstallable: false,
    isStandalone: false,
    isOnline: navigator.onLine,
    deferredPrompt: null
  });

  useEffect(() => {
    // Check if app is running in standalone mode
    const checkStandalone = () => {
      return window.matchMedia('(display-mode: standalone)').matches ||
             (window.navigator as any).standalone ||
             document.referrer.includes('android-app://');
    };

    // Update initial state
    setPwaState(prev => ({
      ...prev,
      isStandalone: checkStandalone(),
      isInstalled: checkStandalone()
    }));

    // Register Service Worker
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          });
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New update available - handled by CacheBuster component
                }
              });
            }
          });
          
        } catch (error) {
          // Service Worker registration failed - continue without PWA features
        }
      }
    };

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setPwaState(prev => ({
        ...prev,
        isInstallable: true,
        deferredPrompt: e
      }));
    };

    // Handle app installed
    const handleAppInstalled = () => {
      setPwaState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        deferredPrompt: null
      }));
    };

    // Handle online/offline status
    const handleOnline = () => {
      setPwaState(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setPwaState(prev => ({ ...prev, isOnline: false }));
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register service worker
    registerServiceWorker();

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const installApp = async () => {
    if (!pwaState.deferredPrompt) return false;

    try {
      await pwaState.deferredPrompt.prompt();
      const choiceResult = await pwaState.deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setPwaState(prev => ({
          ...prev,
          isInstallable: false,
          deferredPrompt: null
        }));
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  };

  const updateApp = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        window.location.reload();
      }
    }
  };

  return {
    ...pwaState,
    installApp,
    updateApp
  };
}