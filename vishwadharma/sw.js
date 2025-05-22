// ============================================================================
// Service Worker Configuration
// ============================================================================

// Service Worker version - Increment this string to trigger updates.
// Changing this value invalidates the old cache and prompts the browser
// to install the new service worker and cache the new assets.
const CACHE_NAME = 'vishwadharm-granth-cache-v0.0'; // Increased version number

// List of core files to cache during the 'install' event.
// These files are considered the "app shell" and should be available offline.
// Ensure these paths are correct relative to the service worker script location (which is typically the root).
const urlsToCache = [
  '/', // Cache the root path (usually index.html)
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json', // Cache the manifest file
  '/satyug/assets/fav-icon.png',
  '/satyug/assets/unity.jpg',
  '/satyug/assets/eternal-harmony.mp3', // Cache the audio file
  '/satyug/assets/glogo.png', // Cache the icon used in the translate button
  // Caching Google Fonts CSS - Note that this caches the CSS file, but the font files (.woff2 etc.)
  // referenced inside the CSS will need to be fetched separately by the browser.
  // SW usually caches these automatically if they pass through the fetch handler and are same-origin/CORS enabled.
  'https://fonts.googleapis.com/css2?family=Philosopher:wght@400;700&family=Noto+Serif+Devanagari:wght@400;700&display=swap'
];

// ============================================================================
// Service Worker Lifecycle Events
// ============================================================================

/**
 * 'install' event handler.
 * This event is fired when the service worker is installed.
 * We use it to populate the initial cache with the core assets.
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing v', CACHE_NAME);
  // event.waitUntil ensures the service worker is not considered installed
  // until the promise passed to it resolves.
  event.waitUntil(
    // Open the specified cache.
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell:', urlsToCache);
        // Add all specified URLs to the cache.
        // Note: addAll will fail if *any* of the requests fail (e.g., 404, network error).
        // For maximum robustness, especially with external assets, you might fetch
        // and cache each item individually, handling errors per item.
        // For this set of local assets, addAll is generally sufficient.
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        // Log caching errors during installation.
        console.error('[Service Worker] Caching failed during install:', error);
        // If caching fails critically, you might want to throw the error
        // to prevent the service worker from installing in a broken state.
         throw error;
      })
  );
  // `self.skipWaiting()` forces the waiting service worker to become the
  // active service worker. This allows the new service worker to take control
  // of existing tabs immediately upon activation, rather than waiting for
  // the user to navigate away from the page. Use cautiously, as it might
  // cause issues if the new SW has breaking changes incompatible with
  // the currently loaded page version. For simple app shells, it's often fine.
   self.skipWaiting();
   console.log('[Service Worker] skipWaiting() called.');
});

/**
 * 'activate' event handler.
 * This event is fired when the service worker is activated.
 * We use it to clean up old caches, ensuring only the current cache version remains.
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating', CACHE_NAME);
  // event.waitUntil ensures the activation process is not complete until the promise resolves.
  event.waitUntil(
    // Get all cache keys (names).
    caches.keys().then((cacheNames) => {
      return Promise.all(
        // Filter out the current cache name.
        cacheNames.filter((cacheName) => {
          return cacheName !== CACHE_NAME;
        }).map((cacheName) => {
          // Delete all old caches.
          console.log(`[Service Worker] Clearing old cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    })
    // `self.clients.claim()` allows the active service worker to take control
    // of all clients (open tabs) within its scope immediately, without requiring
    // a page reload. This is useful when combined with `skipWaiting()`.
    .then(() => self.clients.claim())
  );
  console.log('[Service Worker] Activation complete. Ready to intercept fetches.');
});

/**
 * 'fetch' event handler.
 * This event is fired for every network request made by the page within the service worker's scope.
 * We implement a "Cache-first, then Network" strategy here.
 * - First, check if the requested resource exists in the cache.
 * - If yes, serve the cached response.
 * - If no, fetch the resource from the network.
 * - If the network fetch is successful, cache the response and then return it.
 * - If both cache and network fail, handle the error (e.g., serve an offline fallback).
 */
