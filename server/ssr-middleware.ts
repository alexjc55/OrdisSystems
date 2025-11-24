import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { shouldUseSSR } from './bot-detection';

/**
 * SSR Middleware for Bots and Crawlers
 * Renders full HTML for search engines and social media bots
 * Passes through to SPA for regular users
 */
export function ssrMiddleware(isDevelopment: boolean) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only handle GET requests for HTML pages
    if (req.method !== 'GET') {
      return next();
    }

    // Skip API routes and static assets
    if (
      req.path.startsWith('/api/') ||
      req.path.startsWith('/uploads/') ||
      req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json|xml|txt)$/)
    ) {
      return next();
    }

    // Check if SSR should be used (bot detection or ?_ssr=1)
    const userAgent = req.headers['user-agent'];
    if (!shouldUseSSR(userAgent, req.query)) {
      return next(); // Regular user - let SPA handle it
    }

    try {
      console.log('[SSR] Bot detected:', userAgent);
      console.log('[SSR] Rendering page:', req.originalUrl);

      // In development mode, we need to use Vite's SSR loading
      // In production, we would load the pre-built SSR bundle
      if (isDevelopment) {
        // For dev mode - just send SPA with note
        // Full SSR in dev requires complex Vite SSR setup
        console.log('[SSR] Dev mode - SSR not fully implemented yet, serving SPA');
        return next();
      }

      // Production SSR would go here
      // For now, pass through to SPA
      return next();
    } catch (error) {
      console.error('[SSR] Error during SSR:', error);
      // On error, fall back to SPA
      return next();
    }
  };
}

/**
 * Development SSR Helper (simplified)
 * In development, we can add a simple meta tag injection
 * without full SSR setup
 */
export function devSSRHelper() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userAgent = req.headers['user-agent'];
    
    // Only for bots in dev mode
    if (!shouldUseSSR(userAgent, req.query)) {
      return next();
    }

    // Let normal flow continue but log for debugging
    console.log('[SSR Dev] Bot detected - serving enhanced SPA:', userAgent);
    next();
  };
}
