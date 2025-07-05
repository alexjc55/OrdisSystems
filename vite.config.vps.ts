import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import path from "path";

// VPS-compatible directory resolution
const getCurrentDir = () => {
  // Try import.meta.dirname first (Node.js 20.11+)
  if (typeof import.meta !== 'undefined' && import.meta.dirname) {
    return import.meta.dirname;
  }
  
  // Fallback for older Node.js versions on VPS
  return path.dirname(fileURLToPath(import.meta.url));
};

const currentDir = getCurrentDir();

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: "0.0.0.0",
    hmr: { port: 5173 },
  },
  resolve: {
    alias: {
      "@": path.resolve(currentDir, "client", "src"),
      "@shared": path.resolve(currentDir, "shared"),
      "@assets": path.resolve(currentDir, "attached_assets"),
    },
  },
  root: path.resolve(currentDir, "client"),
  build: {
    outDir: path.resolve(currentDir, "dist/public"),
    emptyOutDir: true,
  },
});