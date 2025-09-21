import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAnalytics } from '@/hooks/useAnalytics';

interface AnalyticsTrackerProps {
  /**
   * Enable debug logging for analytics events
   * @default false
   */
  debug?: boolean;
  
  /**
   * Delay before sending pageview events (in milliseconds)
   * This allows time for page title and other elements to load
   * @default 100
   */
  delay?: number;
}

/**
 * AnalyticsTracker component that automatically tracks route changes
 * and sends virtual pageview events to all available analytics services
 * (Yandex Metrika, Facebook Pixel, Google Analytics)
 */
export function AnalyticsTracker({ debug = false, delay = 100 }: AnalyticsTrackerProps) {
  const [location] = useLocation();
  const { sendPageView } = useAnalytics();
  const previousLocation = useRef<string | null>(null);
  const isInitialLoad = useRef(true);
  
  useEffect(() => {
    // Skip analytics on initial page load to avoid duplicate events
    // (analytics scripts usually track the initial page load automatically)
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      previousLocation.current = location;
      if (debug) {
        console.log('[AnalyticsTracker] Initial page load, skipping analytics:', location);
      }
      return;
    }

    // Only send analytics if location actually changed
    if (previousLocation.current === location) {
      return;
    }

    if (debug) {
      console.log('[AnalyticsTracker] Route change detected:', {
        from: previousLocation.current,
        to: location
      });
    }

    // Delay sending analytics to allow page content to load and title to update
    const timeoutId = setTimeout(() => {
      try {
        // Send pageview event to all available analytics services
        sendPageView({
          path: location,
          title: document.title,
          referrer: previousLocation.current || undefined
        });
        
        if (debug) {
          console.log('[AnalyticsTracker] Analytics event sent:', {
            path: location,
            title: document.title,
            referrer: previousLocation.current
          });
        }
      } catch (error) {
        console.error('[AnalyticsTracker] Error sending analytics:', error);
      }
    }, delay);

    // Update previous location
    previousLocation.current = location;

    // Cleanup timeout if component unmounts or location changes again
    return () => clearTimeout(timeoutId);
  }, [location, sendPageView, debug, delay]);

  // This component doesn't render anything visible
  return null;
}