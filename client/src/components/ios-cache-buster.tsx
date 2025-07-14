import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, Smartphone } from 'lucide-react';
import { useCommonTranslation } from '@/hooks/use-language';

// iOS-specific cache buster for aggressive cache clearing
export function IOSCacheBuster() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  // Safe translation hook with error handling
  let t: (key: string) => string;
  try {
    const { t: translationFunc } = useCommonTranslation();
    t = translationFunc;
  } catch (error) {
    t = (key: string) => {
      const fallbackTexts: Record<string, string> = {
        'updatePanel.available': 'Доступно обновление приложения',
        'updatePanel.iosIssue': 'На iPhone кеш может сохраняться дольше',
        'updatePanel.forceClear': 'Принудительно очистить кеш',
        'updatePanel.later': 'Позже',
        'updatePanel.update': 'Обновить',
        'updatePanel.updating': 'Обновление...'
      };
      return fallbackTexts[key] || key;
    };
  }

  useEffect(() => {
    // Detect iOS device
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                       (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    // More aggressive update checking for iOS
    const checkForUpdates = async () => {
      try {
        // Add random parameter to bypass any caching
        const response = await fetch('/api/version?' + Math.random() + '&t=' + Date.now(), {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        const data = await response.json();
        
        const currentVersion = localStorage.getItem('app-version') || '0';
        const currentHash = localStorage.getItem('app-hash') || '0';
        
        // Проверяем последнее обновление
        const lastUpdate = localStorage.getItem('last_update');
        const recentlyUpdated = lastUpdate && (Date.now() - parseInt(lastUpdate)) < 300000; // 5 минут
        
        // Проверяем последний обработанный хеш
        const lastProcessedHash = localStorage.getItem('last_processed_hash');
        const alreadyProcessed = lastProcessedHash === data.appHash;
        
        if ((data.version !== currentVersion || data.appHash !== currentHash) && 
            !recentlyUpdated && !alreadyProcessed) {
          setUpdateAvailable(true);
        } else if (updateAvailable && (recentlyUpdated || alreadyProcessed)) {
          // Скрываем уведомление если оно уже было обработано
          setUpdateAvailable(false);
        }
      } catch (error) {
        // If API fails, assume update might be available
        if (isIOSDevice) {
          setUpdateAvailable(true);
        }
      }
    };

    if (isIOSDevice) {
      // Check more frequently on iOS (every 10 seconds)
      const interval = setInterval(checkForUpdates, 10000);
      checkForUpdates();
      
      return () => clearInterval(interval);
    }
  }, [isIOS]);

  const performIOSCacheClear = async () => {
    setIsUpdating(true);
    
    try {
      // Получаем текущий хеш и сохраняем состояние обновления
      const response = await fetch('/api/version?' + Date.now());
      const data = await response.json();
      const currentAppHash = data.appHash;
      
      // Сохраняем информацию об обновлении ПЕРЕД очисткой
      localStorage.setItem('last_update', Date.now().toString());
      localStorage.setItem('last_processed_hash', currentAppHash);
      localStorage.setItem('app-version', data.version);
      localStorage.setItem('app-hash', currentAppHash);
      
      // Скрываем уведомление сразу
      setUpdateAvailable(false);
      
      // 1. Clear all browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      // 2. Clear local storage (after saving current state)
      const tempUpdate = localStorage.getItem('last_update');
      const tempHash = localStorage.getItem('last_processed_hash');
      const tempVersion = localStorage.getItem('app-version');
      const tempAppHash = localStorage.getItem('app-hash');
      
      localStorage.clear();
      sessionStorage.clear();
      
      // Restore update state
      if (tempUpdate) localStorage.setItem('last_update', tempUpdate);
      if (tempHash) localStorage.setItem('last_processed_hash', tempHash);
      if (tempVersion) localStorage.setItem('app-version', tempVersion);
      if (tempAppHash) localStorage.setItem('app-hash', tempAppHash);

      // 3. Clear IndexedDB
      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases();
          await Promise.all(
            databases.map(db => {
              if (db.name) {
                const deleteReq = indexedDB.deleteDatabase(db.name);
                return new Promise((resolve, reject) => {
                  deleteReq.onsuccess = () => resolve(void 0);
                  deleteReq.onerror = () => reject(deleteReq.error);
                });
              }
            })
          );
        } catch (error) {
          // IndexedDB operations might fail on some iOS versions
        }
      }

      // 4. Unregister service worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => registration.unregister())
        );
      }

      // 5. Force reload with cache bypass
      window.location.reload();
      
    } catch (error) {
      // Fallback: just reload
      window.location.reload();
    }
  };

  const handleUpdate = async () => {
    if (isIOS) {
      await performIOSCacheClear();
    } else {
      // Standard update process
      setIsUpdating(true);
      
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  // Only show on iOS or when update is available
  if (!updateAvailable && !isIOS) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 bg-orange-500 text-white p-4 rounded-lg shadow-lg">
      <div className="flex items-center gap-3">
        {isIOS ? <Smartphone className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
        <div className="flex-1">
          <p className="font-medium">
            {isIOS ? t('updatePanel.iosIssue') : t('updatePanel.available')}
          </p>
          {isIOS && (
            <p className="text-sm opacity-90 mt-1">
              Для получения последней версии нажмите "Принудительно очистить кеш"
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUpdateAvailable(false)}
            className="border-white/20 text-white hover:bg-white/10"
          >
            {t('updatePanel.later')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpdate}
            disabled={isUpdating}
            className="border-white/20 text-white hover:bg-white/10"
          >
            {isUpdating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              isIOS ? t('updatePanel.forceClear') : t('updatePanel.update')
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}