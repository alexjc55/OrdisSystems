import { Request, Response, NextFunction } from 'express';
import { shouldUseSSR } from './bot-detection';

/**
 * Simple Meta Tag Injection for Bots
 * Injects dynamic meta tags into HTML for search engines
 * without full React SSR overhead
 */
export function metaInjectionMiddleware(getHTML: () => Promise<string>) {
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
    if (!shouldUseSSR(userAgent, req.query)) {
      return next(); // Regular user - let normal flow handle it
    }

    try {
      console.log('[Meta Injection] Bot detected:', userAgent);
      console.log('[Meta Injection] Path:', req.path);

      // Get base HTML
      let html = await getHTML();

      // Inject additional meta tags based on route
      const injectedMeta = generateMetaTags(req.path, req.query);
      
      // Inject before </head>
      html = html.replace('</head>', `${injectedMeta}</head>`);

      res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
    } catch (error) {
      console.error('[Meta Injection] Error:', error);
      next(error);
    }
  };
}

/**
 * Generate dynamic meta tags based on route
 */
function generateMetaTags(path: string, query: any): string {
  const tags: string[] = [];

  // Product page detection
  if (query.product) {
    tags.push(`<!-- Enhanced meta for product page -->`);
    tags.push(`<meta name="product-id" content="${query.product}" />`);
  }

  // Category page detection
  if (query.category) {
    tags.push(`<!-- Enhanced meta for category page -->`);
    tags.push(`<meta name="category-id" content="${query.category}" />`);
  }

  // Language detection
  const lang = query.lang || 'ru';
  tags.push(`<meta http-equiv="content-language" content="${lang}" />`);

  // Add structured data hint
  tags.push(`<!-- Page rendered for bot: ${new Date().toISOString()} -->`);

  return tags.join('\n    ');
}
