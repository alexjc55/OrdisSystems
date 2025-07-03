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
  const { isSupported, isSubscribed, subscribe, sendTestNotification } = usePushNotifications();
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
            Push Уведомления
          </CardTitle>
          <CardDescription>
            Push уведомления не поддерживаются в этом браузере
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Уведомления
          </CardTitle>
          <CardDescription>
            Управление push уведомлениями для клиентов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="text-sm">
                Статус подписки: {isSubscribed ? 'Активна' : 'Неактивна'}
              </span>
            </div>
            
            {!isSubscribed && (
              <Button onClick={subscribe} size="sm">
                Подписаться на уведомления
              </Button>
            )}
            
            <Button onClick={handleTestNotification} variant="outline" size="sm">
              <TestTube className="h-4 w-4 mr-2" />
              Тест
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="send" className="space-y-4">
        <TabsList>
          <TabsTrigger value="send">
            <Send className="h-4 w-4 mr-2" />
            Отправить уведомление
          </TabsTrigger>
          <TabsTrigger value="history">История</TabsTrigger>
        </TabsList>

        <TabsContent value="send">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Создать маркетинговую рассылку
              </CardTitle>
              <CardDescription>
                Отправить уведомление всем подписанным пользователям
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="title">Заголовок *</Label>
                  <Input
                    id="title"
                    value={marketingForm.title}
                    onChange={(e) => setMarketingForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Заголовок уведомления"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="message">Сообщение *</Label>
                  <Textarea
                    id="message"
                    value={marketingForm.message}
                    onChange={(e) => setMarketingForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Текст уведомления"
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
                    'Отправка...'
                  ) : (
                    <>
                      <Users className="h-4 w-4 mr-2" />
                      Отправить всем
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
              <CardTitle>История уведомлений</CardTitle>
              <CardDescription>
                Последние отправленные маркетинговые уведомления
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Уведомления еще не отправлялись
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
                        <span>Отправлено: {notification.sentCount} получателей</span>
                        <span>Дата: {new Date(notification.sentAt).toLocaleString('ru-RU')}</span>
                        <span>Автор: {notification.createdBy}</span>
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