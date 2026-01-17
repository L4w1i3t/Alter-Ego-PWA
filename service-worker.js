// Add version control to your service worker
const CACHE_VERSION = '1.0.1';
const CACHE_NAME = `app-cache-${CACHE_VERSION}`;

// List of all assets to pre-cache (critical files needed for offline functionality)
// Note: Webpack bundles are added dynamically during first install
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/favicon.ico',
  // Webpack bundles will be discovered and cached on first load
];

// Install event - cache all static assets
self.addEventListener('install', event => {
  console.log('Service Worker installing');
  
  // Use waitUntil to signal the duration and success/failure of the installation
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', event => {
  console.log('Service Worker activated');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Only invalidate caches with different versions
          if (cacheName !== CACHE_NAME) {
            console.log('Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim any existing clients
      return self.clients.claim();
    }).then(() => {
      // Detect development mode by checking if running on localhost or dev domains
      // Service worker isn't processed by webpack, so we use URL-based detection
      const isDevelopment = self.location.hostname === 'localhost' || 
                           self.location.hostname === '127.0.0.1' ||
                           self.location.hostname.startsWith('192.168.') ||
                           self.location.port === '3000';
      
      // Only notify about updates in production, NEVER in development
      if (!isDevelopment) {
        return clients.matchAll().then(clients => {
          clients.forEach(client => {
            // Send update notification to client
            client.postMessage({ 
              type: 'NEW_VERSION', 
              version: CACHE_VERSION,
              manual: true // Indicate this requires manual refresh
            });
          });
        });
      }
    })
  );
});

// Fetch event - network first, falling back to cache for same-origin GET requests only
self.addEventListener('fetch', event => {
  const { request } = event;

  // Don't handle browser-sync or webpack related requests in development
  if (request.url.includes('webpack-dev-server') || 
      request.url.includes('hot-update') ||
      request.url.includes('sockjs-node')) {
    return;
  }
  // Only handle same-origin GET requests
  const isSameOrigin = new URL(request.url).origin === self.location.origin;
  if (request.method !== 'GET' || !isSameOrigin) {
    return; // Let the browser handle non-GET or cross-origin
  }

  // Determine cache strategy based on resource type
  const url = new URL(request.url);
  const isStaticAsset = /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/i.test(url.pathname);
  const isHTML = request.headers.get('accept')?.includes('text/html') || url.pathname.endsWith('.html');
  
  // Cache-first strategy for static assets (fast!)
  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Not in cache, fetch from network and cache it
        return fetch(request).then(response => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first strategy for HTML and API calls (fresh content)
  event.respondWith(
    fetch(request)
      .then(response => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200) {
          return response;
        }

        // Cache HTML pages for offline fallback
        if (isHTML) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // For HTML requests, return index.html as fallback
          if (isHTML) {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLIENTS_CLAIM') {
    self.clients.claim();
  }
});
