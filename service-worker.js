const CACHE_NAME = 'alter-ego-ai-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/bundle.js',
  '/manifest.json'
];

// Don't use skipWaiting to prevent abrupt takeover
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service worker cache opened');
        return cache.addAll(urlsToCache)
          .catch(err => {
            console.warn('Pre-caching failed:', err);
            // Continue anyway
            return Promise.resolve();
          });
      })
  );
  // Do not force activation - allow natural lifecycle
  // self.skipWaiting(); 
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Clear old caches
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('Service worker activated');
      // Only claim clients after clearing old caches
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Special handling for navigation requests to prevent refresh loops
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }
  
  // Network-first strategy for API calls
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if found
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        // Make network request and cache the response
        return fetch(fetchRequest).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          // Add to cache
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            })
            .catch(err => {
              console.warn('Failed to cache:', err);
            });
            
          return response;
        });
      })
  );
});