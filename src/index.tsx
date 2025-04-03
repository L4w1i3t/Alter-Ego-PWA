import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import { ApiProvider } from './context/ApiContext';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Register service worker with proper error handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = '/service-worker.js';
    
    if (isDevelopment) {
      console.log('Running in development mode - using passive service worker registration');
      
      // Check if there's an existing service worker first
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration) {
          console.log('Existing service worker found, using it without update handling');
        } else {
          // Only register if we don't already have one
          navigator.serviceWorker.register(swUrl, { 
            // Add scope to limit where the service worker operates
            scope: '/' 
          })
            .then(registration => {
              console.log('Service Worker registered in dev mode:', registration);
              
              // Listen for specific messages from service worker in dev mode
              navigator.serviceWorker.addEventListener('message', event => {
                // Ignore regular update messages in development
                if (event.data && event.data.type === 'NEW_VERSION' && !event.data.manual) {
                  console.log('Ignoring automatic update in dev mode');
                  // Don't refresh or show notification
                }
              });
            })
            .catch(error => {
              console.error('Service Worker registration failed:', error);
            });
        }
      });
    } else {
      // Production mode - normal registration with update handling
      navigator.serviceWorker.register(swUrl)
        .then(registration => {
          console.log('Service Worker registered:', registration);
          
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('New content is available; please refresh.');
                    
                    // Existing notification code is good - no changes needed
                    const updateNotification = document.createElement('div');
                    updateNotification.style.cssText = 
                      'position:fixed;bottom:20px;right:20px;background:#4CAF50;color:white;' +
                      'padding:16px;border-radius:4px;box-shadow:0 2px 5px rgba(0,0,0,0.3);z-index:1000;';
                    updateNotification.innerHTML = 
                      'New version available! <button id="update-btn" style="margin-left:8px;padding:5px">Update</button>';
                    document.body.appendChild(updateNotification);
                    
                    document.getElementById('update-btn')?.addEventListener('click', () => {
                      window.location.reload();
                    });
                  } else {
                    console.log('Content is cached for offline use.');
                  }
                }
              };
            }
          };
          
          // Additional listener for direct messages from service worker
          navigator.serviceWorker.addEventListener('message', event => {
            if (event.data && event.data.type === 'NEW_VERSION' && event.data.manual) {
              console.log(`Manual update available (v${event.data.version})`);
              // Use your existing notification UI here
            }
          });
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  });
}

// Get the root element
const rootElement = document.getElementById('root');

// Make sure the element exists
if (!rootElement) {
  throw new Error('Root element not found in the document');
}

// Disable StrictMode in development to prevent double rendering
const root = createRoot(rootElement);

// Remove StrictMode in development for faster initial rendering
if (isDevelopment) {
  root.render(
    <ApiProvider>
      <App />
    </ApiProvider>
  );
} else {
  root.render(
    <React.StrictMode>
      <ApiProvider>
        <App />
      </ApiProvider>
    </React.StrictMode>
  );
}