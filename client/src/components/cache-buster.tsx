import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useCommonTranslation } from '@/hooks/use-language';

// Cache Buster Component - Forces app updates and clears all caches with proper state management (test update trigger v2)
export function CacheBuster() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [currentSessionHash, setCurrentSessionHash] = useState<string | null>(null);
  
  // Safe translation hook with error handling
  let t: (key: string) => string;
  try {
    const { t: translationFunc } = useCommonTranslation();
    t = translationFunc;
  } catch (error) {
    console.error('Translation hook error:', error);
    // Fallback translation function
    t = (key: string) => {
      const fallbackTexts: Record<string, string> = {
        'updatePanel.available': 'Доступно обновление приложения',
        'updatePanel.later': 'Позже',
        'updatePanel.update': 'Обновить',
        'updatePanel.updating': 'Обновление...'
      };
      return fallbackTexts[key] || key;
    };
  }

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
      const response = await fetch('/api/version?' + Date.now(), {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      
      // Check app hash for file changes
      const lastAppHash = localStorage.getItem('app_hash');
      const currentAppHash = data.appHash;
      
      // При первой загрузке просто сохраняем хеш, не показываем уведомление
      if (initialLoad) {
        setInitialLoad(false);
        if (!lastAppHash) {
          localStorage.setItem('app_hash', currentAppHash);
          localStorage.setItem('app_version', data.version);
          localStorage.setItem('build_time', data.buildTime);
        }
        return;
      }
      
      // Проверяем недавнее обновление
      const lastUpdate = localStorage.getItem('last_update');
      const recentlyUpdated = lastUpdate && (Date.now() - parseInt(lastUpdate)) < 300000; // 5 минут
      
      // Проверяем, было ли уведомление пропущено для этого хеша
      const updateSkipped = localStorage.getItem('update_skipped');
      const skippedRecently = updateSkipped && (Date.now() - parseInt(updateSkipped)) < 600000; // 10 минут
      
      // Проверяем последний обработанный хеш
      const lastProcessedHash = localStorage.getItem('last_processed_hash');
      const alreadyProcessed = lastProcessedHash === currentAppHash;
      
      // Детальное логирование для отладки
      console.log('🔍 [CacheBuster] Debug info:', {
        lastAppHash,
        currentAppHash,
        hashesChanged: lastAppHash !== currentAppHash,
        recentlyUpdated,
        skippedRecently,
        alreadyProcessed,
        updateAvailable,
        lastUpdate: lastUpdate ? new Date(parseInt(lastUpdate)).toLocaleTimeString() : 'none',
        updateSkipped: updateSkipped ? new Date(parseInt(updateSkipped)).toLocaleTimeString() : 'none'
      });
      
      // ОСНОВНАЯ ЛОГИКА: строгая проверка состояния
      const shouldShowNotification = lastAppHash && 
                                   lastAppHash !== currentAppHash && 
                                   !recentlyUpdated && 
                                   !skippedRecently && 
                                   !alreadyProcessed &&
                                   currentSessionHash !== currentAppHash;

      const shouldHideNotification = updateAvailable && 
                                   (recentlyUpdated || skippedRecently || alreadyProcessed || currentSessionHash === currentAppHash);
      
      if (shouldShowNotification) {
        console.log('🆕 [CacheBuster] New version detected! Showing notification');
        setUpdateAvailable(true);
        setCurrentSessionHash(currentAppHash); // Запоминаем хеш этой сессии
      } else if (shouldHideNotification) {
        console.log('🚫 [CacheBuster] Hiding notification - already processed/skipped/updated');
        setUpdateAvailable(false);
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
      // Получаем текущий хеш перед очисткой
      const response = await fetch('/api/version?' + Date.now());
      const data = await response.json();
      const currentAppHash = data.appHash;
      
      // Сохраняем информацию об обновлении ПЕРЕД очисткой
      localStorage.setItem('last_update', Date.now().toString());
      localStorage.setItem('last_processed_hash', currentAppHash);
      localStorage.setItem('app_hash', currentAppHash);
      localStorage.setItem('app_version', data.version);
      localStorage.setItem('build_time', data.buildTime);
      
      // Скрываем уведомление сразу после начала обновления
      setUpdateAvailable(false);
      
      // 1. Clear all browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
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

      // 3. Clear localStorage and sessionStorage but preserve important data
      const preserveData = {
        last_update: localStorage.getItem('last_update'),
        last_processed_hash: localStorage.getItem('last_processed_hash'),
        app_hash: localStorage.getItem('app_hash'),
        app_version: localStorage.getItem('app_version'),
        build_time: localStorage.getItem('build_time')
      };
      
      localStorage.clear();
      sessionStorage.clear();
      
      // Восстанавливаем важные данные
      Object.entries(preserveData).forEach(([key, value]) => {
        if (value) {
          localStorage.setItem(key, value);
        }
      });

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
    // Помечаем что пользователь пропустил обновление
    localStorage.setItem('update_skipped', Date.now().toString());
    // Помечаем текущий хеш как обработанный
    const currentAppHash = localStorage.getItem('app_hash');
    if (currentAppHash) {
      localStorage.setItem('last_processed_hash', currentAppHash);
      setCurrentSessionHash(currentAppHash); // Запоминаем в состоянии компонента
    }
    console.log('⏭️ [CacheBuster] User skipped update');
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
            {t('updatePanel.available')}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={skipUpdate}
            className="text-white hover:bg-orange-600"
          >
            {t('updatePanel.later')}
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
                {t('updatePanel.updating')}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                {t('updatePanel.update')}
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
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration && registration.active) {
            // Check if postMessage method exists on active worker
            if (typeof registration.active.postMessage === 'function') {
              registration.active.postMessage({ type: 'FORCE_UPDATE' });
            }
          }
        } catch (swError) {
          console.warn('Service Worker message failed:', swError);
          // Continue with cache clearing even if SW fails
        }
      }

      // Clear localStorage related to cache
      localStorage.removeItem('app_hash');
      localStorage.removeItem('app_version');
      localStorage.removeItem('build_time');
      localStorage.removeItem('last_update');
      localStorage.removeItem('update_skipped');

      alert('Кеш очищен! Приложение будет перезагружено.');
      window.location.reload();
      
    } catch (error) {
      console.error('Cache clear failed:', error);
      alert('Ошибка очистки кеша: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
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