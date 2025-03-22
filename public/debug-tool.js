(function() {
    const REFRESH_THRESHOLD = 5;
    const TIME_WINDOW_MS = 10000;
    
    console.log('[Debug Tool] Initializing...');
    
    // Log environment information
    console.log('[Debug Tool] Environment:', {
      userAgent: navigator.userAgent,
      host: window.location.host,
      pathname: window.location.pathname,
      protocol: window.location.protocol,
      isGitHubPages: window.location.hostname.includes('github.io') || window.location.pathname.includes('/Alter-Ego-PWA/')
    });
    
    // Add script load event listener
    window.addEventListener('error', function(event) {
      console.error('[Debug Tool] Script load error:', event.target.src || event.target.href, event);
    }, true);
    
    // Log all network requests for debugging purposes
    if ('fetch' in window) {
      const originalFetch = window.fetch;
      window.fetch = function(url, options) {
        console.log('[Debug Tool] Fetch request:', url, options);
        return originalFetch.apply(this, arguments)
          .then(response => {
            if (!response.ok) {
              console.warn('[Debug Tool] Fetch response not OK:', response.status, response.statusText, url);
            }
            return response;
          })
          .catch(error => {
            console.error('[Debug Tool] Fetch error:', error, url);
            throw error;
          });
      };
    }
    
    // Handle refresh detection
    const getRefreshTimestamps = () => {
      try {
        const stored = localStorage.getItem('refresh_timestamps');
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        console.error('[Debug Tool] Error reading refresh timestamps:', e);
        return [];
      }
    };
    
    const saveRefreshTimestamps = (timestamps) => {
      try {
        localStorage.setItem('refresh_timestamps', JSON.stringify(timestamps));
      } catch (e) {
        console.error('[Debug Tool] Error saving refresh timestamps:', e);
      }
    };
    
    const recordRefresh = () => {
      const now = Date.now();
      const timestamps = getRefreshTimestamps();
      
      timestamps.push(now);
      const recentTimestamps = timestamps.filter(ts => (now - ts) < TIME_WINDOW_MS);
      saveRefreshTimestamps(recentTimestamps);
      
      if (recentTimestamps.length >= REFRESH_THRESHOLD) {
        console.error('[Debug Tool] REFRESH LOOP DETECTED!', recentTimestamps.length, 'refreshes in', TIME_WINDOW_MS/1000, 'seconds');
        localStorage.removeItem('refresh_timestamps');
        
        // Create visual error message
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'fixed';
        errorDiv.style.top = '0';
        errorDiv.style.left = '0';
        errorDiv.style.right = '0';
        errorDiv.style.bottom = '0';
        errorDiv.style.backgroundColor = 'rgba(0,0,0,0.9)';
        errorDiv.style.color = '#fff';
        errorDiv.style.padding = '20px';
        errorDiv.style.zIndex = '999999';
        errorDiv.style.fontFamily = 'monospace';
        errorDiv.style.fontSize = '14px';
        errorDiv.style.overflow = 'auto';
        
        errorDiv.innerHTML = `
          <h1 style="color: #f33; text-align: center;">Refresh Loop Detected</h1>
          <p>The page has refreshed ${recentTimestamps.length} times in the last ${TIME_WINDOW_MS/1000} seconds.</p>
          <h2>Technical Information:</h2>
          <ul>
            <li>URL: ${window.location.href}</li>
            <li>User Agent: ${navigator.userAgent}</li>
            <li>Time: ${new Date().toISOString()}</li>
          </ul>
          <h2>Diagnostic Steps:</h2>
          <ol>
            <li>Unregister service workers</li>
            <li>Clear browser cache and cookies</li>
            <li>Check for automatic redirects in HTML or JS</li>
            <li>Examine network requests for redirect chains</li>
          </ol>
          <div style="text-align: center; margin-top: 20px;">
            <button id="sw-unregister" style="background: #900; color: white; border: none; padding: 10px 15px; margin-right: 10px; cursor: pointer;">
              Unregister Service Workers
            </button>
            <button id="clear-site-data" style="background: #333; color: white; border: none; padding: 10px 15px; cursor: pointer;">
              Clear Site Data
            </button>
          </div>
          <pre style="background: #111; padding: 10px; margin-top: 20px; max-height: 200px; overflow: auto;">
  Location: ${JSON.stringify(window.location, null, 2)}
  Refresh Timestamps: ${JSON.stringify(recentTimestamps, null, 2)}
          </pre>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Add event listeners to buttons
        setTimeout(() => {
          document.getElementById('sw-unregister').addEventListener('click', () => {
            if (navigator.serviceWorker) {
              navigator.serviceWorker.getRegistrations().then(registrations => {
                registrations.forEach(reg => reg.unregister());
                alert(`Unregistered ${registrations.length} service worker(s). Reload the page.`);
              });
            }
          });
          
          document.getElementById('clear-site-data').addEventListener('click', () => {
            localStorage.clear();
            sessionStorage.clear();
            if (window.caches) {
              caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
              });
            }
            alert('Site data cleared. Reload the page.');
          });
        }, 100);
        
        // Prevent service worker registration
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => {
              console.log('[Debug Tool] Unregistering service worker to break refresh loop');
              registration.unregister();
            });
          });
        }
        
        return true; // Loop detected
      }
      
      return false; // No loop detected
    };
    
    // Run on load
    window.addEventListener('load', () => {
      console.log('[Debug Tool] Page loaded');
      
      if (!recordRefresh()) {
        console.log('[Debug Tool] No refresh loop detected');
      }
      
      // Check for resources not loaded
      setTimeout(() => {
        // Check if bundle.js loaded
        const scripts = document.querySelectorAll('script');
        let bundleFound = false;
        
        scripts.forEach(script => {
          if (script.src && script.src.includes('bundle.js')) {
            bundleFound = true;
            console.log('[Debug Tool] Bundle script found:', script.src);
          }
        });
        
        if (!bundleFound) {
          console.error('[Debug Tool] Bundle script not found!');
        }
        
        // Check for other critical resources
        if (document.querySelector('#root')) {
          console.log('[Debug Tool] Root element found');
          if (document.querySelector('#root').children.length === 0) {
            console.warn('[Debug Tool] Root element is empty, React may not have rendered');
          }
        } else {
          console.error('[Debug Tool] Root element not found!');
        }
      }, 1000);
    });
  })();