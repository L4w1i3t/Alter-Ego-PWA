// Debug script to catch infinite refresh cycles
(function() {
    const startTime = Date.now();
    const reloadHistory = JSON.parse(localStorage.getItem('reloadHistory') || '[]');
    
    // Add this page load to the history
    reloadHistory.push(startTime);
    
    // Only keep the last 10 entries
    if (reloadHistory.length > 10) {
      reloadHistory.shift();
    }
    
    localStorage.setItem('reloadHistory', JSON.stringify(reloadHistory));
    
    // Check for rapid reloads (less than 2 seconds apart)
    if (reloadHistory.length >= 3) {
      const lastThreeLoads = reloadHistory.slice(-3);
      const tooFast = lastThreeLoads.every((time, i, arr) => {
        if (i === 0) return true;
        return (time - arr[i-1]) < 2000; // Less than 2 seconds
      });
      
      if (tooFast) {
        // Emergency break for infinite refresh cycle
        console.error('INFINITE REFRESH DETECTED! Breaking the cycle...');
        // Unregister service workers
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            for (let registration of registrations) {
              registration.unregister();
              console.log('Emergency: ServiceWorker unregistered to stop refresh cycle');
            }
          });
        }
        
        // Show diagnostic info
        document.body.innerHTML = `
          <div style="padding: 20px; font-family: monospace; color: #0f0; background: #000;">
            <h1>Infinite Refresh Cycle Detected</h1>
            <p>The page was reloading too rapidly, so we stopped it.</p>
            <p>Reload timestamps (last 10): ${reloadHistory.map(t => new Date(t).toISOString()).join('<br>')}</p>
            <p>Service workers have been unregistered to prevent further issues.</p>
            <button onclick="localStorage.removeItem('reloadHistory'); location.reload()">
              Clear History & Try Again
            </button>
          </div>
        `;
        
        // Prevent any script loading that might cause another refresh
        window.stop();
      }
    }
  })();