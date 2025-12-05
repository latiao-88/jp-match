const CACHE_NAME = 'minna-app-v2'; // Increment version to force update
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

// Domains that we want to cache even though they are external
const EXTERNAL_DOMAINS = [
  'cdn.tailwindcss.com',
  'aistudiocdn.com'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activation
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached response if found
      if (cachedResponse) {
        return cachedResponse;
      }
      
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest).then((response) => {
        // Validate response
        // Note: response.type === 'opaque' (status 0) happens for no-cors requests (like some script tags)
        // We allow caching them for things like Tailwind if needed, but usually libraries are CORS enabled.
        if (!response || (response.status !== 200 && response.status !== 0)) {
          return response;
        }

        const responseToCache = response.clone();
        const url = new URL(event.request.url);

        // Cache strategy:
        // 1. Same Origin (local files)
        // 2. Allowed External Domains (React, Tailwind)
        if (url.origin === self.location.origin || EXTERNAL_DOMAINS.includes(url.hostname)) {
           caches.open(CACHE_NAME).then((cache) => {
             try {
               cache.put(event.request, responseToCache);
             } catch (err) {
               console.warn('Cache put failed', err);
             }
           });
        }

        return response;
      }).catch(err => {
        // Fallback or error handling for offline could go here
        // For now, if both cache and network fail, it will just fail.
        return null;
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control immediately
  );
});