import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

// Cache Buster Component - Forces app updates and clears all caches
export function CacheBuster() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Check for Service Worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                setUpdateAvailable(true);
              }
            });
          }
        });

        // Check for waiting service worker
        if (registration.waiting) {
          setUpdateAvailable(true);
        }
      });

      // Listen for messages from Service Worker
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'NEW_VERSION_AVAILABLE') {
          setUpdateAvailable(true);
        }
      });
    }

    // Force cache check on mount
    checkForUpdates();

    // Check for updates every 30 seconds
    const interval = setInterval(checkForUpdates, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const checkForUpdates = async () => {
    try {
      // Check if there's a new version by comparing app hash
      const response = await fetch('/api/version?' + Date.now());
      const data = await response.json();
      
      // Check app hash for file changes
      const lastAppHash = localStorage.getItem('app_hash');
      const currentAppHash = data.appHash;
      
      console.log('🔍 [CacheBuster] Checking for updates:', {
        lastAppHash,
        currentAppHash,
        buildTime: data.buildTime
      });
      
      if (lastAppHash && lastAppHash !== currentAppHash) {
        console.log('🆕 [CacheBuster] New version detected!');
        setUpdateAvailable(true);
      }
      
      // Store current hash
      localStorage.setItem('app_hash', currentAppHash);
      localStorage.setItem('app_version', data.version);
      localStorage.setItem('build_time', data.buildTime);
    } catch (error) {
      console.log('Version check failed:', error);
    }
  };

  const forceUpdate = async () => {
    setIsUpdating(true);
    
    try {
      // 1. Clear all browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log('Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }

      // 2. Unregister Service Worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => {
            console.log('Unregistering SW:', registration);
            return registration.unregister();
          })
        );
      }

      // 3. Clear localStorage and sessionStorage
      localStorage.clear();
      sessionStorage.clear();

      // 4. Force reload with cache bypass
      window.location.reload();
      
    } catch (error) {
      console.error('Update failed:', error);
      setIsUpdating(false);
      
      // Fallback: simple reload
      window.location.href = window.location.href + '?bust=' + Date.now();
    }
  };

  const skipUpdate = () => {
    setUpdateAvailable(false);
    localStorage.setItem('update_skipped', Date.now().toString());
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white p-3 shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">
            Доступно обновление приложения
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={skipUpdate}
            className="text-white hover:bg-orange-600"
          >
            Позже
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={forceUpdate}
            disabled={isUpdating}
            className="bg-white text-orange-500 hover:bg-gray-100"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                Обновление...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                Обновить
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Admin component for forcing cache clear
export function AdminCacheBuster() {
  const [isClearing, setIsClearing] = useState(false);

  const clearAllCaches = async () => {
    setIsClearing(true);
    
    try {
      // Clear browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Update Service Worker cache version
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        registration.postMessage({ type: 'FORCE_UPDATE' });
      }

      alert('Кеш очищен! Приложение будет перезагружено.');
      window.location.reload();
      
    } catch (error) {
      console.error('Cache clear failed:', error);
      alert('Ошибка очистки кеша: ' + error.message);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={clearAllCaches}
      disabled={isClearing}
      className="border-red-300 text-red-600 hover:bg-red-50"
    >
      {isClearing ? (
        <>
          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
          Очистка...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4 mr-1" />
          Очистить кеш
        </>
      )}
    </Button>
  );
}