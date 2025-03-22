import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import { ApiProvider } from './context/ApiContext';

// Register service worker with proper error handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Use a path relative to the origin to ensure consistency
    const swUrl = `${window.location.origin}/service-worker.js`;
    
    navigator.serviceWorker.register(swUrl)
      .then(registration => {
        console.log('ServiceWorker registration successful with scope:', registration.scope);
        
        // Handle updates more gracefully
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('New content is available; please refresh.');
                  // Optionally show a notification to the user instead of auto-refreshing
                  if (confirm('New version available! Click OK to update.')) {
                    window.location.reload();
                  }
                } else {
                  console.log('Content is cached for offline use.');
                }
              }
            };
          }
        };
      })
      .catch(error => {
        console.error('Error during service worker registration:', error);
      });
  });
}

// Get the root element
const rootElement = document.getElementById('root');

// Make sure the element exists
if (!rootElement) {
  throw new Error('Root element not found in the document');
}

// Create a root
const root = createRoot(rootElement);

// Render the app
root.render(
  <React.StrictMode>
    <ApiProvider>
      <App />
    </ApiProvider>
  </React.StrictMode>
);