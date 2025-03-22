import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import { ApiProvider } from './context/ApiContext';

// Register service worker with ability to disable
const ENABLE_SERVICE_WORKER = false; // Set to false temporarily to debug refresh issues

if ('serviceWorker' in navigator && ENABLE_SERVICE_WORKER) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Error during service worker registration:', error);
      });
  });
} else if ('serviceWorker' in navigator && !ENABLE_SERVICE_WORKER) {
  // Unregister any existing service workers to stop the refresh cycle
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (let registration of registrations) {
      registration.unregister();
      console.log('ServiceWorker unregistered for debugging');
    }
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