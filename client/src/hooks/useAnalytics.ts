import { useCallback } from 'react';

// Types for analytics events
interface PageViewEvent {
  path: string;
  title?: string;
  referrer?: string;
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
  // Send pageview event to all available analytics services
  const sendPageView = useCallback((event: PageViewEvent) => {
    const { path, title, referrer } = event;
    
    try {
      // Yandex Metrika
      if (typeof window.ym === 'function') {
        // Find Yandex Metrika counter ID from DOM
        const ymScript = document.querySelector('script[src*="mc.yandex.ru"]');
        if (ymScript) {
          // Try to extract counter ID from existing ym calls or counter elements
          const ymCounterElement = document.querySelector('[id^="yandex_metrika_"]');
          if (ymCounterElement) {
            const counterId = ymCounterElement.id.replace('yandex_metrika_', '');
            if (counterId && !isNaN(Number(counterId))) {
              window.ym(Number(counterId), 'hit', path, {
                referer: referrer || document.referrer,
                title: title || document.title
              });
              console.log('[Analytics] Yandex Metrika pageview sent:', path);
            }
          } else {
            // Fallback: try to find counter ID in ym initialization code
            const scripts = document.getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) {
              const script = scripts[i];
              if (script.innerHTML.includes('ym(')) {
                const match = script.innerHTML.match(/ym\((\d+),/);
                if (match && match[1]) {
                  const counterId = Number(match[1]);
                  window.ym(counterId, 'hit', path, {
                    referer: referrer || document.referrer,
                    title: title || document.title
                  });
                  console.log('[Analytics] Yandex Metrika pageview sent:', path);
                  break;
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('[Analytics] Yandex Metrika pageview error:', error);
    }

    try {
      // Facebook Pixel
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'PageView');
        console.log('[Analytics] Facebook Pixel pageview sent:', path);
      }
    } catch (error) {
      console.warn('[Analytics] Facebook Pixel pageview error:', error);
    }

    try {
      // Google Analytics 4
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', {
          page_path: path,
          page_title: title || document.title,
          page_location: window.location.origin + path
        });
        console.log('[Analytics] Google Analytics pageview sent:', path);
      }
    } catch (error) {
      console.warn('[Analytics] Google Analytics pageview error:', error);
    }

    try {
      // Google Tag Manager (alternative approach)
      if (window.dataLayer) {
        window.dataLayer.push({
          event: 'pageview',
          page_path: path,
          page_title: title || document.title,
          page_location: window.location.origin + path
        });
        console.log('[Analytics] GTM dataLayer pageview sent:', path);
      }
    } catch (error) {
      console.warn('[Analytics] GTM dataLayer pageview error:', error);
    }
  }, []);

  // Send purchase conversion event
  const sendPurchase = useCallback((event: PurchaseEvent) => {
    const { orderId, value, currency = 'ILS', items = [] } = event;
    
    try {
      // Yandex Metrika
      if (typeof window.ym === 'function') {
        // Find counter ID same way as in pageview
        const ymScript = document.querySelector('script[src*="mc.yandex.ru"]');
        if (ymScript) {
          const ymCounterElement = document.querySelector('[id^="yandex_metrika_"]');
          if (ymCounterElement) {
            const counterId = ymCounterElement.id.replace('yandex_metrika_', '');
            if (counterId && !isNaN(Number(counterId))) {
              // Send goal achievement
              window.ym(Number(counterId), 'reachGoal', 'purchase', {
                order_id: orderId,
                order_price: value,
                currency
              });
              console.log('[Analytics] Yandex Metrika purchase sent:', { orderId, value });
            }
          } else {
            // Fallback: find counter ID in scripts
            const scripts = document.getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) {
              const script = scripts[i];
              if (script.innerHTML.includes('ym(')) {
                const match = script.innerHTML.match(/ym\((\d+),/);
                if (match && match[1]) {
                  const counterId = Number(match[1]);
                  window.ym(counterId, 'reachGoal', 'purchase', {
                    order_id: orderId,
                    order_price: value,
                    currency
                  });
                  console.log('[Analytics] Yandex Metrika purchase sent:', { orderId, value });
                  break;
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('[Analytics] Yandex Metrika purchase error:', error);
    }

    try {
      // Facebook Pixel
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Purchase', {
          value: value,
          currency: currency,
          content_ids: [orderId],
          content_type: 'product',
          num_items: items.length || 1
        });
        console.log('[Analytics] Facebook Pixel purchase sent:', { orderId, value });
      }
    } catch (error) {
      console.warn('[Analytics] Facebook Pixel purchase error:', error);
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
        console.log('[Analytics] Google Analytics purchase sent:', { orderId, value });
      }
    } catch (error) {
      console.warn('[Analytics] Google Analytics purchase error:', error);
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
        console.log('[Analytics] GTM dataLayer purchase sent:', { orderId, value });
      }
    } catch (error) {
      console.warn('[Analytics] GTM dataLayer purchase error:', error);
    }
  }, []);

  // Send custom goal/event
  const sendGoal = useCallback((goalName: string, params?: any) => {
    try {
      // Yandex Metrika custom goal
      if (typeof window.ym === 'function') {
        const ymScript = document.querySelector('script[src*="mc.yandex.ru"]');
        if (ymScript) {
          const ymCounterElement = document.querySelector('[id^="yandex_metrika_"]');
          if (ymCounterElement) {
            const counterId = ymCounterElement.id.replace('yandex_metrika_', '');
            if (counterId && !isNaN(Number(counterId))) {
              window.ym(Number(counterId), 'reachGoal', goalName, params);
              console.log('[Analytics] Yandex Metrika goal sent:', goalName, params);
            }
          } else {
            const scripts = document.getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) {
              const script = scripts[i];
              if (script.innerHTML.includes('ym(')) {
                const match = script.innerHTML.match(/ym\((\d+),/);
                if (match && match[1]) {
                  const counterId = Number(match[1]);
                  window.ym(counterId, 'reachGoal', goalName, params);
                  console.log('[Analytics] Yandex Metrika goal sent:', goalName, params);
                  break;
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('[Analytics] Yandex Metrika goal error:', error);
    }

    try {
      // Facebook Pixel custom event
      if (typeof window.fbq === 'function') {
        window.fbq('trackCustom', goalName, params);
        console.log('[Analytics] Facebook Pixel custom event sent:', goalName, params);
      }
    } catch (error) {
      console.warn('[Analytics] Facebook Pixel custom event error:', error);
    }

    try {
      // Google Analytics custom event
      if (typeof window.gtag === 'function') {
        window.gtag('event', goalName, params);
        console.log('[Analytics] Google Analytics custom event sent:', goalName, params);
      }
    } catch (error) {
      console.warn('[Analytics] Google Analytics custom event error:', error);
    }
  }, []);

  return {
    sendPageView,
    sendPurchase,
    sendGoal
  };
}