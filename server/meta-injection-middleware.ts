import { Request, Response, NextFunction } from 'express';
import { shouldUseSSR } from './bot-detection';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Simple Meta Tag Injection for Bots
 * Injects dynamic meta tags into HTML for search engines
 * without full React SSR overhead
 */
export function metaInjectionMiddleware() {
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

    // Check if this is a bot
    const userAgent = req.headers['user-agent'];
    const isBot = shouldUseSSR(userAgent, req.query);
    
    console.log(`[Meta Injection] Request: ${req.path}, UA: ${userAgent?.substring(0, 50)}..., Is Bot: ${isBot}`);
    
    if (!isBot) {
      return next(); // Regular user - let normal flow handle it
    }

    try {
      console.log('[Meta Injection] Bot detected:', userAgent);
      console.log('[Meta Injection] Path:', req.path);

      // Read index.html from disk
      const htmlPath = path.resolve(process.cwd(), 'client/index.html');
      let html = await fs.promises.readFile(htmlPath, 'utf-8');

      // Inject additional meta tags based on route
      const injectedMeta = generateMetaTags(req.path, req.query);
      
      // Inject before </head>
      html = html.replace('</head>', `${injectedMeta}\n  </head>`);

      res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
    } catch (error) {
      console.error('[Meta Injection] Error:', error);
      next(error);
    }
  };
}

/**
 * Generate dynamic meta tags based on route
 * Supports path segments: /, /category/:id, /all-products, /en/category/:id, etc.
 */
function generateMetaTags(path: string, query: any): string {
  const tags: string[] = [];

  // Extract language from path (e.g., /en/category/47 -> en)
  const langMatch = path.match(/^\/(en|he|ar)\//);
  const lang = query.lang || (langMatch ? langMatch[1] : 'ru');
  
  // Remove language prefix from path for canonical
  const cleanPath = path.replace(/^\/(en|he|ar)/, '');
  
  // Determine canonical URL based on path
  let canonicalPath = cleanPath || '/';
  
  // Normalize path (remove trailing slash except for root)
  if (canonicalPath !== '/' && canonicalPath.endsWith('/')) {
    canonicalPath = canonicalPath.slice(0, -1);
  }

  // Build full canonical URL with language prefix if needed
  const fullCanonical = lang === 'ru' 
    ? canonicalPath 
    : `/${lang}${canonicalPath}`;

  tags.push(`<!-- Canonical URL for bots -->`);
  tags.push(`<link rel="canonical" href="${fullCanonical}" />`);

  // Language detection
  tags.push(`<meta http-equiv="content-language" content="${lang}" />`);

  // Add structured data hint
  tags.push(`<!-- Page rendered for bot: ${new Date().toISOString()} -->`);

  return tags.join('\n    ');
}
