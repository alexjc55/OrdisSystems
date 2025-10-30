import { useEffect } from 'react';
import { useStoreSettings } from '@/hooks/useStoreSettings';

export function FacebookPixel() {
  const { storeSettings } = useStoreSettings();

  useEffect(() => {
    console.log('🔍 FacebookPixel: useEffect triggered', {
      storeSettings,
      pixelId: storeSettings?.facebookPixelId,
      enabled: storeSettings?.facebookConversionsApiEnabled
    });
    
    const pixelId = storeSettings?.facebookPixelId;
    
    if (!pixelId || !storeSettings?.facebookConversionsApiEnabled) {
      console.log('❌ FacebookPixel: Pixel not configured or disabled', {
        hasPixelId: !!pixelId,
        enabled: storeSettings?.facebookConversionsApiEnabled
      });
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    console.log('✅ Initializing Facebook Pixel:', pixelId);

    // If fbq doesn't exist yet, load the Facebook Pixel script
    if (!window.fbq) {
      console.log('📦 Loading Facebook Pixel script...');
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
    } else {
      console.log('📦 Facebook Pixel script already loaded, adding new pixel');
    }

    // Initialize this specific pixel (Facebook supports multiple pixels on the same page)
    window.fbq!('init', pixelId);
    window.fbq!('track', 'PageView');

    console.log('✅ Facebook Pixel initialized successfully:', pixelId);
  }, [storeSettings?.facebookPixelId, storeSettings?.facebookConversionsApiEnabled]);

  return null;
}
