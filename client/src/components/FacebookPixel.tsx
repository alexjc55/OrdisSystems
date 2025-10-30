import { useEffect } from 'react';
import { useStoreSettings } from '@/hooks/useStoreSettings';

export function FacebookPixel() {
  const { storeSettings } = useStoreSettings();

  useEffect(() => {
    const pixelId = storeSettings?.facebookPixelId;
    
    if (!pixelId || !storeSettings?.facebookConversionsApiEnabled) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    // If fbq doesn't exist yet, load the Facebook Pixel script
    if (!window.fbq) {
      (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
        if (f.fbq) return;
        n = f.fbq = function() {
          n.callMethod ?
            n.callMethod.apply(n, arguments) : n.queue.push(arguments)
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = '2.0';
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s)
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    }

    // Initialize this specific pixel (Facebook supports multiple pixels on the same page)
    window.fbq!('init', pixelId);
    window.fbq!('track', 'PageView');
  }, [storeSettings?.facebookPixelId, storeSettings?.facebookConversionsApiEnabled]);

  return null;
}
