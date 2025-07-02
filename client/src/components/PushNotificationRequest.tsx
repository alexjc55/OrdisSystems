import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';

export default function PushNotificationRequest() {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [showRequest, setShowRequest] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check current permission status
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Show request after 30 seconds if user is logged in and permission not granted
    const timer = setTimeout(() => {
      if (user && Notification.permission === 'default') {
        const lastRequested = localStorage.getItem('push-permission-requested');
        const daysSinceRequest = lastRequested ? 
          (Date.now() - parseInt(lastRequested)) / (1000 * 60 * 60 * 24) : 999;
        
        // Show request if not asked in last 7 days
        if (daysSinceRequest > 7) {
          setShowRequest(true);
        }
      }
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, [user]);

  const requestPushPermission = async () => {
    try {
      if ('Notification' in window && 'serviceWorker' in navigator) {
        const permission = await Notification.requestPermission();
        console.log('Push notification permission:', permission);
        setPermission(permission);
        
        if (permission === 'granted') {
          // Subscribe to push notifications
          const registration = await navigator.serviceWorker.ready;
          if (registration.pushManager) {
            try {
              const response = await fetch('/api/push/vapid-public-key');
              const { publicKey } = await response.json();
              
              const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: publicKey
              });
              
              // Send subscription to server
              await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(subscription)
              });
              
              console.log('Successfully subscribed to push notifications');
            } catch (subscribeError) {
              console.error('Error subscribing to push notifications:', subscribeError);
            }
          }
        }
        
        // Mark as requested
        localStorage.setItem('push-permission-requested', Date.now().toString());
        setShowRequest(false);
      }
    } catch (error) {
      console.error('Error requesting push permission:', error);
    }
  };

  const handleDismiss = () => {
    setShowRequest(false);
    localStorage.setItem('push-permission-requested', Date.now().toString());
  };

  // Don't show if permission already granted/denied or user not logged in
  if (!showRequest || !user || permission !== 'default') {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />
      
      {/* Notification Request */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm mx-4">
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Bell className="w-6 h-6 text-blue-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('push.requestTitle')}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {t('push.requestMessage')}
              </p>
            </div>
            
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={requestPushPermission}
              className="flex-1"
              size="sm"
            >
              {t('push.allow')}
            </Button>
            <Button 
              onClick={handleDismiss}
              variant="outline"
              className="flex-1"
              size="sm"
            >
              {t('push.notNow')}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}