import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/error-boundary";
import { AuthProvider } from "@/hooks/use-auth";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { CustomHtml } from "@/components/custom-html";
import { WhatsAppChat } from "@/components/layout/whatsapp-chat";
import { Footer } from "@/components/layout/footer";
import { LanguageInitializer } from "@/components/language-initializer";
import { useUrlLanguage } from "@/hooks/use-url-language";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PWAStatusBar from "@/components/PWAStatusBar";
import PushNotificationRequest from "@/components/PushNotificationRequest";
import NotificationModal from "@/components/NotificationModal";
import { CacheBuster } from "@/components/cache-buster";
import { addNotification } from "@/lib/notification-storage";
import { IOSCacheBuster } from "@/components/ios-cache-buster";
import { useEffect, useState, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { updateDocumentDirection } from "@/lib/i18n";
import Landing from "@/pages/landing";
import Home from "@/pages/home";

import { ProtectedRoute } from "@/lib/protected-route";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { FacebookPixel } from "@/components/FacebookPixel";
import { BottomNav } from "@/components/layout/bottom-nav";
import CartSidebar from "@/components/cart/cart-sidebar";

// Heavy pages loaded on demand — reduces initial bundle size
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"));
const AdminAnalytics = lazy(() => import("@/pages/admin-analytics"));
const Profile = lazy(() => import("@/pages/profile"));
const ChangePasswordPage = lazy(() => import("@/pages/change-password"));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const Checkout = lazy(() => import("@/pages/checkout"));
const ThanksPage = lazy(() => import("@/pages/thanks"));
const GuestOrderPage = lazy(() => import("@/pages/guest-order"));
const AuthPage = lazy(() => import("@/pages/auth-page"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Router() {
  const { storeSettings } = useStoreSettings();
  const { i18n } = useTranslation();
  
  // Handle URL-based language switching
  useUrlLanguage();
  
  // State for notification modal
  const [notificationModal, setNotificationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'marketing' | 'order-status' | 'cart-reminder';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'marketing'
  });

  // Initialize language and direction on app start
  useEffect(() => {
    // Browser-only: localStorage and document access
    if (typeof window === 'undefined') return;
    
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && Object.keys({ru: 1, en: 1, he: 1, ar: 1}).includes(savedLanguage)) {
      if (savedLanguage !== i18n.language) {
        i18n.changeLanguage(savedLanguage);
      }
      updateDocumentDirection(savedLanguage);
    } else {
      updateDocumentDirection(i18n.language);
    }
    
    // Listen for language changes
    const handleLanguageChange = (lng: string) => {
      updateDocumentDirection(lng);
      // Update HTML lang attribute for SEO
      document.documentElement.lang = lng;
    };
    
    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  // Force disable scroll lock on any attempt by Radix UI
  useEffect(() => {
    const disableScrollLock = () => {
      // Remove scroll lock attributes
      document.body.removeAttribute('data-scroll-locked');
      document.documentElement.removeAttribute('data-scroll-locked');
      
      // Force overflow and padding styles while preserving centering
      document.body.style.overflow = 'auto';
      document.body.style.paddingRight = '0';
      document.body.style.marginRight = '0';
      document.body.style.maxWidth = '1023px';
      document.body.style.margin = '0 auto';
      document.documentElement.style.overflow = 'auto';
    };

    // Run immediately
    disableScrollLock();

    // Set up observer to watch for scroll lock attributes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          const target = mutation.target as Element;
          if (target.hasAttribute('data-scroll-locked')) {
            disableScrollLock();
          }
        }
      });
    });

    // Observe both body and html for attribute changes
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-scroll-locked', 'style']
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-scroll-locked', 'style']
    });

    // Also run periodically as backup
    const interval = setInterval(disableScrollLock, 100);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  // Listen for messages from Service Worker (notification clicks)
  useEffect(() => {
    // Check for notification data in URL parameters on app startup
    const urlParams = new URLSearchParams(window.location.search);
    const notificationData = urlParams.get('notification');
    
    if (notificationData) {
      try {
        const notification = JSON.parse(decodeURIComponent(notificationData));

        
        const nType = notification.type || 'marketing';
        const mappedType = nType === 'order_status' || nType === 'order' ? 'order' : nType === 'system' ? 'system' : 'marketing';
        addNotification(notification.title || 'Уведомление', notification.body || '', mappedType);

        setNotificationModal({
          isOpen: true,
          title: notification.title || 'Уведомление',
          message: notification.body || 'Новое уведомление',
          type: notification.type || 'marketing'
        });
        
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
      } catch (error) {
        console.error('❌ [App] Failed to parse notification data from URL:', error);
      }
    }

    const handleMessage = (event: MessageEvent) => {
      console.log('📨 [App] Received message from Service Worker:', event.data);
      
      // Handle different message types from Service Worker
      if (event.data?.type === 'notification-shown') {
        console.log('✅ [App] Notification was shown successfully:', event.data.title);
        try {
          const nType = event.data.notificationType || 'marketing';
          const mappedType = nType === 'order_status' || nType === 'order' ? 'order' : nType === 'system' ? 'system' : 'marketing';
          addNotification(event.data.title, event.data.body, mappedType);
        } catch (e) {
          console.error('Failed to store notification:', e);
        }
      } else if (event.data?.type === 'notification-error') {
        console.error('❌ [App] Notification failed to show:', event.data.error);
        alert(`Push notification error: ${event.data.error}`);
      } else if (
        event.data?.type === 'notification-click' ||
        event.data?.type === 'notification-click-retry' ||
        event.data?.type === 'PENDING_NOTIFICATION'
      ) {
        console.log('🔔 [App] Notification was clicked:', event.data);
        
        if (event.data?.notification) {
          const { title, body, type: notificationType } = event.data.notification;
          const fallbackType = event.data.data?.type || 'marketing';
          
          setNotificationModal(prev => {
            // Avoid showing duplicate modal from retry message if already open
            if (prev.isOpen && prev.title === (title || 'Уведомление')) return prev;
            return {
              isOpen: true,
              title: title || 'Уведомление',
              message: body || 'Новое уведомление',
              type: notificationType || fallbackType
            };
          });
        }
      }
    };

    // Ask SW for any pending notification when app becomes visible
    // (handles iOS race condition: postMessage arrived before app JS resumed)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'GET_PENDING_NOTIFICATION' });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Добавить listener к window вместо navigator.serviceWorker
    window.addEventListener('message', handleMessage);
    
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', handleMessage);

      
      // Add global test function for debugging
      (window as any).testNotificationModal = (title: string = 'Тест', message: string = 'Тестовое сообщение', type: 'marketing' | 'order-status' | 'cart-reminder' = 'marketing') => {

        setNotificationModal({
          isOpen: true,
          title,
          message,
          type
        });
      };
      
      // Тестовая функция для симуляции Service Worker сообщения
      (window as any).testServiceWorkerMessage = () => {

        handleMessage({
          data: {
            type: 'notification-click',
            notification: {
              title: 'Тест SW сообщения',
              body: 'Симуляция сообщения от Service Worker',
              type: 'marketing'
            }
          }
        } as MessageEvent);
      };
      
      // Тестовая функция для PWA push уведомлений
      (window as any).testPWANotification = async () => {

        try {
          const registration = await navigator.serviceWorker.ready;
          registration.active?.postMessage({ 
            type: 'test-pwa-notification' 
          });

        } catch (error) {

        }
      };
      

    } else {

    }
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('message', handleMessage);
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);

      }
      delete (window as any).testNotificationModal;
      delete (window as any).testServiceWorkerMessage;
    };
  }, []);

  return (
    <ErrorBoundary>
      {/* Render custom header HTML/JS */}
      {storeSettings?.headerHtml && (
        <CustomHtml html={storeSettings.headerHtml} type="head" />
      )}
      
      <Suspense fallback={
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
          <div style={{ width: 40, height: 40, border: '4px solid #fed7aa', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/category/:categoryId" component={Home} />
          <Route path="/all-products" component={Home} />
          <Route path="/auth" component={AuthPage} />
          <ProtectedRoute path="/admin/analytics" component={() => <AdminAnalytics />} />
          <ProtectedRoute path="/admin" component={() => <AdminDashboard />} />
          <ProtectedRoute path="/profile" component={() => <Profile />} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/thanks" component={ThanksPage} />
          <Route path="/guest-order/:token" component={GuestOrderPage} />
          <Route path="/change-password" component={ChangePasswordPage} />
          <Route path="/forgot-password" component={ForgotPasswordPage} />
          <Route path="/reset-password" component={ResetPasswordPage} />
          <Route path="/landing" component={Landing} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
      
      {/* Analytics Tracker - Automatically tracks route changes for all analytics services */}
      <AnalyticsTracker debug={true} />
      
      {/* Facebook Pixel - Automatically initializes Facebook Pixel if configured */}
      <FacebookPixel />
      
      {/* PWA Status Bar */}
      <PWAStatusBar />
      
      {/* Cache Buster - App Update Notification */}
      <CacheBuster />
      
      {/* iOS-specific Cache Buster */}
      <IOSCacheBuster />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
      
      {/* Push Notification Request */}
      <PushNotificationRequest />
      
      {/* Notification Modal */}
      <NotificationModal
        isOpen={notificationModal.isOpen}
        onClose={() => setNotificationModal(prev => ({ ...prev, isOpen: false }))}
        title={notificationModal.title}
        message={notificationModal.message}
        type={notificationModal.type}
      />
      
      {/* Render custom footer HTML/JS */}
      {storeSettings?.footerHtml && (
        <CustomHtml html={storeSettings.footerHtml} type="footer" />
      )}
      
      {/* Ordis Footer */}
      <Footer />

      {/* WhatsApp Chat Widget */}
      <WhatsAppChat />
      
      {/* Cart Sidebar - Global */}
      <CartSidebar />
      
      {/* Bottom Navigation Bar - Mobile only */}
      <BottomNav />
    </ErrorBoundary>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <LanguageInitializer />
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
