const CACHE_NAME = 'alter-ego-ai-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/bundle.js',
  '/manifest.json'
  // Don't pre-cache assets that might not be available yet
];

self.addEventListener('install', (event) => {
  // Use a more resilient caching approach
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service worker cache opened');
        // Use individual cache.put operations with catch handlers
        const cachePromises = urlsToCache.map(url => {
          return fetch(url)
            .then(response => {
              if (!response.ok) {
                throw new Error(`Failed to fetch ${url}`);
              }
              return cache.put(url, response);
            })
            .catch(err => {
              console.warn(`Caching failed for ${url}:`, err);
              // Continue despite this particular URL failing
              return Promise.resolve();
            });
        });
        
        return Promise.all(cachePromises);
      })
  );
  
  // Force the waiting service worker to become active
  self.skipWaiting();
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
      // Take control of all clients
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
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
      .catch(() => {
        // Fallback for offline images
        if (event.request.url.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
          return new Response('<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><text x="25" y="100" fill="#0f0">Offline Image</text></svg>', 
            { headers: { 'Content-Type': 'image/svg+xml' } });
        }
      })
  );
});