// Clear PWA cache script
async function clearPWACache() {
  if ('serviceWorker' in navigator) {
    try {
      // Unregister all service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
      
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      }
      
      console.log('All PWA caches cleared and service workers unregistered');
      alert('Кеш PWA очищен. Перезагрузите страницу для применения изменений.');
      
      // Force reload
      window.location.reload(true);
    } catch (error) {
      console.error('Error clearing PWA cache:', error);
      alert('Ошибка при очистке кеша. Попробуйте очистить кеш браузера вручную.');
    }
  } else {
    alert('Service Worker не поддерживается в вашем браузере.');
  }
}

// Run automatically when script is loaded
clearPWACache();