// Generate UUID using browser crypto API or fallback
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// UTM parameter types
interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

interface SessionData extends UTMParams {
  id: string;
  firstSeenAt: string;
  lastSeenAt: string;
  referrer?: string;
  landingPath?: string;
  device?: string;
  language?: string;
}

interface EventData {
  productId?: number;
  categoryId?: number;
  orderId?: number;
  value?: number;
  quantity?: number;
  searchTerm?: string;
  [key: string]: any;
}

// Session storage key
const SESSION_KEY = 'analytics_session';
const OFFLINE_EVENTS_KEY = 'analytics_offline_events';

class Analytics {
  private sessionData: SessionData | null = null;
  private offlineEvents: Array<{ type: string; eventData: EventData; timestamp: string }> = [];

  constructor() {
    this.initializeSession();
    this.loadOfflineEvents();
  }

  /**
   * Initialize analytics session with UTM parameter capture
   */
  private initializeSession(): void {
    try {
      // Try to load existing session
      const existingSession = localStorage.getItem(SESSION_KEY);
      
      if (existingSession) {
        this.sessionData = JSON.parse(existingSession);
        // Update last seen timestamp
        if (this.sessionData) {
          this.sessionData.lastSeenAt = new Date().toISOString();
          this.saveSession();
        }
      } else {
        // Create new session
        this.sessionData = {
          id: generateUUID(),
          firstSeenAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
          referrer: document.referrer || undefined,
          landingPath: window.location.pathname + window.location.search,
          device: this.detectDevice(),
          language: navigator.language.substring(0, 2) || 'ru',
          ...this.extractUTMParams()
        };
        
        this.saveSession();
        this.sendSessionToServer();
      }
    } catch (error) {
      console.error('Failed to initialize analytics session:', error);
    }
  }

  /**
   * Extract UTM parameters from URL
   */
  private extractUTMParams(): UTMParams {
    const urlParams = new URLSearchParams(window.location.search);
    const utmParams: UTMParams = {};
    
    // Standard UTM parameters
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
    
    utmKeys.forEach(key => {
      const value = urlParams.get(key);
      if (value) {
        utmParams[key] = value;
      }
    });

    // Auto-detect traffic source if not specified
    if (!utmParams.utm_source) {
      utmParams.utm_source = this.detectTrafficSource();
      utmParams.utm_medium = this.detectTrafficMedium(utmParams.utm_source);
    }

    return utmParams;
  }

  /**
   * Auto-detect traffic source based on referrer
   */
  private detectTrafficSource(): string {
    const referrer = document.referrer.toLowerCase();
    
    if (!referrer) return 'direct';
    
    // Check for known sources
    if (referrer.includes('facebook.com') || referrer.includes('fb.com')) return 'facebook';
    if (referrer.includes('yandex.')) return 'yandex';
    if (referrer.includes('google.')) return 'google';
    if (referrer.includes('instagram.com')) return 'instagram';
    if (referrer.includes('telegram.')) return 'telegram';
    if (referrer.includes('whatsapp.')) return 'whatsapp';
    
    return 'referral';
  }

  /**
   * Auto-detect traffic medium based on source
   */
  private detectTrafficMedium(source: string): string {
    switch (source) {
      case 'direct': return 'direct';
      case 'facebook':
      case 'instagram':
      case 'telegram':
      case 'whatsapp': return 'social';
      case 'yandex':
      case 'google': return 'organic';
      default: return 'referral';
    }
  }

