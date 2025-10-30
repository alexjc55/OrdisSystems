import { useCallback } from 'react';
import { useUTMParams } from './use-utm-params';

// Function to check if analytics should be tracked for current path/user
export function shouldTrackAnalytics(path?: string, userRole?: string): boolean {
  // Block if user is admin or worker
  if (userRole && (userRole === 'admin' || userRole === 'worker')) {
    return false;
  }
  
  // Block if path is an admin route (including localized variants)
  if (path) {
    // Match paths like /admin, /ru/admin, /en/admin, etc. with optional query params or hash
    // Supports any 2-letter locale (optional region code) and handles query/hash params
    const adminPathRegex = /^(?:\/[a-z]{2}(?:-[A-Z]{2})?)?\/admin(?:[/?#]|$)/i;
    if (adminPathRegex.test(path)) {
      return false;
    }
  }
  
  return true;
}

// Types for analytics events
interface PageViewEvent {
  path: string;
  title?: string;
  referrer?: string;
  utmParams?: Record<string, string>; // Add UTM parameters
}

interface PurchaseEvent {
  orderId: string | number;
  value: number;
  currency?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

// Global interfaces for analytics libraries
declare global {
  interface Window {
    ym?: (id: number, method: string, ...args: any[]) => void;
    fbq?: (method: string, event: string, params?: any) => void;
    gtag?: (command: string, ...args: any[]) => void;
    dataLayer?: any[];
  }
}

export function useAnalytics() {
  const { utmParams } = useUTMParams();
  
  // Helper to get Yandex Metrika counter ID
  const getYandexCounterId = useCallback(() => {
    // Try to find counter ID from window._ym_counter or window.yaCounter* globals first
    const windowKeys = Object.keys(window);
    const yaCounterKey = windowKeys.find(key => key.startsWith('yaCounter'));
    if (yaCounterKey) {
      const match = yaCounterKey.match(/yaCounter(\d+)/);
      if (match && match[1]) {
        return Number(match[1]);
      }
    }

    // Try to extract from scripts that contain ym initialization
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      // Look for counter initialization patterns
      if (script.innerHTML.includes('ym(') || script.innerHTML.includes('yaCounter')) {
        const patterns = [
          /ym\((\d+),\s*['"]/,
          /yaCounter(\d+)/,
          /"ym":.*?"(\d+)"/,
          /counter_id.*?['":](\d+)/i
        ];
        
        for (const pattern of patterns) {
          const match = script.innerHTML.match(pattern);
          if (match && match[1]) {
            return Number(match[1]);
          }
        }
      }
    }
    
    // Last resort: try common counter IDs used in development/demo
    const commonIds = [12345678, 87654321]; // Add common demo IDs
    for (const id of commonIds) {
      if (typeof window.ym === 'function') {
        try {
          // Test if this counter ID works (won't throw error if valid)
          window.ym(id, 'getClientID');
          return id;
        } catch {
          continue;
        }
      }
    }
    
    return null;
  }, []);
  
  // Send pageview event to all available analytics services
  const sendPageView = useCallback((event: PageViewEvent) => {
    const { path, title, referrer } = event;
    
    // Use UTM params from event or from hook
    const effectiveUtmParams = event.utmParams || utmParams;
    
    try {
      // Yandex Metrika
      if (typeof window.ym === 'function') {
        const counterId = getYandexCounterId();
        if (counterId) {
          window.ym(counterId, 'hit', path, {
            referer: referrer || document.referrer,
            title: title || document.title,
            params: effectiveUtmParams // Add UTM parameters
          });
          if (import.meta.env.DEV) console.log('[Analytics] Yandex Metrika pageview sent:', path, 'UTM:', effectiveUtmParams, 'Counter:', counterId);
        } else {
          if (import.meta.env.DEV) console.warn('[Analytics] Yandex Metrika counter ID not found - pageview skipped');
        }
      } else {
        if (import.meta.env.DEV) console.warn('[Analytics] Yandex Metrika not available - pageview skipped');
      }
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[Analytics] Yandex Metrika pageview error:', error);
    }

    try {
      // Facebook Pixel
      if (typeof window.fbq === 'function') {
        // Facebook Pixel accepts custom parameters
        window.fbq('track', 'PageView', effectiveUtmParams);
        if (import.meta.env.DEV) console.log('[Analytics] Facebook Pixel pageview sent:', path, 'UTM:', effectiveUtmParams);
      } else {
        if (import.meta.env.DEV) console.warn('[Analytics] Facebook Pixel not available - pageview skipped');
      }
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[Analytics] Facebook Pixel pageview error:', error);
    }

    try {
      // Google Analytics 4
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', {
          page_path: path,
          page_title: title || document.title,
          page_location: window.location.origin + path,
          ...effectiveUtmParams // Add UTM parameters as custom dimensions
        });
        if (import.meta.env.DEV) console.log('[Analytics] Google Analytics pageview sent:', path, 'UTM:', effectiveUtmParams);
      } else {
        if (import.meta.env.DEV) console.warn('[Analytics] Google Analytics not available - pageview skipped');
      }
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[Analytics] Google Analytics pageview error:', error);
    }

    try {
      // Google Tag Manager (alternative approach)
      if (window.dataLayer) {
        window.dataLayer.push({
          event: 'pageview',
          page_path: path,
          page_title: title || document.title,
          page_location: window.location.origin + path,
          ...effectiveUtmParams // Add UTM parameters
        });
        if (import.meta.env.DEV) console.log('[Analytics] GTM dataLayer pageview sent:', path, 'UTM:', effectiveUtmParams);
      } else {
        if (import.meta.env.DEV) console.warn('[Analytics] GTM dataLayer not available - pageview skipped');
      }
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[Analytics] GTM dataLayer pageview error:', error);
    }
  }, [getYandexCounterId, utmParams]);

  // Send purchase conversion event
  const sendPurchase = useCallback((event: PurchaseEvent) => {
    const { orderId, value, currency = 'ILS', items = [] } = event;
    
    try {
      // Yandex Metrika
      if (typeof window.ym === 'function') {
        const counterId = getYandexCounterId();
        if (counterId) {
          // Send goal achievement
          window.ym(counterId, 'reachGoal', 'purchase', {
            order_id: orderId,
            order_price: value,
            currency
          });
          if (import.meta.env.DEV) console.log('[Analytics] Yandex Metrika purchase sent:', { orderId, value, counterId });
        } else {
          if (import.meta.env.DEV) console.warn('[Analytics] Yandex Metrika counter ID not found - purchase skipped');
        }
      } else {
        if (import.meta.env.DEV) console.warn('[Analytics] Yandex Metrika not available - purchase skipped');
      }
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[Analytics] Yandex Metrika purchase error:', error);
    }

    try {
      // Facebook Pixel
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Purchase', {
          value: value,
          currency: currency,
          content_ids: [orderId.toString()],
          content_type: 'product',
          num_items: items.length || 1
        });
        if (import.meta.env.DEV) console.log('[Analytics] Facebook Pixel purchase sent:', { orderId, value });
      } else {
        if (import.meta.env.DEV) console.warn('[Analytics] Facebook Pixel not available - purchase skipped');
      }
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[Analytics] Facebook Pixel purchase error:', error);
    }

    try {
      // Google Analytics 4
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'purchase', {
          transaction_id: orderId.toString(),
          value: value,
          currency: currency,
          items: items.map((item, index) => ({
            item_id: `item_${index}`,
            item_name: item.name,
            quantity: item.quantity,
            price: item.price
          }))
        });
        if (import.meta.env.DEV) console.log('[Analytics] Google Analytics purchase sent:', { orderId, value });
      } else {
        if (import.meta.env.DEV) console.warn('[Analytics] Google Analytics not available - purchase skipped');
      }
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[Analytics] Google Analytics purchase error:', error);
    }

    try {
      // Google Tag Manager (alternative approach)
      if (window.dataLayer) {
        window.dataLayer.push({
          event: 'purchase',
          ecommerce: {
            transaction_id: orderId.toString(),
            value: value,
            currency: currency,
            items: items.map((item, index) => ({
              item_id: `item_${index}`,
              item_name: item.name,
              quantity: item.quantity,
              price: item.price
            }))
          }
        });
        if (import.meta.env.DEV) console.log('[Analytics] GTM dataLayer purchase sent:', { orderId, value });
      } else {
        if (import.meta.env.DEV) console.warn('[Analytics] GTM dataLayer not available - purchase skipped');
      }
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[Analytics] GTM dataLayer purchase error:', error);
    }
  }, [getYandexCounterId]);

  // Send custom goal/event
  const sendGoal = useCallback((goalName: string, params?: any) => {
    try {
      // Yandex Metrika custom goal
      if (typeof window.ym === 'function') {
        const counterId = getYandexCounterId();
        if (counterId) {
          window.ym(counterId, 'reachGoal', goalName, params);
          if (import.meta.env.DEV) console.log('[Analytics] Yandex Metrika goal sent:', goalName, params, 'Counter:', counterId);
        } else {
          if (import.meta.env.DEV) console.warn('[Analytics] Yandex Metrika counter ID not found - goal skipped:', goalName);
        }
      } else {
        if (import.meta.env.DEV) console.warn('[Analytics] Yandex Metrika not available - goal skipped:', goalName);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[Analytics] Yandex Metrika goal error:', error);
    }

    try {
      // Facebook Pixel custom event
      if (typeof window.fbq === 'function') {
        window.fbq('trackCustom', goalName, params);
        if (import.meta.env.DEV) console.log('[Analytics] Facebook Pixel custom event sent:', goalName, params);
      } else {
        if (import.meta.env.DEV) console.warn('[Analytics] Facebook Pixel not available - custom event skipped:', goalName);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[Analytics] Facebook Pixel custom event error:', error);
    }

    try {
      // Google Analytics custom event
      if (typeof window.gtag === 'function') {
        window.gtag('event', goalName, params);
        if (import.meta.env.DEV) console.log('[Analytics] Google Analytics custom event sent:', goalName, params);
      } else {
        if (import.meta.env.DEV) console.warn('[Analytics] Google Analytics not available - custom event skipped:', goalName);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[Analytics] Google Analytics custom event error:', error);
    }
  }, [getYandexCounterId]);

  return {
    sendPageView,
    sendPurchase,
    sendGoal
  };
}