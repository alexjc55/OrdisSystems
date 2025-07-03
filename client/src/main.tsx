import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/i18n";
import { initializeTheme, forceApplyOrangeTheme } from "./lib/theme-system";

// Clear all caches for debugging dropdown issue
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    cacheNames.forEach(cacheName => {
      console.log('Clearing cache:', cacheName);
      caches.delete(cacheName);
    });
  });
}

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