self.addEventListener('fetch', (event) => {
  // We only want to intercept standard http(s) requests.
  // Other protocols (like chrome-extension://, file://) should be ignored.
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) {
      // console.log(`[Service Worker] Ignoring non-http(s) request protocol: ${url.protocol}`);
      return; // Bypass Service Worker for non-http(s) requests
  }

  // --- Exclude specific external domains from being intercepted ---
  // This prevents the Service Worker from trying to cache resources from domains
  // we don't control (like Google's CDN for fonts, translate scripts, analytics)
  // as these might cause issues with CORS headers or be unnecessary to cache.
  if (url.hostname.includes('translate.google.com') || url.hostname.includes('gstatic.com') || url.hostname.includes('googleapis.com')) {
    // console.log(`[Service Worker] Passing through request to external domain: ${event.request.url}`);
    return; // Bypass Service Worker for these specific external domains
  }
   // Add other third-party domains here if needed (e.g., analytics providers)
   if (url.hostname.includes('google-analytics.com') || url.hostname.includes('googletagmanager.com')) {
       // console.log(`[Service Worker] Passing through analytics request: ${event.request.url}`);
       return;
   }
   // Add any other third-party scripts/resources here


  // --- Standard Cache-first Strategy for Other Requests ---
  // event.respondWith is used to intercept the network request and provide a custom response.
  event.respondWith(
    // Try to find the requested resource in the cache.
    caches.match(event.request).then((cachedResponse) => {
      // If the resource is found in the cache, return it immediately.
      if (cachedResponse) {
        console.log(`[Service Worker] Serving from cache: ${event.request.url}`);
        return cachedResponse;
      }

      // If the resource is not found in the cache, fetch it from the network.
      console.log(`[Service Worker] Serving from network (and attempting to cache): ${event.request.url}`);
      // Clone the request stream because a request stream can only be consumed once.
      const fetchRequest = event.request.clone();

      // Perform the network request.
      return fetch(fetchRequest).then((networkResponse) => {
        // Check if the network response is valid for caching.
        // A valid response usually has a status of 200 (OK).
        // Also check response type ('basic' for same-origin, 'cors' for cross-origin).
        // Opaque responses (type 'opaque') are generally not cacheable effectively with cache.put.
        // By excluding external domains above, we minimize encountering problematic opaque responses.
        const shouldCacheResponse = networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors');

        if (shouldCacheResponse) {
           // If the response is valid, clone it (as response streams can also be consumed only once).
           const responseToCache = networkResponse.clone();

           // Open the current cache version and put the network response into it.
           // This is an asynchronous operation, but we don't need to wait for it
           // before returning the network response to the browser.
           caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
                 .catch(error => {
                    // Log caching errors (e.g., storage quota exceeded, invalid response type)
                    console.error(`[Service Worker] Failed to cache ${event.request.url}:`, error);
                 });
           }).catch(error => {
               // Log error if unable to open the cache during the fetch handler.
               console.error('[Service Worker] Failed to open cache during fetch/put:', error);
           });
        } else if (networkResponse) {
             // Optional: Log why a valid-looking network response was not cached (e.g., non-200 status).
             // console.log(`[Service Worker] Not caching network response for ${event.request.url}. Status: ${networkResponse.status}, Type: ${networkResponse.type}`);
        } else {
             // Optional: Log if the network response was null or undefined.
             // console.log(`[Service Worker] Network response is null or undefined for ${event.request.url}`);
        }

        // Always return the network response to the browser if the fetch was successful.
        return networkResponse;

      }).catch((error) => {
         // This catch block handles cases where the resource was NOT in the cache AND the network request failed.
         console.warn(`[Service Worker] Network request failed for ${event.request.url}. And resource was not in cache.`, error);
         // Optional: Implement an offline fallback here. For example, show a specific offline page.
         // return caches.match('/offline.html'); // Assumes an offline.html is in the cache.
         // For this basic app, we'll just let the browser handle the network error if no cache is available.
         // Re-throw the error so the browser's normal error handling (e.g., showing a network error page) can occur.
         throw error;
      });
    })
  );
});

// Optional: Add a message listener to communicate with the service worker from the main thread.
// For example, to trigger `skipWaiting()` when a user clicks an "Update" button.
/*
self.addEventListener('message', (event) => {
  // Check if the message type is 'SKIP_WAITING'.
  if (event.data && event.data.type === 'SKIP_WAITING') {
    // Call skipWaiting() to make the new service worker active immediately.
    self.skipWaiting();
    console.log('[Service Worker] Received SKIP_WAITING message, calling self.skipWaiting().');
  }
});
*/