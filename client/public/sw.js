// Dynamic cache names with automatic versioning
const APP_VERSION = '1.0.0';
// Build timestamp is now generated automatically from file changes
const BUILD_TIMESTAMP = '20251124-1312'; // Added controllerchange listener for auto-reload
const CACHE_NAME = `edahouse-v${APP_VERSION}-${BUILD_TIMESTAMP}`;
const STATIC_CACHE = `edahouse-static-v${APP_VERSION}-${BUILD_TIMESTAMP}`;
const DYNAMIC_CACHE = `edahouse-dynamic-v${APP_VERSION}-${BUILD_TIMESTAMP}`;

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints to cache with TTL
const API_CACHE_PATTERNS = [
  '/api/settings',
  '/api/categories',
  '/api/products'
];

// iOS-specific cache management
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

// More aggressive cache invalidation for iOS
const API_CACHE_TTL = isIOS ? 2 * 60 * 1000 : 5 * 60 * 1000; // 2 min for iOS, 5 min for others

// Install event - clean up old caches with iOS-specific handling
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old caches that don't match current version
          if (cacheName.startsWith('edahouse-') && cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Force activation immediately - critical for iOS cache issues
      console.log('🔥 [SW] Force skipping waiting - iOS cache clearing');
      return self.skipWaiting();
    })
  );
});

// Activate event with iOS-specific aggressive cache clearing
self.addEventListener('activate', function(event) {
  event.waitUntil(
    Promise.all([
      // Clean up old caches again - more aggressive for iOS
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.startsWith('edahouse-') && 
                cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately - critical for iOS
      self.clients.claim()
    ]).then(() => {
      // Don't notify clients automatically - let them detect updates themselves
      console.log('✅ [SW] New version available, but not auto-notifying clients');
      // self.clients.matchAll().then(clients => {
      //   clients.forEach(client => {
      //     client.postMessage({
      //       type: 'NEW_VERSION_AVAILABLE',
      //       version: APP_VERSION,
      //       timestamp: BUILD_TIMESTAMP
      //     });
      //   });
      // });
      
      // Check for app updates - but don't notify clients automatically
      return checkForAppUpdates().then(() => {
        console.log('✅ [SW] App updates checked, clients will detect changes themselves');
        // Don't auto-notify - let CacheBuster handle update detection
        // return self.clients.matchAll().then(clients => {
        //   clients.forEach(client => {
        //     client.postMessage({
        //       type: 'NEW_VERSION_AVAILABLE',
        //       version: CACHE_NAME,
        //       timestamp: Date.now()
        //     });
        //   });
        // });
      });
    })
  );
});

// Message handler for forced updates
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'FORCE_UPDATE') {
    console.log('💥 [SW] Force update requested, clearing all caches');
    
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            console.log('🗑️ [SW] Force deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log('✅ [SW] All caches cleared, reloading clients');
        return self.clients.matchAll();
      }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'CACHE_CLEARED' });
        });
      })
    );
  }
});

// Check for app updates by comparing file hashes
async function checkForAppUpdates() {
  try {
    const response = await fetch('/api/version?' + Date.now());
    const data = await response.json();
    
    // Compare with stored hash
    const storedHash = await self.caches.open(DYNAMIC_CACHE).then(cache => {
      return cache.match('/api/version').then(response => {
        if (response) {
          return response.json().then(data => data.appHash);
        }
        return null;
      });
    });
    
    if (storedHash && storedHash !== data.appHash) {
      console.log('🆕 [SW] App update detected, clearing caches');
      
      // Clear all caches
      const cacheNames = await self.caches.keys();
      await Promise.all(cacheNames.map(name => self.caches.delete(name)));
      
      // Don't notify clients automatically - let them check for updates themselves
      console.log('✅ [SW] Cache cleared, clients will detect update on next check');
      // const clients = await self.clients.matchAll();
      // clients.forEach(client => {
      //   client.postMessage({
      //     type: 'NEW_VERSION_AVAILABLE',
      //     version: `v${data.version}-${data.appHash}`,
      //     timestamp: Date.now()
      //   });
      // });
    }
    
    // Store current hash
    const cache = await self.caches.open(DYNAMIC_CACHE);
    await cache.put('/api/version', new Response(JSON.stringify(data)));
    
  } catch (error) {
    console.error('Failed to check for updates:', error);
  }
}

