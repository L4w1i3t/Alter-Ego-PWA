(function() {
    const REFRESH_THRESHOLD = 5; // Number of refreshes within time window to consider a loop
    const TIME_WINDOW_MS = 10000; // 10 seconds
    
    // Get refresh timestamps from localStorage
    const getRefreshTimestamps = () => {
      try {
        const stored = localStorage.getItem('refresh_timestamps');
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        console.error('Error reading refresh timestamps:', e);
        return [];
      }
    };
    
    // Save refresh timestamps to localStorage
    const saveRefreshTimestamps = (timestamps) => {
      try {
        localStorage.setItem('refresh_timestamps', JSON.stringify(timestamps));
      } catch (e) {
        console.error('Error saving refresh timestamps:', e);
      }
    };
    
    // Record current refresh
    const recordRefresh = () => {
      const now = Date.now();
      const timestamps = getRefreshTimestamps();
      
      // Add current timestamp
      timestamps.push(now);
      
      // Remove timestamps outside the time window
      const recentTimestamps = timestamps.filter(ts => (now - ts) < TIME_WINDOW_MS);
      
      // Save updated timestamps
      saveRefreshTimestamps(recentTimestamps);
      
      // Check for refresh loop
      if (recentTimestamps.length >= REFRESH_THRESHOLD) {
        // We're in a refresh loop - stop it and show a warning
        console.error('REFRESH LOOP DETECTED! Stopping automatic refresh.');
        
        // Clear refresh timestamps to break the cycle
        localStorage.removeItem('refresh_timestamps');
        
        // Show alert after short delay to ensure page has time to load
        setTimeout(() => {
          alert(`Refresh loop detected! The page has refreshed ${recentTimestamps.length} times in the last ${TIME_WINDOW_MS/1000} seconds. This has been stopped to prevent further looping. Check the console for more details.`);
        }, 500);
        
        // Log possible causes
        console.warn(`
  Possible causes of refresh loops:
  1. Service worker registration issues
  2. HTML meta refresh tags
  3. JavaScript window.location.reload() calls
  4. Browser extensions
  5. Server-side redirects
  
  Try:
  - Checking your service worker
  - Disabling browser extensions
  - Clearing application cache
  - Checking for automatic redirects
  `);
        
        // Prevent further refresh attempts from service worker
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => {
              console.log('Unregistering service worker to break refresh loop');
              registration.unregister();
            });
          });
        }
        
        return true; // Loop detected
      }
      
      return false; // No loop detected
    };
    
    // Run when page loads
    window.addEventListener('load', () => {
      // Record this refresh, but only log if no loop is detected
      if (!recordRefresh()) {
        console.log('Page loaded normally, no refresh loop detected');
      }
    });
  })();