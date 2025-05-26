// ============================================================================
// Consolidated Service Worker for Satyug Ecosystem (Landing, VishwaDharma, VishwaSamvidhan)
// Version: v0.2 - INCREMENT THIS TO TRIGGER FULL CACHE REFRESH
// Placed at /satyug/sw.js - Controls the entire /satyug/ scope.
// ============================================================================

// Service Worker version. Increment this string (e.g., to 'nexus-protocol-cache-v0.1')
// to trigger a service worker update and clear all old caches automatically.
const CACHE_NAME = 'nexus-protocol-cache-v0.1'; // **IMPORTANT: Increment this version for new deployments**

// ============================================================================
// Core App Shell Assets (to be pre-cached during installation)
// IMPORTANT: Verify and adjust these paths to precisely match your project structure.
// Paths are relative to the Service Worker's scope (which is /satyug/ for your setup).
// ============================================================================
const CORE_ASSETS_TO_CACHE = [
  // --- Satyug Root (Landing Page) Assets ---
  './', // Caches the main entry point (resolves to /satyug/index.html)
  'index.html',
  //'style.css',
  //'script.js',
  'manifest.json',
  'sw.js', // Self-caching the service worker itself

  // --- Global Assets (e.g., in /satyug/assets/) ---
  'assets/fav-icon.png',
  'assets/glogo.png',
  'assets/unity.jpg',
  // 'assets/eternal-harmony.mp3',
  // 'assets/vishwa-samvidhan-anthem.mp3',

  // --- Vishwa Dharma Sub-folder Assets ---
  'vishwadharma/index.html',
  'vishwadharma/script.js',
  'vishwadharma/style.css',

  // --- Vishwa Samvidhan Sub-folder Assets ---
  'vishwasamvidhan/index.html',
  'vishwasamvidhan/script.js',
  'vishwasamvidhan/style.css',

  // --- External Google Fonts (CSS definition files only for pre-cache) ---
  // The actual font files (.woff2, etc.) are handled by the 'fetch' strategy dynamically.
  'https://fonts.googleapis.com/css2?family=Philosopher:wght@400;700&family=Noto+Serif+Devanagari:wght@400;700&display=swap',
  'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400&family=Inter:wght@300;400;500;600&family=Noto+Serif:ital,wght@0,400;0,700;1,400&display=swap'
];

// --- Critical Assets for "Network-First" Strategy ---
// These are typically your HTML documents, main CSS, and main JS files that you want
// to be as fresh as possible, falling back to cache only when offline.
// NOTE: These paths must match the CORE_ASSETS_TO_CACHE or network fetch paths.
const CRITICAL_ASSETS_FOR_NETWORK_FIRST = [
  './',
    // --- Global Assets (e.g., in /satyug/assets/) ---
  'assets/fav-icon.png',
  'assets/glogo.png',
  'assets/unity.jpg',
  // 'assets/eternal-harmony.mp3',
  // 'assets/vishwa-samvidhan-anthem.mp3',
  'index.html',
  'style.css',
  'script.js',
  'vishwadharma/index.html',
  'vishwadharma/script.js',
  'vishwadharma/style.css',
  'vishwasamvidhan/index.html',
  'vishwasamvidhan/script.js',
  'vishwasamvidhan/style.css'
];

// Domains that should be explicitly handled or bypassed by the Service Worker
// These resources are often dynamic, have complex CORS requirements, or don't need caching.
const BYPASS_DOMAINS = [
    'translate.google.com',
    'www.gstatic.com', // Often associated with translate, analytics, reCAPTCHA etc.
    'www.google-analytics.com',
    'www.googletagmanager.com',
    'fonts.gstatic.com' // Google Fonts files (will be handled by explicit fetch logic for fonts)
];

// ============================================================================
// Service Worker Lifecycle Events
// ============================================================================

/**
 * 'install' event handler.
 * Fires when the service worker is installed. Used for pre-caching the app shell.
 */
