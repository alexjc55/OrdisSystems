import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export function useFavicon() {
  // Get store settings to check for PWA icon
  const { data: storeSettings } = useQuery({
    queryKey: ['/api/settings']
  });

  // Get active theme to check for PWA icon in theme
  const { data: activeTheme } = useQuery({
    queryKey: ['/api/theme/active']
  });

  useEffect(() => {
    // Use PWA icon from active theme or store settings
    const pwaIconUrl = (activeTheme as any)?.pwaIconUrl || (storeSettings as any)?.pwaIconUrl;
    
    if (pwaIconUrl) {
      updateFavicon(pwaIconUrl);
    }
  }, [storeSettings, activeTheme]);

  const updateFavicon = (iconUrl: string) => {
    try {
      // Remove existing favicon links
      const existingLinks = document.querySelectorAll('link[rel*="icon"]');
      existingLinks.forEach(link => link.remove());

      // Create new favicon links
      const sizes = [16, 32, 96, 192];
      
      sizes.forEach(size => {
        const link = document.createElement('link');
        link.rel = size === 16 ? 'icon' : 'icon';
        link.type = 'image/png';
        link.setAttribute('sizes', `${size}x${size}`);
        link.href = iconUrl;
        document.head.appendChild(link);
      });

      // Add apple-touch-icon for iOS
      const appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      appleLink.setAttribute('sizes', '180x180');
      appleLink.href = iconUrl;
      document.head.appendChild(appleLink);

      // Add shortcut icon
      const shortcutLink = document.createElement('link');
      shortcutLink.rel = 'shortcut icon';
      shortcutLink.href = iconUrl;
      document.head.appendChild(shortcutLink);

    } catch (error) {
      console.error('Error updating favicon:', error);
    }
  };

  return { updateFavicon };
}