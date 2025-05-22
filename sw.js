// ============================================================================
// A New Dawn (CosmicDawn) Hub - Eternal Guardian Protocol - Operational Logic v0.0
// Role: Authenticated Data Steward and Cache Matrix Manager
// Mission Directive: Ensure resilient access and rapid data manifestation for the central Nexus Hub.
// ============================================================================

// § PROTOCOL VERSIONING AND CACHE NAMES §
const CACHE_ASSET_VERSION = '0.0'; // UPDATED: Corrected local paths for SW cache.
const CACHE_PROTOCOL_VERSION = 'v0.0'; 

const CACHE_PREFIX = 'nexus-guardian'; 

const CACHE_NAME_STATIC = `${CACHE_PREFIX}-static-${CACHE_ASSET_VERSION}-${CACHE_PROTOCOL_VERSION}`;
const CACHE_NAME_DYNAMIC = `${CACHE_PREFIX}-dynamic-${CACHE_ASSET_VERSION}-${CACHE_PROTOCOL_VERSION}`;
const CACHE_NAME_EXTERNAL = `${CACHE_PREFIX}-external-${CACHE_ASSET_VERSION}-${CACHE_PROTOCOL_VERSION}`;


// § CORE MISSION DATA MANIFEST §
// Essential assets for the FUNCTION and RESILIENCE of the central Nexus Hub.
// Paths are relative to the service worker's location/scope (e.g., /Satyug/).
const CORE_MISSION_ASSETS_TO_CACHE = [
  './',           // Represents the root of the SW scope (e.g., /Satyug/ or /Satyug/index.html)
  './index.html', // Explicitly /Satyug/index.html
  './manifest.json', // Explicitly /Satyug/manifest.json
  // External image assets to be pre-cached
  '/satyug/assets/glogo.png',
  '/satyug/assets/fav-icon.png',
];


// § INTERCEPTED FREQUENCIES & PERIMETER HOSTS §
const EXTERNAL_ASSET_HOSTS = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'raw.githubusercontent.com' // For glogo and favicon from GitHub raw
];

const RESTRICTED_NETWORK_ONLY_HOSTS = [
    'translate.google.com',     
    'translate.googleapis.com'  
];


// § OPERATIONAL PARAMETERS - DATA MATRIX MAINTENANCE §
const MAX_DYNAMIC_CACHE_SIZE = 50; // Increased for other local assets like screenshots
const MAX_EXTERNAL_CACHE_SIZE = 50;

// ============================================================================
// § OPERATIONAL SUBROUTINES (Internal Agent Functions) §
// ============================================================================

const maintainCacheMatrixIntegrity = async (cacheName, maxSize) => {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxSize) {
      console.log(`[${CACHE_PREFIX}] Cache Sweep for '${cacheName}'. Entries: ${keys.length}. Max: ${maxSize}.`);
      await Promise.all(keys.slice(0, keys.length - maxSize).map(key => cache.delete(key)));
       console.log(`[${CACHE_PREFIX}] Cache Sweep Complete for '${cacheName}'. Remaining: ${maxSize}.`);
    }
  } catch (error) {
    console.error(`[${CACHE_PREFIX}] Failure during Cache Maintenance ('${cacheName}'):`, error);
  }
};

// ============================================================================
// § ETERNAL GUARDIAN LIFECYCLE EVENTS §
// ============================================================================

