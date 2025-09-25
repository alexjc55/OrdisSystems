import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useCommonTranslation, useAdminTranslation } from '@/hooks/use-language';

// Cache Buster Component - Forces app updates and clears all caches with proper state management (FINAL SW-INDEPENDENT VERSION)
export function CacheBuster() {
  const [initialLoad, setInitialLoad] = useState(true);
  
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
    // Трекинг активности пользователя для паузы автообновлений
    const trackUserActivity = () => {
      localStorage.setItem('last_user_activity', Date.now().toString());
    };
    
    // События активности пользователя
    const events = ['click', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, trackUserActivity, { passive: true });
    });

    // Check for Service Worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // SW detected new version, but don't auto-show - let checkForUpdates handle it
                console.log('📦 [CacheBuster] SW updatefound detected, using own logic');
              }
            });
          }
        });

        // Check for waiting service worker - but don't auto-show
        if (registration.waiting) {
          console.log('📦 [CacheBuster] SW waiting detected, using own logic');
        }
      });

      // Listen for messages from Service Worker
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'NEW_VERSION_AVAILABLE') {
          // НЕ показываем уведомление автоматически от SW - дадим checkForUpdates самому решать
          console.log('📦 [CacheBuster] SW notified about new version, but using own logic');
        }
      });
    }

    // Force cache check on mount
    checkForUpdates();

    // Check for updates every 30 seconds
    const interval = setInterval(checkForUpdates, 30000);
    
    return () => {
      clearInterval(interval);
      // Очистка обработчиков событий
      events.forEach(event => {
        document.removeEventListener(event, trackUserActivity);
      });
    };
  }, []);

  // Автоматическое обновление без уведомлений
  const performAutoUpdate = (currentAppHash: string, data: any) => {
    console.log('🤖 [CacheBuster] Performing automatic update silently...');
    
    try {
      // Сохраняем информацию об обновлении
      const timestamp = Date.now().toString();
      localStorage.setItem('last_update', timestamp);
      localStorage.setItem('last_processed_hash', currentAppHash);
      localStorage.setItem('app_hash', currentAppHash);
      localStorage.setItem('app_version', data.version);
      localStorage.setItem('build_time', data.buildTime);
      
      // Помечаем как навсегда обработанный
      const processedHashes = JSON.parse(localStorage.getItem('processed_hashes') || '[]');
      if (!processedHashes.includes(currentAppHash)) {
        processedHashes.push(currentAppHash);
        localStorage.setItem('processed_hashes', JSON.stringify(processedHashes));
      }
      
      console.log('✅ [CacheBuster] Auto-update completed, reloading page...');
      
      // Небольшая задержка для завершения логирования, затем перезагрузка
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error) {
      console.error('❌ [CacheBuster] Auto-update failed:', error);
      // При ошибке все равно перезагружаем
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  const checkForUpdates = async () => {
    try {
      // ПАУЗА АВТООБНОВЛЕНИЙ: если пользователь на странице админки и печатает/кликает
      const isOnAdminPage = window.location.pathname.includes('/admin');
      const lastUserActivity = localStorage.getItem('last_user_activity');
      const recentActivity = lastUserActivity && (Date.now() - parseInt(lastUserActivity)) < 60000; // 1 минута
      
      if (isOnAdminPage && recentActivity) {
        console.log('⏸️ [CacheBuster] Паузa автообновлений - пользователь активен в админке');
        return;
      }

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
      let alreadyProcessed = lastProcessedHash === currentAppHash;
      
      // НОВАЯ ЛОГИКА: проверяем навсегда обработанные хеши
      try {
        const processedHashes = JSON.parse(localStorage.getItem('processed_hashes') || '[]');
        if (processedHashes.includes(currentAppHash)) {
          alreadyProcessed = true;
          console.log('🚫 [CacheBuster] Hash permanently processed, skipping notification');
        }
      } catch (e) {
        // Ignore parsing errors
      }
      
      // Детальное логирование для отладки
      console.log('🔍 [CacheBuster] Debug info:', {
        lastAppHash,
        currentAppHash,
        hashesChanged: lastAppHash !== currentAppHash,
        recentlyUpdated,
        skippedRecently,
        alreadyProcessed,
        lastUpdate: lastUpdate ? new Date(parseInt(lastUpdate)).toLocaleTimeString() : 'none',
        updateSkipped: updateSkipped ? new Date(parseInt(updateSkipped)).toLocaleTimeString() : 'none',
        localStorage_currentSessionHash: localStorage.getItem('currentSessionHash'),
        isTestHash: currentAppHash.startsWith('test_'),
        timestamp: new Date().toLocaleTimeString()
      });
      
      // АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ: если хеш изменился, обновляем автоматически без уведомлений
      const hashChanged = lastAppHash && lastAppHash !== currentAppHash;
      const shouldAutoUpdate = hashChanged && !recentlyUpdated && !alreadyProcessed;
      
      // ЗАЩИТА ОТ ЗАЦИКЛИВАНИЯ: не обновляем если находимся на странице загрузки админ-панели
      const isOnAdminLoadingPage = window.location.pathname.includes('/admin') && 
                                   (document.body.textContent?.includes('Загрузка админ панели') || 
                                    document.body.textContent?.includes('Подготовка данных для работы'));
      
      if (shouldAutoUpdate && !isOnAdminLoadingPage) {
        console.log('🔄 [CacheBuster] New version detected! Auto-updating...');
        console.log(`🔄 [CacheBuster] Hash changed: ${lastAppHash} → ${currentAppHash}`);
        performAutoUpdate(currentAppHash, data);
      } else if (shouldAutoUpdate && isOnAdminLoadingPage) {
        console.log('🛡️ [CacheBuster] Auto-update blocked - admin panel is loading');
      }
      
      // Store current hash
      localStorage.setItem('app_hash', currentAppHash);
      localStorage.setItem('app_version', data.version);
      localStorage.setItem('build_time', data.buildTime);
    } catch (error) {
      console.log('Version check failed:', error);
    }
  };

  // Функции ручного обновления больше не нужны - все происходит автоматически

  // Больше нет UI - все обновления происходят автоматически
  return null;
}

// Admin component for forcing cache clear
export function AdminCacheBuster() {
  const [isClearing, setIsClearing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { t: adminT } = useAdminTranslation();

  const testAutoUpdate = async () => {
    setIsTesting(true);
    
    try {
      // Очищаем кеш обработанных хешей для чистого теста
      localStorage.removeItem('processed_hashes');
      localStorage.removeItem('last_processed_hash');
      localStorage.removeItem('last_update');
      localStorage.removeItem('update_skipped');
      
      // Генерируем новый тестовый хеш
      const response = await fetch('/api/version?test=notification');
      const data = await response.json();
      
      console.log(`🧪 Тест автоматического обновления запущен! Новый хеш: ${data.appHash}`);
      
    } catch (error) {
      console.error('Test auto-update failed:', error);
      alert('Ошибка запуска теста: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    } finally {
      setIsTesting(false);
    }
  };

  const clearAllCaches = async () => {
    setIsClearing(true);
    
    try {
      console.log('🧹 [AdminCacheBuster] Starting aggressive cache clearing...');
      
      // 1. Очистка всех браузерных кешей
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log('🗑️ [AdminCacheBuster] Clearing caches:', cacheNames);
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // 2. Агрессивная очистка Service Worker для PWA
      if ('serviceWorker' in navigator) {
        try {
          // Уведомляем SW о принудительном обновлении
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration && registration.active) {
            registration.active.postMessage({ type: 'FORCE_UPDATE' });
          }
          
          // Отключаем все Service Workers (особенно важно для PWA на мобильных)
          const registrations = await navigator.serviceWorker.getRegistrations();
          console.log('🔌 [AdminCacheBuster] Unregistering', registrations.length, 'service workers');
          await Promise.all(registrations.map(reg => reg.unregister()));
        } catch (swError) {
          console.warn('Service Worker cleanup failed:', swError);
        }
      }

      // 3. Полная очистка всех хранилищ
      console.log('🗑️ [AdminCacheBuster] Clearing all storage...');
      
      // Очищаем localStorage полностью
      localStorage.clear();
      sessionStorage.clear();
      
      // 4. Очистка IndexedDB (особенно важно для PWA)
      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases?.() || [];
          console.log('🗂️ [AdminCacheBuster] Clearing', databases.length, 'IndexedDB databases');
          await Promise.all(
            databases.map(db => {
              if (db.name) {
                return new Promise<void>((resolve, reject) => {
                  const deleteReq = indexedDB.deleteDatabase(db.name!);
                  deleteReq.onsuccess = () => resolve();
                  deleteReq.onerror = () => reject(deleteReq.error);
                  deleteReq.onblocked = () => {
                    console.warn('IndexedDB deletion blocked for:', db.name);
                    resolve(); // Don't fail the entire process
                  };
                });
              }
            })
          );
        } catch (idbError) {
          console.warn('IndexedDB cleanup failed:', idbError);
        }
      }

      // 5. Мобильная/PWA специфичная очистка
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isPWA = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      
      if (isMobile || isPWA) {
        console.log('📱 [AdminCacheBuster] Mobile/PWA detected - using aggressive reload');
        
        // Принудительная перезагрузка с обходом всех кешей
        setTimeout(() => {
          window.location.replace(window.location.href + '?cache_bust=' + Date.now() + '&mobile_clear=1');
        }, 1000);
      } else {
        console.log('💻 [AdminCacheBuster] Desktop detected - using hard reload');
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }

      alert('✅ Кеш полностью очищен!\n📱 Для мобильных устройств: используйте агрессивную перезагрузку\n💻 Для десктопа: обычная перезагрузка\n\nПриложение будет перезагружено...');
      
    } catch (error) {
      console.error('❌ [AdminCacheBuster] Cache clear failed:', error);
      alert('⚠️ Ошибка очистки кеша: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка') + '\n\nПопробуйте принудительную перезагрузку (Ctrl+Shift+R)');
      
      // Fallback: простая перезагрузка даже при ошибке
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={testAutoUpdate}
        disabled={isTesting}
        className="border-blue-300 text-blue-600 hover:bg-blue-50"
      >
        {isTesting ? (
          <>
            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
            {adminT('actions.loading')}...
          </>
        ) : (
          <>
            🧪 {adminT('settings.testAutoUpdate')}
          </>
        )}
      </Button>
      
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
            {adminT('actions.loading')}...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-1" />
            {adminT('settings.clearCache')}
          </>
        )}
      </Button>
    </div>
  );
}