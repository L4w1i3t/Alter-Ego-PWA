// The version of your cache
const CACHE_VERSION = 1;
const CACHE_NAME = `alter-ego-cache-v${CACHE_VERSION}`;

// Assets to cache for offline use - these need to match your actual file paths
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/bundle.js', // Adjust based on your actual bundle filename
  '/assets/favicon.ico',
  '/manifest.json'
];

// Install event - cache static assets with error handling
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('Caching static assets');
        
        // More robust approach - add files individually to handle failures
        const addedAssets = await Promise.allSettled(
          STATIC_ASSETS.map(url => 
            cache.add(url).catch(err => {
              console.warn(`Couldn't cache asset ${url}:`, err);
              return false;
            })
          )
        );
        
        const failures = addedAssets.filter(result => result.status === 'rejected');
        if (failures.length > 0) {
          console.warn(`Failed to cache ${failures.length} assets, but service worker will continue`);
        }
        
        return true; // Proceed even if some assets couldn't be cached
      })
      .then(() => self.skipWaiting())
      .catch(error => {
        console.error('Service worker installation failed:', error);
        // Continue with service worker installation even if caching fails
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - respond from cache or network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle API requests differently
  if (event.request.url.includes('/api/')) {
    // For API requests, try network first, then fall back to offline message
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Return a custom offline response for API requests
          return new Response(
            JSON.stringify({
              error: "You're offline. Please check your connection.",
              isOffline: true,
            }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 503,
            }
          );
        })
    );
    return;
  }

  // For static assets, use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Not in cache, try to fetch it
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response as it can only be consumed once
            const responseToCache = response.clone();

            // Add the new resource to the cache
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache)
                  .catch(err => console.warn('Failed to update cache for', event.request.url, err));
              })
              .catch(err => console.warn('Failed to open cache for update', err));

            return response;
          })
          .catch(() => {
            // If fetch fails (offline), return the offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            
            // Just return a simple error for other resources
            return new Response('Network error occurred', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Handle communication from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for offline message sending
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// Function to sync messages when online
async function syncMessages() {
  try {
    // Open the IndexedDB database
    const dbName = 'alterEgoStorage';
    const dbVersion = 1;
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);
      request.onerror = reject;
      request.onsuccess = (event) => resolve(event.target.result);
    });

    // Get pending messages from the store
    const transaction = db.transaction(['pendingMessages'], 'readwrite');
    const store = transaction.objectStore('pendingMessages');
    const messages = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = reject;
      request.onsuccess = (event) => resolve(event.target.result);
    });

    // Process each pending message
    for (const message of messages) {
      try {
        const response = await fetch(message.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message.data),
        });
        
        if (response.ok) {
          // If successful, remove the message from the store
          store.delete(message.id);
        }
      } catch (error) {
        console.error('Failed to sync message:', error);
      }
    }
  } catch (error) {
    console.error('Error during sync:', error);
  }
}