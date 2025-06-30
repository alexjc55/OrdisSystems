import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/i18n";
import { initializeTheme, forceApplyOrangeTheme } from "./lib/theme-system";

// Initialize theme system
initializeTheme();
// Force apply orange colors to override any black theme colors
forceApplyOrangeTheme();

// Global error handling for debugging runtime errors
window.addEventListener('error', (event) => {
  // Suppress ResizeObserver errors as they are harmless but annoying
  if (event.message.includes('ResizeObserver loop completed with undelivered notifications')) {
    event.preventDefault();
    return;
  }
  
  console.error('Runtime error:', {
    message: event.message,
    filename: event.filename,
    line: event.lineno,
    column: event.colno,
    stack: event.error?.stack
  });
});

// Suppress ResizeObserver errors in console
const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('ResizeObserver loop completed')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

createRoot(document.getElementById("root")!).render(<App />);