self.addEventListener('install', (event) => {
  console.log(`[${CACHE_PREFIX}] Unit ${CACHE_ASSET_VERSION}.${CACHE_PROTOCOL_VERSION} Installing.`);
  event.waitUntil(
    caches.open(CACHE_NAME_STATIC)
      .then((cache) => {
        console.log(`[${CACHE_PREFIX}] Caching Core Assets to '${CACHE_NAME_STATIC}':`, CORE_MISSION_ASSETS_TO_CACHE);
        const cachePromises = CORE_MISSION_ASSETS_TO_CACHE.map(urlToCache => {
            const request = new Request(urlToCache, {mode: 'cors'}); // Use CORS for all, especially external
            return cache.add(request).catch(err => {
                console.warn(`[${CACHE_PREFIX}] Failed to cache asset '${urlToCache}' during install. Error: ${err.message}`);
                // Don't fail the whole install for one asset
                return Promise.resolve();
            });
        });
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log(`[${CACHE_PREFIX}] Core Assets Secured. Activating Standby.`);
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error(`[${CACHE_PREFIX}] Install Failure (Core Assets):`, error);
        throw error; // Propagate error to signal installation failure.
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log(`[${CACHE_PREFIX}] Unit v${CACHE_ASSET_VERSION}.${CACHE_PROTOCOL_VERSION} Activating. Purging Legacy Protocols.`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      const outdatedCaches = cacheNames.filter((cacheName) => {
         return cacheName.startsWith(CACHE_PREFIX + '-') &&
                cacheName !== CACHE_NAME_STATIC &&
                cacheName !== CACHE_NAME_DYNAMIC &&
                cacheName !== CACHE_NAME_EXTERNAL;
      });

      if (outdatedCaches.length > 0) {
         console.log(`[${CACHE_PREFIX}] Legacy Caches for Purge:`, outdatedCaches);
      }
      return Promise.all(
        outdatedCaches.map((cacheName) => {
          console.log(`[${CACHE_PREFIX}] Purging Legacy Cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    })
    .then(() => {
        console.log(`[${CACHE_PREFIX}] Legacy Protocols Purged. Command Seized.`);
        return self.clients.claim();
    })
    .catch(error => {
        console.error(`[${CACHE_PREFIX}] Activation Failure:`, error);
         throw error;
    })
  );
});

// ============================================================================
// § OPERATIONAL DATA FLOW INTERCEPTION (Fetch Event) §
// ============================================================================

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  const isSameOrigin = url.origin === self.location.origin;
  const isWhitelistedExternal = EXTERNAL_ASSET_HOSTS.some(host => url.hostname === host);

  if (request.method !== 'GET' || (!isSameOrigin && !isWhitelistedExternal) || request.url.includes('/.well-known/')) {
    return; 
  }

   if (RESTRICTED_NETWORK_ONLY_HOSTS.some(host => url.hostname.includes(host))) {
       event.respondWith(
           fetch(request).catch(error => {
               console.warn(`[${CACHE_PREFIX}] Network Failure to Restricted Host: ${request.url}.`, error);
               throw error;
           })
       );
       return;
   }

   const cacheToWrite = isWhitelistedExternal ? CACHE_NAME_EXTERNAL : CACHE_NAME_DYNAMIC;

    event.respondWith(
        caches.match(request, { ignoreSearch: false }).then(cachedResponse => {
            if (cachedResponse) {
                 if (isWhitelistedExternal) { 
                      const networkFetch = fetch(request).then(networkResponse => {
                           const isCacheable = networkResponse && networkResponse.status >= 200 && networkResponse.status < 400 &&
                                             networkResponse.status !== 206 &&
                                             (networkResponse.type === 'basic' || networkResponse.type === 'cors');
                           if (isCacheable) {
                              caches.open(cacheToWrite).then(cache => {
                                  cache.put(request, networkResponse.clone())
                                     .catch(error => console.warn(`[${CACHE_PREFIX}] SWR Cache.put failed for '${request.url}'`, error));
                                  maintainCacheMatrixIntegrity(cacheToWrite, MAX_EXTERNAL_CACHE_SIZE); 
                              }).catch(error => console.error(`[${CACHE_PREFIX}] SWR Caches.open failed for ('${cacheToWrite}')`, error));
                           }
                           return networkResponse;
                      }).catch(error => {
                          console.warn(`[${CACHE_PREFIX}] SWR background fetch failed for ${request.url}:`, error);
                           throw error;
                      });
                      return cachedResponse; 
                 }
                return cachedResponse; 
            }

            const fetchRequestClone = request.clone();

            return fetch(fetchRequestClone).then((networkResponse) => {
                const isNetworkResponseCacheable = networkResponse &&
                                                   networkResponse.status >= 200 && networkResponse.status < 400 &&
                                                   networkResponse.status !== 206 &&
                                                   (networkResponse.type === 'basic' || networkResponse.type === 'cors');
                
                const isEligibleForCache = isNetworkResponseCacheable && (isSameOrigin || isWhitelistedExternal);

                if (isEligibleForCache) {
                   const responseToCache = networkResponse.clone();
                   caches.open(cacheToWrite).then((cache) => {
                      cache.put(request, responseToCache)
                         .catch(error => console.error(`[${CACHE_PREFIX}] Cache.put failed for '${request.url}' in '${cacheToWrite}'`, error));
                      
                      const maxCacheSize = isWhitelistedExternal ? MAX_EXTERNAL_CACHE_SIZE : MAX_DYNAMIC_CACHE_SIZE;
                      maintainCacheMatrixIntegrity(cacheToWrite, maxCacheSize);

                   }).catch(error => console.error(`[${CACHE_PREFIX}] Caches.open failed for '${cacheToWrite}' for secure op`, error));
                }
                return networkResponse;
            }).catch((error) => {
               console.error(`[${CACHE_PREFIX}] Network Probe & Cache Miss for ${request.url}. Failure:`, error);
               throw error;
            });
        })
        .catch(cacheMatchError => {
             console.error(`[${CACHE_PREFIX}] caches.match failure for ${request.url}. Resorting to network:`, cacheMatchError);
             return fetch(request).catch(networkError => {
                  console.error(`[${CACHE_PREFIX}] Final Network fallback failure for ${request.url}.`, networkError);
                  throw networkError;
             });
        })
    );
});


// § OPERATIONAL COMMUNICATIONS CHANNEL (Message Event) §
self.addEventListener('message', (event) => {
  console.log(`[${CACHE_PREFIX}] Directive from Unit ${event.source ? event.source.id : 'Unknown'}:`, event.data);

  if (event.data && event.data.type === 'INITIATE_ACTIVATION') {
    console.log(`[${CACHE_PREFIX}] Command: INITIATE_ACTIVATION. Executing skipWaiting().`);
    self.skipWaiting();
     if (event.source) {
         event.source.postMessage({ type: 'ACTIVATION_INITIATED_ACK', status: 'Success', cacheVersion: CACHE_NAME_STATIC });
     }
  }
  else if (event.data && event.data.type === 'PURGE_CACHE_MATRIX') {
     console.log(`[${CACHE_PREFIX}] Command: PURGE_CACHE_MATRIX. Cleansing '${CACHE_PREFIX}-*' segments.`);
     event.waitUntil(
       caches.keys().then(cacheNames => {
          const relevantCaches = cacheNames.filter(name => name.startsWith(CACHE_PREFIX + '-'));
          return Promise.all(relevantCaches.map(name => caches.delete(name)));
       }).then(() => {
         console.log(`[${CACHE_PREFIX}] Cache Matrix Purge Complete.`);
         if (event.source) {
              event.source.postMessage({ type: 'CACHE_PURGED_ACK', status: 'Success' });
         }
       }).catch(error => {
          console.error(`[${CACHE_PREFIX}] PURGE_CACHE_MATRIX failure:`, error);
           if (event.source) {
               event.source.postMessage({ type: 'CACHE_PURGED_ACK', status: 'Failure', error: error.message });
           }
       })
     );
  }
   else {
      console.log(`[${CACHE_PREFIX}] Unrecognized Directive:`, event.data);
       if (event.source) {
           event.source.postMessage({ type: 'UNRECOGNIZED_DIRECTIVE', originalMessage: event.data });
       }
   }
});

console.log(`[${CACHE_PREFIX}] SW Unit ${CACHE_ASSET_VERSION}.${CACHE_PROTOCOL_VERSION} Deployed. Guardianship Active.`);