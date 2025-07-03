import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/i18n";
import { initializeTheme, forceApplyOrangeTheme } from "./lib/theme-system";

// FORCE CACHE CLEAR AND RELOAD - v3.44.16
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    cacheNames.forEach(cacheName => {
      console.log('Clearing cache:', cacheName);
      caches.delete(cacheName);
    });
  });
}

// Force hard reload if we detect old cached version
setTimeout(() => {
  // Check if old dropdown components are still cached
  const dropdownElements = document.querySelectorAll('[data-radix-dropdown-menu-content]');
  if (dropdownElements.length > 0) {
    console.log('Old dropdown components detected, forcing hard reload...');
    window.location.reload();
  }
}, 2000);

// Add global function for manual cache clearing
(window as any).clearAllCaches = async () => {
  console.log('🧹 Clearing all caches manually...');
  
  // Clear Service Worker caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('✅ Service Worker caches cleared');
  }
  
  // Clear localStorage
  localStorage.clear();
  console.log('✅ localStorage cleared');
  
  // Clear sessionStorage
  sessionStorage.clear();
  console.log('✅ sessionStorage cleared');
  
  // Unregister service worker
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));
    console.log('✅ Service Workers unregistered');
  }
  
  // Force hard reload
  console.log('🔄 Forcing hard reload...');
  window.location.reload();
};

console.log('🔧 DEBUG: Type clearAllCaches() in console to force clear all caches');

// Initialize theme system
initializeTheme();
// Force apply orange colors to override any black theme colors
forceApplyOrangeTheme();

// Global error suppression for ResizeObserver
const resizeObserverErrDiv = document.getElementById('webpack-dev-server-client-overlay-div');
const resizeObserverErrText = 'ResizeObserver loop completed with undelivered notifications';

// Suppress ResizeObserver errors completely
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes(resizeObserverErrText)) {
    event.stopImmediatePropagation();
    event.preventDefault();
    return false;
  }
  
  console.error('Runtime error:', {
    message: event.message,
    filename: event.filename,
    line: event.lineno,
    column: event.colno,
    stack: event.error?.stack
  });
});

// Also handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes(resizeObserverErrText)) {
    event.preventDefault();
    return false;
  }
});

// Suppress ResizeObserver errors in console completely
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = typeof args[0] === 'string' ? args[0] : (args[0]?.message || '');
  if (message.includes('ResizeObserver loop completed')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Override ResizeObserver to catch errors at source
const OriginalResizeObserver = window.ResizeObserver;
window.ResizeObserver = class extends OriginalResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    super((entries, observer) => {
      try {
        callback(entries, observer);
      } catch (error: any) {
        if (error.message && error.message.includes('ResizeObserver loop completed')) {
          // Silently ignore ResizeObserver loop errors
          return;
        }
        throw error;
      }
    });
  }
};

createRoot(document.getElementById("root")!).render(<App />);
