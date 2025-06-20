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
  console.error('Runtime error:', {
    message: event.message,
    filename: event.filename,
    line: event.lineno,
    column: event.colno,
    stack: event.error?.stack
  });
});

createRoot(document.getElementById("root")!).render(<App />);