self.addEventListener('install', (event) => {
  console.log(`[Nexus SW ${CACHE_NAME}] Installing. Caching app shell assets.`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log(`[Nexus SW ${CACHE_NAME}] Caching core assets:`, CORE_ASSETS_TO_CACHE);
        // Using Promise.all with individual .catch to allow non-critical assets to fail
        // without preventing the entire Service Worker installation.
        return Promise.all(
          CORE_ASSETS_TO_CACHE.map(url =>
            cache.add(url).catch(err => console.warn(`[SW ${CACHE_NAME}] Failed to pre-cache '${url}':`, err))
          )
        );
      })
      .then(() => {
        console.log(`[Nexus SW ${CACHE_NAME}] Core app shell caching completed.`);
        // `self.skipWaiting()` forces the new service worker to become active
        // immediately upon installation, bypassing the waiting phase.
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error(`[Nexus SW ${CACHE_NAME}] App shell caching failed during install:`, error);
        // Throwing error here will prevent the SW from installing if any critical
        // assets fail to cache, which might be desired for PWA integrity.
        throw error;
      })
  );
});

/**
 * 'activate' event handler.
 * Fires when the service worker is activated. Used for cleaning up old caches.
 */
self.addEventListener('activate', (event) => {
  console.log(`[Nexus SW ${CACHE_NAME}] Activating new service worker.`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete any cache that doesn't match the current CACHE_NAME
          // and starts with 'nexus-protocol-cache-' to avoid deleting unrelated caches.
          if (cacheName !== CACHE_NAME && cacheName.startsWith('nexus-protocol-cache-')) {
            console.log(`[Nexus SW ${CACHE_NAME}] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
          return Promise.resolve(); // Keep caches that match current name or don't start with the prefix
        })
      );
    })
    .then(() => {
        console.log(`[Nexus SW ${CACHE_NAME}] Old caches cleared. Claiming clients.`);
        // `self.clients.claim()` allows the activated service worker to take control
        // of all clients (open tabs) within its scope immediately.
        return self.clients.claim();
    })
    .catch(error => {
        console.error(`[Nexus SW ${CACHE_NAME}] Error during activation (cache cleanup or clients claim):`, error);
    })
  );
});

// ============================================================================
// Fetch Event Handler - Intercepting network requests
// ============================================================================

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // --- 1. Skip non-GET requests or non-http/s protocols (e.g., chrome-extension://) ---
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
      return;
  }

  // --- 2. Bypass Strategy: Network Only for specific external domains ---
  if (BYPASS_DOMAINS.includes(url.hostname)) {
    // console.log(`[Nexus SW ${CACHE_NAME}] Bypassing SW (Network Only): ${request.url}`);
    event.respondWith(
        fetch(request).catch(error => {
            console.warn(`[Nexus SW ${CACHE_NAME}] Network-only fetch failed for external resource (${request.url}):`, error);
            throw error; // Propagate error
        })
    );
    return; // Request handled, exit fetch listener.
  }

  // Convert CRITICAL_ASSETS_FOR_NETWORK_FIRST to full URLs for easier comparison
  const criticalAssetFullURLs = CRITICAL_ASSETS_FOR_NETWORK_FIRST.map(path => {
    // Resolve relative paths correctly based on the service worker's scope
    return new URL(path, self.location.href).href;
  });

  // Check if the current request URL is one of the critical assets
  const isCriticalAsset = criticalAssetFullURLs.includes(url.href);
  const isNavigationRequest = request.destination === 'document'; // For HTML pages

  // --- 3. Strategy for Critical Assets (Network-First, with Cache Fallback) ---
  // This ensures the latest version is always attempted first for your main pages and scripts/styles.
  if (isCriticalAsset || isNavigationRequest) {
    console.log(`[Nexus SW ${CACHE_NAME}] Applying Network-First strategy for: ${request.url}`);
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          // If network fetch successful, validate, cache and return response
          const shouldCacheResponse = networkResponse && networkResponse.status === 200 && (
              networkResponse.type === 'basic' || networkResponse.type === 'cors' || networkResponse.type === 'opaque'
          );
          if (shouldCacheResponse) {
             const responseToCache = networkResponse.clone(); // Clone for cache.put
             caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseToCache)
                   .then(() => { /* console.log(`[Nexus SW ${CACHE_NAME}] Updated cache for ${request.url}`); */ })
                   .catch(err => console.error(`[Nexus SW ${CACHE_NAME}] Failed to update cache for ${request.url}:`, err));
             });
          }
          return networkResponse; // Return the network response to the page
        })
        .catch(error => {
          // If network fails (e.g., offline), try to serve from cache
          console.warn(`[Nexus SW ${CACHE_NAME}] Network failed for ${request.url}. Falling back to cache.`, error);
          return caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
              console.log(`[Nexus SW ${CACHE_NAME}] Serving from cache fallback: ${request.url}`);
              return cachedResponse;
            }
            // If it's a navigation request and no cache is found, the browser will likely show its default offline page.
            // For other assets, it will just fail (e.g., broken image).
            console.error(`[Nexus SW ${CACHE_NAME}] No cache or network for ${request.url}`);
            throw error; // Propagate the original error
          });
        })
    );
  } else {
    // --- 4. Strategy for Other Assets (Cache-First, then Network / Stale-While-Revalidate effect) ---
    // This is good for images, less critical static files where freshness is less critical
    // than speed and offline availability. It also automatically updates the cache on subsequent fetches.
    console.log(`[Nexus SW ${CACHE_NAME}] Applying Cache-First strategy for: ${request.url}`);
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // Serve from cache immediately if available
        if (cachedResponse) {
          // In the background, try to fetch a new version from the network and update the cache for next time.
          // This creates the "Stale-While-Revalidate" effect.
          const fetchAndUpdate = fetch(request.clone()).then(networkResponse => {
            const shouldCacheResponse = networkResponse && networkResponse.status === 200 && (
                networkResponse.type === 'basic' || networkResponse.type === 'cors' || networkResponse.type === 'opaque'
            );
            if (shouldCacheResponse) {
               const responseToCache = networkResponse.clone();
               caches.open(CACHE_NAME).then(cache => {
                  cache.put(request, responseToCache); // Overwrites old entry
               }).catch(err => console.error(`[Nexus SW ${CACHE_NAME}] Failed to put ${request.url} into cache from background fetch:`, err));
            }
            return networkResponse;
          }).catch(err => {
            console.warn(`[Nexus SW ${CACHE_NAME}] Background network update failed for ${request.url}:`, err);
          });
          return cachedResponse; // Return the cached response for the current request
        }

        // If not in cache, fetch from the network (and cache it for next time)
        console.log(`[Nexus SW ${CACHE_NAME}] Not in cache. Fetching from network (Cache-First branch): ${request.url}`);
        return fetch(request.clone()).then(networkResponse => {
          const shouldCacheResponse = networkResponse && networkResponse.status === 200 && (
              networkResponse.type === 'basic' || networkResponse.type === 'cors' || networkResponse.type === 'opaque'
          );
          if (shouldCacheResponse) {
             const responseToCache = networkResponse.clone();
             caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseToCache);
             }).catch(err => console.error(`[Nexus SW ${CACHE_NAME}] Failed to put ${request.url} into cache (Cache-First branch):`, err));
          }
          return networkResponse;
        }).catch(error => {
           // No specific offline fallback for individual non-document assets here;
           // the browser will show its default error (e.g., broken image icon) if both network and cache fail.
           console.warn(`[Nexus SW ${CACHE_NAME}] Network request failed for ${request.url}. (Cache-First branch)`);
           throw error; // Propagate the error
        });
      })
    );
  }
});

// ============================================================================
// Communication (Optional: For messaging between page and SW)
// ============================================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log(`[Nexus SW ${CACHE_NAME}:Message] Received SKIP_WAITING message. Calling self.skipWaiting().`);
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
    // Allows the page to trigger a cache clear for debugging/maintenance.
    console.log(`[Nexus SW ${CACHE_NAME}:Message] Received CLEAR_ALL_CACHES message. Initiating cache clear.`);
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Only clear caches owned by this Service Worker (e.g., starting with 'nexus-protocol-cache-')
            if (cacheName.startsWith('nexus-protocol-cache-')) {
              console.log(`[Nexus SW ${CACHE_NAME}:Message] Clearing cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
            return Promise.resolve(); // Ignore caches not starting with the prefix
          })
        );
      }).then(() => {
        console.log(`[Nexus SW ${CACHE_NAME}:Message] All relevant caches cleared.`);
        // Optionally, notify the client that caches have been cleared
        if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ type: 'CACHES_CLEARED_SUCCESS', version: CACHE_NAME });
        }
      }).catch(error => {
        console.error(`[Nexus SW ${CACHE_NAME}:Message] Error clearing caches via message:`, error);
        if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ type: 'CACHES_CLEARED_ERROR', error: error.message });
        }
      })
    );
  }
});

console.log(`[Nexus SW ${CACHE_NAME}] Service Worker script loaded and evaluated.`);