// Push notification event handlers
self.addEventListener('push', function(event) {
  console.log('🔔 [SW] Push event received in Service Worker!', {
    hasData: !!event.data,
    timestamp: new Date().toISOString(),
    isStandalone: self.clients ? 'clients available' : 'no clients'
  });
  
  if (!event.data) {
    console.log('❌ [SW] No data in push event');
    // Show test notification anyway for debugging
    event.waitUntil(
      self.registration.showNotification('eDAHouse - Debug', {
        body: 'Push событие получено в Service Worker, но без данных',
        icon: '/api/icons/icon-192x192.png',
        badge: '/api/icons/icon-96x96.png',
        tag: 'no-data_' + Date.now(),
        requireInteraction: true,
        actions: [
          {
            action: 'open',
            title: 'Открыть приложение'
          }
        ]
      })
    );
    return;
  }

  try {
    const data = event.data.json();
    console.log('✅ [SW] Push notification data parsed:', JSON.stringify(data, null, 2));

    // Create unique tag to prevent duplicate notifications
    const notificationTag = (data.data?.type || 'default') + '_' + Date.now();
    
    // Enhanced options for PWA mode
    const options = {
      body: data.body,
      icon: data.icon || '/api/icons/icon-192x192.png',
      badge: data.badge || '/api/icons/icon-96x96.png',
      data: data.data || {},
      actions: data.actions?.length > 0 ? data.actions : [
        {
          action: 'open',
          title: 'Открыть',
          icon: '/api/icons/icon-96x96.png'
        },
        {
          action: 'close',
          title: 'Закрыть'
        }
      ],
      tag: notificationTag,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      silent: false,
      renotify: false,
      timestamp: Date.now(),
      // Enhanced for PWA
      image: data.image,
      dir: 'auto',
      lang: 'ru'
    };

    console.log('🔔 [SW] About to show notification with options:', JSON.stringify(options, null, 2));
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
        .then(() => {
          console.log('✅ [SW] Notification shown successfully:', data.title);
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'notification-shown',
                title: data.title,
                body: data.body,
                notificationType: data.data?.type || 'marketing'
              });
            });
          });
        })
        .catch(error => {
          console.error('❌ [SW] Failed to show notification:', error);
          // Broadcast error to main thread
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'notification-error',
                error: error.message
              });
            });
          });
        })
    );
  } catch (error) {
    console.error('❌ [SW] Error processing push notification:', error);
    
    // Fallback notification with unique tag
    event.waitUntil(
      self.registration.showNotification('eDAHouse - Ошибка', {
        body: 'Ошибка обработки уведомления: ' + error.message,
        icon: '/api/icons/icon-192x192.png',
        badge: '/api/icons/icon-96x96.png',
        tag: 'error_' + Date.now(),
        requireInteraction: true
      })
    );
  }
});

// Handle notification clicks - Enhanced for PWA
self.addEventListener('notificationclick', function(event) {
  console.log('🔔 [SW] Notification clicked in PWA:', {
    title: event.notification.title,
    body: event.notification.body,
    action: event.action,
    data: event.notification.data
  });
  
  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;

  // Handle close action
  if (action === 'close') {
    console.log('🔔 [SW] Notification closed by user');
    return;
  }

  let url = '/';

  // Determine URL based on notification type and action
  if (data.type === 'order-status' && data.orderId) {
    url = `/profile?tab=orders&order=${data.orderId}`;
  } else if (data.type === 'cart-reminder') {
    if (action === 'view-cart') {
      url = '/?show-cart=true';
    } else if (action === 'checkout') {
      url = '/checkout';
    } else {
      url = '/';
    }
  } else if (data.type === 'marketing') {
    url = '/';
  } else if (action === 'view-order' && data.orderId) {
    url = `/profile?tab=orders&order=${data.orderId}`;
  }

  const notificationData = {
    type: 'notification-click',
    url: url,
    data: data,
    notification: {
      title: event.notification.title,
      body: event.notification.body,
      type: data.type || 'marketing'
    }
  };

  console.log('📤 Preparing to send message:', notificationData);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      console.log('🔍 Found clients:', clientList.length);
      
      // Try to focus existing window and send message
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          console.log('✅ Focusing existing client and sending message');
          client.focus();
          client.postMessage(notificationData);
          return Promise.resolve();
        }
      }
      
      // Open new window if no existing window found
      console.log('🆕 Opening new window');
      if (clients.openWindow) {
        // Store notification data in localStorage for the new window
        const notificationStorageData = {
          type: 'pending-notification',
          title: event.notification.title,
          body: event.notification.body,
          notificationType: data.type || 'marketing',
          timestamp: Date.now(),
          url: url
        };
        
        // Use IndexedDB or try localStorage fallback
        try {
          // Store in a way that the new window can access
          console.log('💾 Storing notification data for new window:', notificationStorageData);
          
          // Add notification data as URL parameter
          const urlWithNotification = url + (url.includes('?') ? '&' : '?') + 
            'notification=' + encodeURIComponent(JSON.stringify({
              title: event.notification.title,
              body: event.notification.body,
              type: data.type || 'marketing'
            }));
          
          return clients.openWindow(urlWithNotification).then(function(newClient) {
            if (newClient) {
              console.log('✅ New window opened with notification data in URL');
              // Also try sending message with multiple attempts
              let attempts = 0;
              const sendMessage = () => {
                attempts++;
                console.log(`📤 Attempt ${attempts} to send message to new window`);
                try {
                  newClient.postMessage(notificationData);
                  console.log('✅ Message sent successfully');
                } catch (error) {
                  console.log('⚠️ Message send failed, will retry:', error.message);
                  if (attempts < 5) {
                    setTimeout(sendMessage, 500 * attempts);
                  }
                }
              };
              
              // First attempt after 500ms
              setTimeout(sendMessage, 500);
            }
            return newClient;
          });
        } catch (error) {
          console.error('❌ Failed to store notification data:', error);
          return clients.openWindow(url);
        }
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event.notification.data);
  
  // Track notification close events if needed
  const data = event.notification.data || {};
  if (data.type === 'cart-reminder') {
    // Could track cart reminder dismissals
  }
});

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Error caching static assets', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const { url, method } = request;

  // Only handle GET requests
  if (method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.includes('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets and pages
  event.respondWith(handleStaticRequest(request));
});