  /**
   * Detect device type
   */
  private detectDevice(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/tablet|ipad/.test(userAgent)) return 'tablet';
    if (/mobile|android|iphone/.test(userAgent)) return 'mobile';
    return 'desktop';
  }

  /**
   * Save session data to localStorage
   */
  private saveSession(): void {
    if (this.sessionData) {
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(this.sessionData));
      } catch (error) {
        console.error('Failed to save analytics session:', error);
      }
    }
  }

  /**
   * Send session data to server
   */
  private async sendSessionToServer(): Promise<void> {
    if (!this.sessionData) return;

    try {
      const response = await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'session_start',
          sessionData: this.sessionData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send session data');
      }
    } catch (error) {
      console.error('Failed to send session to server:', error);
      // Store session for offline sync
      this.offlineEvents.push({
        type: 'session_start',
        eventData: this.sessionData,
        timestamp: new Date().toISOString()
      });
      this.saveOfflineEvents();
    }
  }

  /**
   * Track events with offline support
   */
  public async trackEvent(
    type: 'page_view' | 'add_to_cart' | 'remove_from_cart' | 'checkout_start' | 'order_placed' | 'payment_failed' | 'product_view' | 'category_view' | 'search',
    eventData: EventData = {}
  ): Promise<void> {
    if (!this.sessionData) {
      console.warn('Analytics session not initialized');
      return;
    }

    const event = {
      sessionId: this.sessionData.id,
      type,
      eventData,
      timestamp: new Date().toISOString(),
      ...eventData
    };

    try {
      const response = await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error('Failed to track event');
      }
    } catch (error) {
      console.error('Failed to track event:', error);
      // Store event for offline sync
      this.offlineEvents.push({
        type,
        eventData,
        timestamp: new Date().toISOString()
      });
      this.saveOfflineEvents();
    }
  }

  /**
   * Track page views automatically
   */
  public trackPageView(path?: string): void {
    this.trackEvent('page_view', {
      path: path || window.location.pathname + window.location.search
    });
  }

  /**
   * Track product views
   */
  public trackProductView(productId: number, productName?: string): void {
    this.trackEvent('product_view', {
      productId,
      productName
    });
  }

  /**
   * Track category views
   */
  public trackCategoryView(categoryId: number, categoryName?: string): void {
    this.trackEvent('category_view', {
      categoryId,
      categoryName
    });
  }

  /**
   * Track add to cart events
   */
  public trackAddToCart(productId: number, quantity: number, value?: number): void {
    this.trackEvent('add_to_cart', {
      productId,
      quantity,
      value
    });
  }

  /**
   * Track remove from cart events
   */
  public trackRemoveFromCart(productId: number, quantity: number): void {
    this.trackEvent('remove_from_cart', {
      productId,
      quantity
    });
  }

  /**
   * Track checkout start
   */
  public trackCheckoutStart(value: number, itemCount: number): void {
    this.trackEvent('checkout_start', {
      value,
      itemCount
    });
  }

  /**
   * Track order placement
   */
  public trackOrderPlaced(orderId: number, value: number, items: Array<{ productId: number; quantity: number; price: number }>): void {
    this.trackEvent('order_placed', {
      orderId,
      value,
      items
    });
  }

  /**
   * Track payment failures
   */
  public trackPaymentFailed(orderId?: number, error?: string): void {
    this.trackEvent('payment_failed', {
      orderId,
      error
    });
  }

  /**
   * Track search events
   */
  public trackSearch(searchTerm: string, resultsCount?: number): void {
    this.trackEvent('search', {
      searchTerm,
      resultsCount
    });
  }

  /**
   * Get current session data
   */
  public getSessionData(): SessionData | null {
    return this.sessionData;
  }

  /**
   * Load offline events from localStorage
   */
  private loadOfflineEvents(): void {
    try {
      const stored = localStorage.getItem(OFFLINE_EVENTS_KEY);
      if (stored) {
        this.offlineEvents = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline events:', error);
      this.offlineEvents = [];
    }
  }

  /**
   * Save offline events to localStorage
   */
  private saveOfflineEvents(): void {
    try {
      localStorage.setItem(OFFLINE_EVENTS_KEY, JSON.stringify(this.offlineEvents));
    } catch (error) {
      console.error('Failed to save offline events:', error);
    }
  }

  /**
   * Sync offline events when connection is restored
   */
  public async syncOfflineEvents(): Promise<void> {
    if (this.offlineEvents.length === 0) return;

    const eventsToSync = [...this.offlineEvents];
    
    try {
      for (const event of eventsToSync) {
        await this.trackEvent(event.type as any, event.eventData);
      }
      
      // Clear offline events after successful sync
      this.offlineEvents = [];
      localStorage.removeItem(OFFLINE_EVENTS_KEY);
    } catch (error) {
      console.error('Failed to sync offline events:', error);
    }
  }
}

// Create singleton instance
const analytics = new Analytics();

// Auto-sync offline events when online
window.addEventListener('online', () => {
  analytics.syncOfflineEvents();
});

export default analytics;