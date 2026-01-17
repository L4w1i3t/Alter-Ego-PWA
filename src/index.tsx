import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import { ApiProvider } from './context/ApiContext';
import { initializePWA } from './utils/pwaUtils';
import { devToolsBlocker } from './utils/devToolsBlocker';
import { initializeMemorySystem } from './memory';
import { loadSettings } from './utils/storageUtils';
// advancedSecurity is intentionally not imported by default to avoid UX harm

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
// Immersive mode: optional opt-in for desktop-like feel (soft devtools blocking)
const immersiveEnvFlag =
  (process.env as any).REACT_APP_IMMERSIVE_MODE === 'true';
const immersiveLocalFlag =
  typeof localStorage !== 'undefined' &&
  localStorage.getItem('alterEgo_immersiveMode') === 'true';
const immersiveModeEnabled = immersiveEnvFlag || immersiveLocalFlag;

// Initialize PWA installation capabilities
initializePWA();

// Initialize memory system (non-blocking)
// This triggers migration from localStorage and warms caches
const settings = loadSettings();
const activePersona = settings.activeCharacter || 'ALTER EGO';
initializeMemorySystem([activePersona]).catch(error => {
  console.error('Memory system initialization failed:', error);
});

// Initialize optional immersive mode in production (disabled by default)
if (isProduction && immersiveModeEnabled) {
  // Soft, mobile-friendly warnings only; no aggressive anti-debug
  try {
    devToolsBlocker.initializeBlocking();
    console.log('Immersive mode enabled: soft devtools warnings active');
  } catch (e) {
    console.warn('Failed to initialize immersive mode:', e);
  }
  // Note: advancedSecurity is intentionally NOT initialized by default, as it can harm UX.
} else {
  console.log('Security features disabled (no immersive mode)');
}

// Register service worker with proper error handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = '/service-worker.js';

    if (isDevelopment) {
      console.log(
        'Running in development mode - using passive service worker registration'
      );

      // Check if there's an existing service worker first
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration) {
          console.log(
            'Existing service worker found, using it without update handling'
          );
        } else {
          // Only register if we don't already have one
          navigator.serviceWorker
            .register(swUrl, {
              // Add scope to limit where the service worker operates
              scope: '/',
            })
            .then(registration => {
              console.log(
                'Service Worker registered in dev mode:',
                registration
              );

              // Listen for specific messages from service worker in dev mode
              navigator.serviceWorker.addEventListener('message', event => {
                // Ignore regular update messages in development
                if (
                  event.data &&
                  event.data.type === 'NEW_VERSION' &&
                  !event.data.manual
                ) {
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
      navigator.serviceWorker
        .register(swUrl)
        .then(registration => {
          console.log('Service Worker registered:', registration);

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('New content is available - auto-updating...');
                    // Auto-update happens automatically, no user interaction needed
                  } else {
                    console.log('Content is cached for offline use.');
                  }
                }
              };
            }
          };

          // Additional listener for direct messages from service worker
          navigator.serviceWorker.addEventListener('message', event => {
            if (
              event.data &&
              event.data.type === 'NEW_VERSION' &&
              event.data.manual
            ) {
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
