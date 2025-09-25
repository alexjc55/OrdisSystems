import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, Smartphone } from 'lucide-react';
import { useCommonTranslation } from '@/hooks/use-language';

// iOS-specific cache buster for aggressive cache clearing
export function IOSCacheBuster() {
  const [isIOS, setIsIOS] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentSessionHash, setCurrentSessionHash] = useState('');
  
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

  // Автоматическое обновление для iOS устройств
  const performIOSAutoUpdate = async (data: any) => {
    console.log('🍎 [iOS-CacheBuster] Starting aggressive iOS cache clearing...');
    
    try {
      // Сохраняем информацию об обновлении
      const timestamp = Date.now().toString();
      localStorage.setItem('last_update', timestamp);
      localStorage.setItem('last_processed_hash', data.appHash);
      localStorage.setItem('app-hash', data.appHash);
      localStorage.setItem('app-version', data.version);
      localStorage.setItem('build_time', data.buildTime);
      
      // Помечаем как навсегда обработанный
      const processedHashes = JSON.parse(localStorage.getItem('processed_hashes') || '[]');
      if (!processedHashes.includes(data.appHash)) {
        processedHashes.push(data.appHash);
        localStorage.setItem('processed_hashes', JSON.stringify(processedHashes));
      }

      // iOS-специфичная очистка кеша
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        } catch (e) {
          console.log('SW cleanup failed:', e);
        }
      }

      // Очистка всех кешей
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Очистка всех хранилищ
      sessionStorage.clear();
      
      console.log('✅ [iOS-CacheBuster] Auto-update completed, reloading...');
      
      // Агрессивная перезагрузка для iOS
      setTimeout(() => {
        window.location.replace(window.location.href + '?_t=' + Date.now());
      }, 500);
      
    } catch (error) {
      console.error('❌ [iOS-CacheBuster] Auto-update failed:', error);
      // При ошибке все равно перезагружаем
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

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
        
        // АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ для iOS: если версия/хеш изменились, обновляем автоматически
        const shouldAutoUpdate = (data.version !== currentVersion || data.appHash !== currentHash) && 
                                 !recentlyUpdated && 
                                 !alreadyProcessed;
        
        if (shouldAutoUpdate) {
          console.log('🍎 [iOS-CacheBuster] New version detected! Auto-updating iOS device...');
          console.log(`🍎 [iOS-CacheBuster] Version changed: ${currentVersion} → ${data.version}, Hash: ${currentHash} → ${data.appHash}`);
          performIOSAutoUpdate(data);
        }
      } catch (error) {
        console.log('🍎 [iOS-CacheBuster] Version check failed:', error);
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

      // 5. iOS-specific: УЛЬТРА агрессивная перезагрузка для преодоления белого экрана
      if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
        console.log('🍎 [iOS-CacheBuster] Applying ULTRA aggressive iOS reload strategy...');
        
        // Множественные попытки очистки для борьбы с белым экраном
        const currentHash = Date.now().toString();
        
        try {
          // 1. Попытка через history API
          if (window.history && typeof window.history.replaceState === 'function') {
            const newUrl = window.location.href.split('?')[0] + '?ios_cache_bust=' + currentHash + '&v=' + currentHash + '&reload=' + Math.random();
            window.history.replaceState(null, '', newUrl);
          }
          
          // 2. Принудительная очистка мета-тегов кеширования в DOM
          const metaTags = document.querySelectorAll('meta[http-equiv*="cache"], meta[name*="cache"]');
          metaTags.forEach(tag => tag.remove());
          
          // 3. Добавляем агрессивные мета-теги против кеширования
          const head = document.head;
          const noCacheMetas = [
            { 'http-equiv': 'Cache-Control', content: 'no-cache, no-store, must-revalidate, max-age=0' },
            { 'http-equiv': 'Pragma', content: 'no-cache' },
            { 'http-equiv': 'Expires', content: '0' },
            { name: 'cache-control', content: 'no-cache' }
          ];
          
          noCacheMetas.forEach(attrs => {
            const meta = document.createElement('meta');
            Object.entries(attrs).forEach(([key, value]) => meta.setAttribute(key, value));
            head.appendChild(meta);
          });
          
          // 4. Ультра агрессивная перезагрузка с полной заменой URL
          setTimeout(() => {
            const ultraUrl = window.location.href.split('?')[0] + '?ios_force_reload=' + currentHash + '&t=' + Date.now() + '&cache_bust=1';
            console.log('🍎 [iOS-CacheBuster] Force replacing URL:', ultraUrl);
            window.location.replace(ultraUrl);
          }, 100);
          
        } catch (error) {
          console.error('🍎 [iOS-CacheBuster] Ultra reload failed, using fallback:', error);
          // Экстренный fallback для критических случаев
          window.location.href = window.location.href.split('?')[0] + '?emergency_reload=' + Date.now();
        }
        
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
    
    try {
      // Get current app hash
      const response = await fetch('/api/version?' + Date.now());
      const data = await response.json();
      const currentAppHash = data.appHash;
      
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
      
    } catch (error) {
      console.error('Update failed:', error);
      // Fallback: simple reload
      setTimeout(() => {
        window.location.reload();
      }, 200);
    }
  };

  // iOS Cache Buster теперь работает автоматически без UI
  return null;
}