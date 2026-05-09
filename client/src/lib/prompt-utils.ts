// Utility functions for managing PWA install and push notification prompts

// Device detection
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isDesktopDevice(): boolean {
  return !isMobileDevice();
}

export function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone ||
    document.referrer.includes('android-app://')
  );
}

// Visit tracking
export function trackVisit(): number {
  const visitKey = 'site-visit-count';
  const lastVisitKey = 'site-last-visit';
  
  const now = Date.now();
  const lastVisit = localStorage.getItem(lastVisitKey);
  
  // Only count as new visit if more than 1 hour has passed
  const isNewVisit = !lastVisit || (now - parseInt(lastVisit)) > (60 * 60 * 1000);
  
  if (isNewVisit) {
    const currentCount = parseInt(localStorage.getItem(visitKey) || '0');
    const newCount = currentCount + 1;
    localStorage.setItem(visitKey, newCount.toString());
    localStorage.setItem(lastVisitKey, now.toString());
    return newCount;
  }
  
  return parseInt(localStorage.getItem(visitKey) || '0');
}

export function getVisitCount(): number {
  return parseInt(localStorage.getItem('site-visit-count') || '0');
}

// PWA Install Prompt management
export function shouldShowPWAInstallPrompt(): boolean {
  // Never show on desktop
  if (isDesktopDevice()) {
    console.log('🚫 PWA install: Skipped (desktop device)');
    return false;
  }
  
  // Don't show if already installed
  if (isStandaloneMode()) {
    console.log('🚫 PWA install: Skipped (already installed)');
    return false;
  }
  
  // Check if user dismissed it
  const dismissedTime = localStorage.getItem('pwa-dismissed');
  if (dismissedTime) {
    const daysSinceDismiss = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
    if (daysSinceDismiss < 7) {
      console.log(`🚫 PWA install: Skipped (dismissed ${Math.floor(daysSinceDismiss)} days ago, waiting 7 days)`);
      return false;
    }
  }
  
  // For iOS, check if already shown
  if (isIOSDevice()) {
    const iosShown = localStorage.getItem('ios-prompt-shown');
    if (iosShown === 'true') {
      // For iOS, check if 7 days have passed since last show
      const iosShownTime = localStorage.getItem('ios-prompt-shown-time');
      if (iosShownTime) {
        const daysSinceShow = (Date.now() - parseInt(iosShownTime)) / (1000 * 60 * 60 * 24);
        if (daysSinceShow < 7) {
          console.log(`🚫 PWA install: Skipped iOS (shown ${Math.floor(daysSinceShow)} days ago)`);
          return false;
        }
      } else {
        // Old format, don't show
        console.log('🚫 PWA install: Skipped iOS (already shown, no timestamp)');
        return false;
      }
    }
  }
  
  // Only show after 2+ visits (engaged users)
  const visitCount = getVisitCount();
  if (visitCount < 2) {
    console.log(`🚫 PWA install: Skipped (only ${visitCount} visits, need 2+)`);
    return false;
  }
  
  console.log(`✅ PWA install: Should show (${visitCount} visits, mobile device)`);
  return true;
}

export function markPWAPromptDismissed(isIOS: boolean = false): void {
  const now = Date.now();
  if (isIOS) {
    localStorage.setItem('ios-prompt-shown', 'true');
    localStorage.setItem('ios-prompt-shown-time', now.toString());
  } else {
    localStorage.setItem('pwa-dismissed', now.toString());
  }
  console.log(`📝 PWA install marked as dismissed (iOS: ${isIOS})`);
}

// Push Notification Request management
export function shouldShowPushRequest(userRole?: string): boolean {
  // Admins always see it (for testing)
  if (userRole === 'admin') {
    console.log('✅ Push request: Should show (admin user)');
    return true;
  }
  
  // Check permission status
  if ('Notification' in window && Notification.permission !== 'default') {
    console.log(`🚫 Push request: Skipped (permission already ${Notification.permission})`);
    return false;
  }
  
  // Check if recently requested
  const lastRequested = localStorage.getItem('push-permission-requested');
  if (lastRequested) {
    const daysSinceRequest = (Date.now() - parseInt(lastRequested)) / (1000 * 60 * 60 * 24);
    if (daysSinceRequest < 3) {
      console.log(`🚫 Push request: Skipped (requested ${Math.floor(daysSinceRequest)} days ago, waiting 3 days)`);
      return false;
    }
  }
  
  // For iOS, only show in standalone mode
  if (isIOSDevice() && !isStandaloneMode()) {
    console.log('🚫 Push request: Skipped (iOS non-standalone mode)');
    return false;
  }
  
  // Check if PWA prompt is showing (don't show both at once)
  const pwaPromptShowing = sessionStorage.getItem('pwa-prompt-showing');
  if (pwaPromptShowing === 'true') {
    console.log('🚫 Push request: Skipped (PWA prompt is showing)');
    return false;
  }
  
  console.log('✅ Push request: Should show');
  return true;
}

export function markPushRequestShown(): void {
  localStorage.setItem('push-permission-requested', Date.now().toString());
  console.log('📝 Push request marked as shown');
}

// Session coordination (prevent showing multiple prompts at once)
export function setPWAPromptShowing(showing: boolean): void {
  if (showing) {
    sessionStorage.setItem('pwa-prompt-showing', 'true');
  } else {
    sessionStorage.removeItem('pwa-prompt-showing');
  }
}

// Context triggers
export function triggerPushRequestAfterAction(action: 'cart-add' | 'checkout'): void {
  console.log(`🔔 Push request triggered by action: ${action}`);
  
  // Set flag that will be checked by PushNotificationRequest component
  sessionStorage.setItem('trigger-push-request', action);
  
  // Dispatch custom event
  window.dispatchEvent(new CustomEvent('trigger-push-request', { 
    detail: { action } 
  }));
}

// Debug utilities
export function clearAllPromptData(): void {
  localStorage.removeItem('pwa-dismissed');
  localStorage.removeItem('ios-prompt-shown');
  localStorage.removeItem('ios-prompt-shown-time');
  localStorage.removeItem('push-permission-requested');
  localStorage.removeItem('site-visit-count');
  localStorage.removeItem('site-last-visit');
  sessionStorage.removeItem('pwa-prompt-showing');
  sessionStorage.removeItem('trigger-push-request');
  console.log('🧹 All prompt data cleared');
}

// Make debug function globally available
(window as any).clearAllPromptData = clearAllPromptData;
(window as any).getPromptStatus = () => {
  return {
    visitCount: getVisitCount(),
    isMobile: isMobileDevice(),
    isDesktop: isDesktopDevice(),
    isIOS: isIOSDevice(),
    isStandalone: isStandaloneMode(),
    shouldShowPWA: shouldShowPWAInstallPrompt(),
    shouldShowPush: shouldShowPushRequest(),
    pwaPromptShowing: sessionStorage.getItem('pwa-prompt-showing'),
    localStorage: {
      pwaDismissed: localStorage.getItem('pwa-dismissed'),
      iosShown: localStorage.getItem('ios-prompt-shown'),
      iosShownTime: localStorage.getItem('ios-prompt-shown-time'),
      pushRequested: localStorage.getItem('push-permission-requested'),
    }
  };
};
