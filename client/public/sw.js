const CACHE_NAME = 'edahouse-v1.0.0';
const STATIC_CACHE = 'edahouse-static-v1.0.0';
const DYNAMIC_CACHE = 'edahouse-dynamic-v1.0.0';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  '/api/settings',
  '/api/categories',
  '/api/products'
];

// Push notification event handlers
self.addEventListener('push', function(event) {
  console.log('🔔 Push event received!', event);
  
  if (!event.data) {
    console.log('❌ No data in push event');
    return;
  }

  try {
    const data = event.data.json();
    console.log('✅ Push notification data parsed:', data);

    // Create unique tag to prevent duplicate notifications
    const notificationTag = (data.data?.type || 'default') + '_' + Date.now();
    
    const options = {
      body: data.body,
      icon: data.icon || '/api/icons/icon-192x192.png',
      badge: data.badge || '/api/icons/icon-96x96.png',
      data: data.data || {},
      actions: data.actions || [],
      tag: notificationTag,
      requireInteraction: data.data?.type === 'order-status' || data.data?.type === 'cart-reminder',
      vibrate: [200, 100, 200],
      silent: false,
      renotify: false // Prevent re-notification for same tag
    };

    console.log('🔔 Showing notification with options:', options);
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
        .then(() => {
          console.log('✅ Notification shown successfully:', data.title);
        })
        .catch(error => {
          console.error('❌ Failed to show notification:', error);
        })
    );
  } catch (error) {
    console.error('Error processing push notification:', error);
    
    // Fallback notification with unique tag
    event.waitUntil(
      self.registration.showNotification('eDAHouse', {
        body: 'У вас новое уведомление',
        icon: '/api/icons/icon-192x192.png',
        badge: '/api/icons/icon-96x96.png',
        tag: 'fallback_' + Date.now()
      })
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;

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

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Try to focus existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({
            type: 'notification-click',
            url: url,
            data: data
          });
          return;
        }
      }
      
      // Open new window if no existing window found
      if (clients.openWindow) {
        return clients.openWindow(url);
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
    
    // Fetch from network and cache
    const response = await fetch(request);
    
    if (response.ok) {
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

// DUPLICATE PUSH HANDLERS REMOVED - using unified handler at top of file