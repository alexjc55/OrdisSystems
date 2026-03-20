// Service Worker for eDAHouse PWA
const APP_VERSION = '1.0.0';
const BUILD_TIMESTAMP = '20260320-1145';
const STATIC_CACHE = `edahouse-static-v${APP_VERSION}-${BUILD_TIMESTAMP}`;
const DYNAMIC_CACHE = `edahouse-dynamic-v${APP_VERSION}-${BUILD_TIMESTAMP}`;

// Only cache true static assets (icons that never change)
const STATIC_ASSETS = [
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints eligible for stale-while-revalidate caching
const API_CACHE_PATTERNS = [
  '/api/settings',
  '/api/categories',
  '/api/products'
];

const API_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('🔧 [SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => {
        console.log('✅ [SW] Installed');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('❌ [SW] Install failed:', err);
        return self.skipWaiting();
      })
  );
});

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('🚀 [SW] Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(name =>
              name.startsWith('edahouse-') &&
              name !== STATIC_CACHE &&
              name !== DYNAMIC_CACHE
            )
            .map(name => {
              console.log('🗑️ [SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        )
      )
      .then(() => {
        console.log('✅ [SW] Activated');
        return self.clients.claim();
      })
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip non-same-origin requests
  if (url.origin !== self.location.origin) return;

  // ① Navigation requests (HTML pages) → Network-first, cache as offline fallback only
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // ② API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // ③ Static assets (JS, CSS with content hash → safe to cache forever)
  event.respondWith(handleStaticAsset(request));
});

// Navigation: always try network first, only fall back to cache when offline
async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    // Store a copy as offline fallback (but don't serve it cache-first)
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    // Offline fallback
    const cache = await caches.open(DYNAMIC_CACHE);
    const cached = await cache.match(request) || await cache.match('/');
    if (cached) return cached;

    return new Response(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Офлайн</title></head>' +
      '<body style="font-family:sans-serif;text-align:center;padding:40px">' +
      '<h2>Нет подключения к интернету</h2>' +
      '<p>Проверьте соединение и обновите страницу.</p>' +
      '<button onclick="location.reload()">Обновить</button></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

// API: stale-while-revalidate for whitelisted endpoints, network-only for others
async function handleApiRequest(request) {
  const url = new URL(request.url);

  const isCacheable = API_CACHE_PATTERNS.some(p => url.pathname.startsWith(p));

  if (!isCacheable) {
    // Network-only for non-cacheable API calls
    try {
      return await fetch(request);
    } catch (err) {
      throw err;
    }
  }

  // Stale-while-revalidate with TTL
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    const dateHeader = cached.headers.get('sw-cached-at');
    const age = dateHeader ? Date.now() - parseInt(dateHeader) : Infinity;

    // Revalidate in background if stale
    if (age > API_CACHE_TTL) {
      fetchAndCacheApi(request, cache);
    }

    return cached;
  }

  // No cache → fetch and store
  return fetchAndCacheApi(request, cache);
}

async function fetchAndCacheApi(request, cache) {
  const response = await fetch(request);
  if (response.ok) {
    const headers = new Headers(response.headers);
    headers.set('sw-cached-at', String(Date.now()));
    const body = await response.arrayBuffer();
    await cache.put(request, new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers
    }));
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  }
  return response;
}

// Static assets: cache-first (safe for hashed filenames like /assets/main.abc123.js)
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    throw err;
  }
}

// ─── Messages from main app ───────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'FORCE_UPDATE') {
    event.waitUntil(
      caches.keys()
        .then(names => Promise.all(names.map(n => caches.delete(n))))
        .then(() => self.clients.matchAll())
        .then(clients => clients.forEach(c => c.postMessage({ type: 'CACHE_CLEARED' })))
    );
  }

  if (event.data?.type === 'test-pwa-notification') {
    self.testPWANotification();
  }
});

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  console.log('🔔 [SW] Push received');

  if (!event.data) {
    event.waitUntil(
      self.registration.showNotification('eDAHouse', {
        body: 'Новое уведомление',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: 'push_' + Date.now()
      })
    );
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'eDAHouse', body: event.data.text() };
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-96x96.png',
    data: data.data || {},
    tag: (data.data?.type || 'default') + '_' + Date.now(),
    requireInteraction: true,
    vibrate: [200, 100, 200],
    actions: data.actions?.length ? data.actions : [
      { action: 'open', title: 'Открыть' },
      { action: 'close', title: 'Закрыть' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'eDAHouse', options)
      .then(() => {
        return self.clients.matchAll().then(clients =>
          clients.forEach(c => c.postMessage({
            type: 'notification-shown',
            title: data.title,
            body: data.body,
            notificationType: data.data?.type || 'marketing'
          }))
        );
      })
      .catch(err => {
        return self.clients.matchAll().then(clients =>
          clients.forEach(c => c.postMessage({ type: 'notification-error', error: err.message }))
        );
      })
  );
});

// ─── Notification Click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const data = event.notification.data || {};
  let url = '/';

  if (data.type === 'order-status' && data.orderId) {
    url = `/profile?tab=orders&order=${data.orderId}`;
  } else if (data.type === 'cart-reminder') {
    url = event.action === 'checkout' ? '/checkout' : '/';
  } else if (event.action === 'view-order' && data.orderId) {
    url = `/profile?tab=orders&order=${data.orderId}`;
  }

  const notificationData = {
    type: 'notification-click',
    url,
    data,
    notification: {
      title: event.notification.title,
      body: event.notification.body,
      type: data.type || 'marketing'
    }
  };

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage(notificationData);
          return;
        }
      }

      if (clients.openWindow) {
        const urlWithData = url + (url.includes('?') ? '&' : '?') +
          'notification=' + encodeURIComponent(JSON.stringify({
            title: event.notification.title,
            body: event.notification.body,
            type: data.type || 'marketing'
          }));
        return clients.openWindow(urlWithData);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('🔕 [SW] Notification closed');
});

// ─── PWA Test ─────────────────────────────────────────────────────────────────
self.testPWANotification = function() {
  return self.registration.showNotification('eDAHouse - Тест', {
    body: 'Тестовое уведомление из Service Worker',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    tag: 'pwa-test-' + Date.now(),
    requireInteraction: true,
    actions: [
      { action: 'open', title: 'Открыть' },
      { action: 'close', title: 'Закрыть' }
    ],
    data: { type: 'test', timestamp: Date.now() }
  });
};

console.log('✅ [SW] eDAHouse Service Worker loaded, version:', APP_VERSION, BUILD_TIMESTAMP);
