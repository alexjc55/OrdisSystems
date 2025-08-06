import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Bell, Send, TestTube, Users, Settings } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useTranslation } from 'react-i18next';

interface MarketingNotification {
  id: number;
  title: string;
  message: string;
  sentCount: number;
  createdBy: string;
  sentAt: string;
  createdAt: string;
}

export function PushNotificationsPanel() {
  const { isSupported, isSubscribed, subscribe, sendTestNotification, permission } = usePushNotifications();
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin');
  
  const [marketingForm, setMarketingForm] = useState({
    title: '',
    message: ''
  });

  // Fetch marketing notifications history
  const { data: notifications = [] } = useQuery<MarketingNotification[]>({
    queryKey: ['/api/admin/push/marketing'],
    enabled: isSupported
  });

  // Fetch subscription statistics
  const { data: stats } = useQuery<{ totalSubscriptions: number }>({
    queryKey: ['/api/admin/push/stats'],
    enabled: isSupported
  });

  // Send marketing notification mutation
  const sendMarketingMutation = useMutation({
    mutationFn: async (data: { title: string; message: string }) => {
      const response = await apiRequest('POST', '/api/admin/push/marketing', {
        title: data.title,
        message: data.message
      });
      if (!response.ok) throw new Error('Failed to send notification');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/push/marketing'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/push/stats'] });
      setMarketingForm({
        title: '',
        message: ''
      });
    }
  });

  const handleMarketingSend = async () => {
    if (!marketingForm.title || !marketingForm.message) return;
    
    try {
      await sendMarketingMutation.mutateAsync(marketingForm);
    } catch (error) {
      console.error('Error sending marketing notification:', error);
    }
  };

  const handleTestNotification = async () => {
    const success = await sendTestNotification();
    if (success) {
      console.log('Test notification sent successfully');
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('pushNotifications.title')}
          </CardTitle>
          <CardDescription>
            {t('pushNotifications.notSupported')}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t('pushNotifications.title')}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-gray-100 px-3 py-1 rounded-full self-start sm:self-auto">
              <Users className="h-4 w-4" />
              <span>{stats?.totalSubscriptions || 0} {t('pushNotifications.subscribers')}</span>
            </div>
          </div>
          <CardDescription>
            {t('pushNotifications.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="text-sm">
                  {t('pushNotifications.subscriptionStatus')}: {isSubscribed ? t('pushNotifications.subscriptionActive') : t('pushNotifications.subscriptionInactive')}
                </span>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                {!isSubscribed && (
                  <Button onClick={subscribe} size="sm" className="w-full sm:w-auto">
                    {t('pushNotifications.subscribe')}
                  </Button>
                )}
                
                <Button onClick={handleTestNotification} variant="outline" size="sm" className="w-full sm:w-auto">
                  <TestTube className="h-4 w-4 mr-2" />
                  {t('pushNotifications.test')}
                </Button>
              </div>
            </div>
            
            {/* Debug info */}
            <div className="text-xs text-muted-foreground space-y-1 p-2 bg-gray-50 rounded">
              <div>Поддержка: {isSupported ? '✅' : '❌'}</div>
              <div>Разрешение: {permission}</div>
              <div>Подписка: {isSubscribed ? '✅' : '❌'}</div>
              <div>Service Worker: {'serviceWorker' in navigator ? '✅' : '❌'}</div>
              <div>Push Manager: {'PushManager' in window ? '✅' : '❌'}</div>
              <div className="mt-2 pt-2 border-t space-y-1">
                <div className="font-medium">Тестовые функции:</div>
                <button 
                  onClick={() => (window as any).showPushRequest?.()} 
                  className="text-blue-600 hover:underline mr-3"
                >
                  Показать запрос подписки
                </button>
                <button 
                  onClick={() => (window as any).clearPushCache?.()} 
                  className="text-blue-600 hover:underline"
                >
                  Очистить кэш
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="send" className="space-y-4">
        <TabsList>
          <TabsTrigger value="send">
            <Send className="h-4 w-4 mr-2" />
            {t('pushNotifications.sendNotification')}
          </TabsTrigger>
          <TabsTrigger value="history">{t('pushNotifications.history')}</TabsTrigger>
        </TabsList>

        <TabsContent value="send">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                {t('pushNotifications.createMarketing')}
              </CardTitle>
              <CardDescription>
                {t('pushNotifications.createMarketingDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="title">{t('pushNotifications.title_field')} *</Label>
                  <Input
                    id="title"
                    value={marketingForm.title}
                    onChange={(e) => setMarketingForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={t('pushNotifications.titlePlaceholder')}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="message">{t('pushNotifications.message_field')} *</Label>
                  <Textarea
                    id="message"
                    value={marketingForm.message}
                    onChange={(e) => setMarketingForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder={t('pushNotifications.messagePlaceholder')}
                    rows={3}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button 
                  onClick={handleMarketingSend}
                  disabled={!marketingForm.title || !marketingForm.message || sendMarketingMutation.isPending}
                  className="min-w-32"
                >
                  {sendMarketingMutation.isPending ? (
                    t('pushNotifications.sending')
                  ) : (
                    <>
                      <Users className="h-4 w-4 mr-2" />
                      {t('pushNotifications.sendToAll')}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>{t('pushNotifications.historyTitle')}</CardTitle>
              <CardDescription>
                {t('pushNotifications.historyDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('pushNotifications.noNotifications')}
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-sm text-muted-foreground">{notification.message}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-4">
                        <span>{t('pushNotifications.sentTo', { count: notification.sentCount })}</span>
                        <span>{t('pushNotifications.date')}: {new Date(notification.sentAt).toLocaleString()}</span>
                        <span>{t('pushNotifications.author')}: {notification.createdBy}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}