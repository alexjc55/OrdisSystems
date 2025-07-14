import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, Smartphone } from 'lucide-react';
import { useCommonTranslation } from '@/hooks/use-language';

// iOS-specific cache buster for aggressive cache clearing
export function IOSCacheBuster() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [currentSessionHash, setCurrentSessionHash] = useState<string | null>(null);
  
  // Safe translation hook with error handling
  let t: (key: string) => string;
  try {
    const { t: translationFunc } = useCommonTranslation();
    t = translationFunc;
  } catch (error) {
    t = (key: string) => {
      const fallbackTexts: Record<string, string> = {
        'updatePanel.available': 'Доступно обновление приложения',
        'iosIssue': 'Доступна новая версия приложения',
        'iosUpdateMessage': 'Для получения обновлений нажмите "Обновить приложение"',
        'forceClear': 'Обновить приложение',
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
        
        const shouldShowNotification = (data.version !== currentVersion || data.appHash !== currentHash) && 
                                       !recentlyUpdated && 
                                       !alreadyProcessed &&
                                       currentSessionHash !== data.appHash;

        const shouldHideNotification = updateAvailable && 
                                     (recentlyUpdated || alreadyProcessed || currentSessionHash === data.appHash);
        
        if (shouldShowNotification) {
          setUpdateAvailable(true);
          setCurrentSessionHash(data.appHash);
        } else if (shouldHideNotification) {
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
    try {
      // Сразу скрываем уведомление
      setUpdateAvailable(false);
      setIsUpdating(true);
      
      // Получаем текущий хеш и сохраняем состояние обновления
      const response = await fetch('/api/version?' + Date.now());
      const data = await response.json();
      const currentAppHash = data.appHash;
      
      // Сохраняем информацию об обновлении ПЕРЕД очисткой
      localStorage.setItem('last_update', Date.now().toString());
      localStorage.setItem('last_processed_hash', currentAppHash);
      localStorage.setItem('app-version', data.version);
      localStorage.setItem('app-hash', currentAppHash);
      setCurrentSessionHash(currentAppHash);
      
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

      // 5. iOS-specific: более агрессивная перезагрузка для преодоления кеша
      if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
        // Для iOS: полная замена URL с timestamp и форсированная перезагрузка
        const newUrl = window.location.href.split('?')[0] + '?ios_cache_bust=' + Date.now() + '&v=' + currentAppHash;
        window.location.replace(newUrl);
      } else {
        // Стандартная перезагрузка для других устройств
        window.location.reload();
      }
      
    } catch (error) {
      // Fallback: агрессивная перезагрузка для iOS
      if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
        const newUrl = window.location.href.split('?')[0] + '?fallback_cache_bust=' + Date.now();
        window.location.replace(newUrl);
      } else {
        window.location.reload();
      }
    }
  };

  const handleUpdate = async () => {
    // Hide notification immediately
    setUpdateAvailable(false);
    setIsUpdating(true);
    
    // Save current session hash to prevent notification reappearance
    if (currentAppHash) {
      localStorage.setItem('currentSessionHash', currentAppHash);
    }
    
    // Small delay to let UI update
    setTimeout(async () => {
      if (isIOS) {
        await performIOSCacheClear();
      } else {
        // Standard update process
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
        
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    }, 200);
  };

  // Only show on iOS or when update is available
  if (!updateAvailable && !isIOS) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white shadow-lg">
      <div className="p-3 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            {isIOS ? <Smartphone className="h-4 w-4 flex-shrink-0" /> : <AlertTriangle className="h-4 w-4 flex-shrink-0" />}
            <div>
              <span className="text-sm font-medium leading-tight">
                {isIOS ? t('iosIssue') : t('updatePanel.available')}
              </span>
              {isIOS && (
                <div className="text-xs opacity-90 leading-tight mt-1">
                  {t('iosUpdateMessage')}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUpdateAvailable(false)}
              className="text-white hover:bg-red-600 text-xs px-3 py-1 h-7"
            >
              {t('updatePanel.later')}
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={handleUpdate}
              disabled={isUpdating}
              className="bg-white text-red-500 hover:bg-gray-100 text-xs px-3 py-1 h-7"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  {t('updatePanel.updating')}
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {isIOS ? t('forceClear') : t('updatePanel.update')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}