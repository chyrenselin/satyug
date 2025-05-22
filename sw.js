// ============================================================================
// Service Worker Configuration for Vishwa Dharma & Samvidhan Hub
// IMPORTANT: This file MUST be placed on your server at the path specified in index.html, e.g., /satyug/sw.js
// ============================================================================

const CACHE_NAME = 'nexus-protocol-cache-v0.0'; // Versioning for updates. Increment this string to trigger new caching.

// Files to cache during the 'install' event (App Shell)
// Paths are absolute from the domain root. Verify these match actual deployment paths.
// Example: If your site is https://chyrenselin.github.io/Satyug/
// And index.html is in Satyug/, and assets are in Satyug/assets/,
// Then a path like '/satyug/assets/fav-icon.png' is correct if your service worker's scope covers /satyug/
const urlsToCache = [
  './', // Caches the HTML page that registers the SW (e.g., index.html in the current scope)
  '/satyug/assets/fav-icon.png',
  '/satyug/assets/glogo.png',
  // External Google Fonts CSS. Cache-First strategy usually works fine, but pre-caching helps if the font server is down.
  'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400&family=Inter:wght@300;400;500;600&family=Noto+Serif:ital,wght@0,400;0,700;1,400&display=swap'
];

// ============================================================================
// Service Worker Lifecycle Events
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[Nexus SW] Installing version:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Nexus SW] Caching core assets:', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[Nexus SW] Caching failed during install:', error);
        throw error;
      })
  );
  self.skipWaiting(); // Activates the new SW immediately without waiting for user to navigate away.
  console.log('[Nexus SW] skipWaiting() called.');
});

self.addEventListener('activate', (event) => {
  console.log('[Nexus SW] Activating and cleaning up old caches:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
          return cacheName !== CACHE_NAME; // Filter out current cache, delete others.
        }).map((cacheName) => {
          console.log(`[Nexus SW] Deleting old cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    })
    .then(() => self.clients.claim()) // Makes activated SW control existing open pages.
  );
  console.log('[Nexus SW] Activation complete. Ready to intercept fetches.');
});

// ============================================================================
// Fetch Strategy: Cache first, then Network with fallback/cache update
// ============================================================================

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-http/s requests (e.g., chrome-extension://, file://)
  if (!url.protocol.startsWith('http')) {
      return;
  }

  // Bypass Google Translate & Google Analytics scripts (they are external and dynamic)
  // Ensure that these requests always go to the network, not the cache.
  if (url.hostname.includes('translate.google.com') ||
      url.hostname.includes('gstatic.com') || // Google Translate fonts/scripts/assets
      url.hostname.includes('googleapis.com') || // Also used for core fonts sometimes, or other google services. If fonts are critical & locally served, this can be removed.
      url.hostname.includes('google-analytics.com') ||
      url.hostname.includes('googletagmanager.com')) {
    event.respondWith(fetch(event.request)); // Go straight to network
    return;
  }

  // Main cache-first strategy for other requests
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // console.log(`[Nexus SW] Serving from cache: ${event.request.url}`);
        return cachedResponse;
      }

      // If not in cache, fetch from network and try to cache.
      // console.log(`[Nexus SW] Fetching from network (and attempting to cache): ${event.request.url}`);
      const fetchRequest = event.request.clone(); // Clone the request because requests are streams and can only be consumed once.

      return fetch(fetchRequest).then((networkResponse) => {
        // Check if we received a valid response (200 OK) before caching it.
        // Opaque (networkResponse.type === 'opaque') responses are from cross-origin requests
        // without CORS headers, which cannot be read or stored by standard caches.
        // But for Service Worker caching, it can still cache 'opaque' responses.
        const shouldCacheResponse = networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors' || networkResponse.type === 'opaque');

        if (shouldCacheResponse) {
           const responseToCache = networkResponse.clone(); // Clone again for the cache put operation.
           caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
                 .catch(error => {
                    console.error(`[Nexus SW] Failed to cache ${event.request.url} from network:`, error);
                 });
           }).catch(error => {
               console.error('[Nexus SW] Failed to open cache during fetch/put operation:', error);
           });
        }
        return networkResponse; // Return the original network response to the page.
      }).catch((error) => {
         // Fallback logic for when both cache and network fail (e.g., completely offline)
         console.warn(`[Nexus SW] Network request failed for ${event.request.url}. And resource was not in cache. (Likely offline or blocked?)`, error);
         // You might add an offline page fallback here:
         // return caches.match('/offline.html');
         throw error; // Propagate the error if no specific offline fallback is desired for this resource.
      });
    })
  );
});
