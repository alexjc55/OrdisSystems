/**
 * Bot Detection Utility
 * Detects search engine crawlers and social media bots for SSR
 */

const BOT_USER_AGENTS = [
  // Google
  'Googlebot',
  'Google-InspectionTool',
  'GoogleOther',
  'Google-Extended',
  
  // Bing
  'bingbot',
  'BingPreview',
  'msnbot',
  
  // Yandex
  'YandexBot',
  'YandexImages',
  'YandexMobileBot',
  
  // Social Media
  'facebookexternalhit',
  'FacebookBot',
  'facebookcatalog',
  'Facebot',
  'Twitterbot',
  'TelegramBot',
  'LinkedInBot',
  'WhatsApp',
  'Slackbot',
  'SkypeUriPreview',
  
  // Other Search Engines
  'DuckDuckBot',
  'Baiduspider',
  'Sogou',
  'Exabot',
  
  // SEO Tools
  'Ahrefs',
  'Semrush',
  'rogerbot',     // Moz SEO tool
  'dotbot',       // Moz SEO tool
  'Screaming Frog',
  'SiteAuditBot'
];

/**
 * Check if the request is from a bot/crawler
 * @param userAgent - User-Agent header from request
 * @returns true if bot detected, false otherwise
 */
export function isBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  
  const ua = userAgent.toLowerCase();
  
  // Check against known bot user agents
  return BOT_USER_AGENTS.some(botPattern => 
    ua.includes(botPattern.toLowerCase())
  );
}

/**
 * Check if SSR is explicitly requested via query parameter
 * Useful for testing SSR without changing User-Agent
 * @param query - Query parameters from request
 * @returns true if ?_ssr=1 is present
 */
export function isSSRRequested(query: any): boolean {
  return query._ssr === '1' || query._ssr === 'true';
}

/**
 * Determine if SSR should be used for this request
 * @param userAgent - User-Agent header
 * @param query - Query parameters
 * @returns true if SSR should be used
 */
export function shouldUseSSR(userAgent: string | undefined, query: any = {}): boolean {
  return isBot(userAgent) || isSSRRequested(query);
}
