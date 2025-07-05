import { fileURLToPath } from "url";
import path from "path";

/**
 * Cross-platform directory resolver
 * Works on both Replit (Node.js 20.18+) and VPS (Node.js 18+)
 */
export function getCurrentDir(importMetaUrl: string): string {
  // Try import.meta.dirname first (Node.js 20.11+)
  if (typeof import.meta !== 'undefined' && import.meta.dirname) {
    return import.meta.dirname;
  }
  
  // Fallback for older Node.js versions
  return path.dirname(fileURLToPath(importMetaUrl));
}

/**
 * Safe path resolution for client template
 */
export function getClientTemplatePath(importMetaUrl: string): string {
  const currentDir = getCurrentDir(importMetaUrl);
  return path.resolve(currentDir, "..", "client", "index.html");
}

/**
 * Safe path resolution for dist directory
 */
export function getDistPath(importMetaUrl: string): string {
  const currentDir = getCurrentDir(importMetaUrl);
  return path.resolve(currentDir, "public");
}

/**
 * Safe path resolution for project root
 */
export function getProjectRoot(importMetaUrl: string): string {
  const currentDir = getCurrentDir(importMetaUrl);
  return currentDir;
}