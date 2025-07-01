const CACHE_NAME = 'edahouse-v3';

// Minimal caching - only manifest
const STATIC_FILES = [
  '/manifest.json'
];

// Install event - minimal setup
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(self.skipWaiting());
});

// Activate event - take control immediately
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Minimal fetch event - no caching
self.addEventListener('fetch', (event) => {
  // Just pass through all requests without caching
  event.respondWith(fetch(event.request));
});

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('eDAHouse', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});