import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/i18n";
import { initializeTheme, forceApplyOrangeTheme } from "./lib/theme-system";
import i18n from "./lib/i18n";

// Initialize theme system
initializeTheme();
// Force apply orange colors to override any black theme colors
forceApplyOrangeTheme();

// Update manifest link based on language
function updateManifestLink() {
  const currentLanguage = i18n.language || 'ru';
  let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
  
  if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    document.head.appendChild(manifestLink);
  }
  
  manifestLink.href = `/manifest.json?lang=${currentLanguage}`;
}

// Update manifest when language changes
i18n.on('languageChanged', updateManifestLink);

// Initial manifest update
updateManifestLink();

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

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
