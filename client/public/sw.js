// Service Worker for eDAHouse PWA
const APP_VERSION = '1.0.0';
const BUILD_TIMESTAMP = '20260414-1200';
const STATIC_CACHE = `edahouse-static-v${APP_VERSION}-${BUILD_TIMESTAMP}`;

// Only cache true static assets with content hashes (icons + hashed JS/CSS)
const STATIC_ASSETS = [
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

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
            .filter(name => name.startsWith('edahouse-') && name !== STATIC_CACHE)
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

  // ① Navigation requests (HTML pages) → Network-first, no HTML caching
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // ② API requests → Always network, no caching
  if (url.pathname.startsWith('/api/')) {
    return; // Let browser handle normally
  }

  // ③ Static assets with content hash → Cache-first (safe: hashed filenames never change)
  event.respondWith(handleStaticAsset(request));
});

// Navigation: network-first, offline fallback only
async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (_) {
    // Completely offline
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

  // App requests pending notification (e.g. on visibilitychange — iOS race condition recovery)
  if (event.data?.type === 'GET_PENDING_NOTIFICATION') {
    const age = Date.now() - (self.pendingNotificationTimestamp || 0);
    if (self.pendingNotification && age < 30000 && event.source) {
      event.source.postMessage({ ...self.pendingNotification, type: 'PENDING_NOTIFICATION' });
      self.pendingNotification = null;
      self.pendingNotificationTimestamp = 0;
    }
  }

  if (event.data?.type === 'PURGE_URL_CACHE') {
    const urlPattern = event.data.urlPattern;
    if (urlPattern) {
      event.waitUntil(
        caches.open(STATIC_CACHE).then(cache =>
          cache.keys().then(keys =>
            Promise.all(
              keys.filter(k => k.url.includes(urlPattern)).map(k => cache.delete(k))
            )
          )
        )
      );
    }
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

// Storage for pending notification (survives iOS PWA background/resume cycle)
self.pendingNotification = null;
self.pendingNotificationTimestamp = 0;

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

  // Store pending notification — app will pick it up via GET_PENDING_NOTIFICATION if postMessage missed
  self.pendingNotification = notificationData;
  self.pendingNotificationTimestamp = Date.now();

  const urlWithData = url + (url.includes('?') ? '&' : '?') +
    'notification=' + encodeURIComponent(JSON.stringify({
      title: event.notification.title,
      body: event.notification.body,
      type: data.type || 'marketing'
    }));

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clientList => {
      let appClient = null;
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          appClient = client;
          break;
        }
      }

      if (appClient) {
        // fire-and-forget focus — iOS Safari throws on focus(), never await it
        try { appClient.focus(); } catch (_) {}

        // Always postMessage directly on appClient, regardless of focus result
        appClient.postMessage(notificationData);
        return;
      }

      // No client found — open app with notification data in URL
      if (clients.openWindow) {
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