// Handle API requests with cache-first strategy for safe endpoints
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Cache-first strategy for safe read-only endpoints
  if (API_CACHE_PATTERNS.some(pattern => pathname.includes(pattern))) {
    try {
      const cache = await caches.open(DYNAMIC_CACHE);
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        // Return cached version and update in background
        fetchAndCache(request, cache);
        return cachedResponse;
      }
      
      // No cache, fetch and cache
      const response = await fetch(request);
      if (response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      console.error('Service Worker: API request failed', error);
      // Return cached version if available
      const cache = await caches.open(DYNAMIC_CACHE);
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    }
  }
  
  // For other API requests, use network-first strategy
  try {
    return await fetch(request);
  } catch (error) {
    console.error('Service Worker: Network request failed', error);
    throw error;
  }
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // NEVER cache the thanks page - always fetch from network
    if (pathname === '/thanks' || pathname.startsWith('/thanks?')) {
      console.log('🚫 [SW] Thanks page detected - bypassing cache, fetching from network');
      const response = await fetch(request);
      // Add no-cache headers to the response
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });
    }
    
    // Check static cache first
    const staticCache = await caches.open(STATIC_CACHE);
    const staticCachedResponse = await staticCache.match(request);
    
    if (staticCachedResponse) {
      return staticCachedResponse;
    }
    
    // Check dynamic cache
    const dynamicCache = await caches.open(DYNAMIC_CACHE);
    const dynamicCachedResponse = await dynamicCache.match(request);
    
    if (dynamicCachedResponse) {
      return dynamicCachedResponse;
    }
    
    // Fetch from network and cache (but not for thanks page)
    const response = await fetch(request);
    
    if (response.ok && pathname !== '/thanks' && !pathname.startsWith('/thanks?')) {
      await dynamicCache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('Service Worker: Request failed', error);
    
    // Return fallback for navigation requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(STATIC_CACHE);
      return cache.match('/') || new Response('Офлайн режим - проверьте подключение к интернету', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
    
    throw error;
  }
}

// Background fetch and cache update
async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
  } catch (error) {
    console.error('Service Worker: Background fetch failed', error);
  }
}

// PWA Debug Functions
self.testPWANotification = function() {
  console.log('🧪 [SW] Testing PWA notification from Service Worker');
  
  const testOptions = {
    body: 'Тестовое уведомление из Service Worker для PWA',
    icon: '/api/icons/icon-192x192.png',
    badge: '/api/icons/icon-96x96.png',
    tag: 'pwa-test-' + Date.now(),
    requireInteraction: true,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'Открыть приложение'
      },
      {
        action: 'close',
        title: 'Закрыть'
      }
    ],
    data: {
      type: 'test',
      timestamp: Date.now()
    }
  };
  
  return self.registration.showNotification('eDAHouse - PWA Тест', testOptions)
    .then(() => {
      console.log('✅ [SW] PWA test notification shown successfully');
      return 'Test notification shown';
    })
    .catch(error => {
      console.error('❌ [SW] PWA test notification failed:', error);
      throw error;
    });
};

// Message handler for communication with main app
self.addEventListener('message', function(event) {
  console.log('📨 [SW] Received message:', event.data);
  
  if (event.data?.type === 'test-pwa-notification') {
    console.log('🧪 [SW] Testing PWA notification via message');
    self.testPWANotification();
  }
});

console.log('🔔 [SW] PWA Service Worker loaded with enhanced push notification support');