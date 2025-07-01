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

interface MarketingNotification {
  id: number;
  title: string;
  message: string;
  titleEn?: string;
  messageEn?: string;
  titleHe?: string;
  messageHe?: string;
  titleAr?: string;
  messageAr?: string;
  sentCount: number;
  createdBy: string;
  sentAt: string;
  createdAt: string;
}

export function PushNotificationsPanel() {
  const { isSupported, isSubscribed, subscribe, sendTestNotification } = usePushNotifications();
  const queryClient = useQueryClient();
  
  const [marketingForm, setMarketingForm] = useState({
    title: '',
    message: '',
    titleEn: '',
    messageEn: '',
    titleHe: '',
    messageHe: '',
    titleAr: '',
    messageAr: ''
  });

  // Fetch marketing notifications history
  const { data: notifications = [] } = useQuery<MarketingNotification[]>({
    queryKey: ['/api/admin/push/marketing'],
    enabled: isSupported
  });

  // Send marketing notification mutation
  const sendMarketingMutation = useMutation({
    mutationFn: (data: typeof marketingForm) => 
      apiRequest('/api/admin/push/marketing', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/push/marketing'] });
      setMarketingForm({
        title: '',
        message: '',
        titleEn: '',
        messageEn: '',
        titleHe: '',
        messageHe: '',
        titleAr: '',
        messageAr: ''
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
            
            <Button onClick={handleTestNotification} size="sm" variant="outline">
              <TestTube className="h-4 w-4 mr-2" />
              Тест
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="marketing" className="space-y-4">
        <TabsList>
          <TabsTrigger value="marketing">Маркетинговые рассылки</TabsTrigger>
          <TabsTrigger value="history">История уведомлений</TabsTrigger>
        </TabsList>

        <TabsContent value="marketing">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Russian version */}
                <div className="space-y-4">
                  <h4 className="font-medium">Русский язык</h4>
                  <div>
                    <Label htmlFor="title-ru">Заголовок *</Label>
                    <Input
                      id="title-ru"
                      value={marketingForm.title}
                      onChange={(e) => setMarketingForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Заголовок уведомления"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="message-ru">Сообщение *</Label>
                    <Textarea
                      id="message-ru"
                      value={marketingForm.message}
                      onChange={(e) => setMarketingForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Текст уведомления"
                      rows={3}
                      required
                    />
                  </div>
                </div>

                {/* English version */}
                <div className="space-y-4">
                  <h4 className="font-medium">English</h4>
                  <div>
                    <Label htmlFor="title-en">Title</Label>
                    <Input
                      id="title-en"
                      value={marketingForm.titleEn}
                      onChange={(e) => setMarketingForm(prev => ({ ...prev, titleEn: e.target.value }))}
                      placeholder="Notification title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="message-en">Message</Label>
                    <Textarea
                      id="message-en"
                      value={marketingForm.messageEn}
                      onChange={(e) => setMarketingForm(prev => ({ ...prev, messageEn: e.target.value }))}
                      placeholder="Notification message"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Hebrew version */}
                <div className="space-y-4">
                  <h4 className="font-medium">עברית</h4>
                  <div>
                    <Label htmlFor="title-he">כותרת</Label>
                    <Input
                      id="title-he"
                      value={marketingForm.titleHe}
                      onChange={(e) => setMarketingForm(prev => ({ ...prev, titleHe: e.target.value }))}
                      placeholder="כותרת ההודעה"
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="message-he">הודעה</Label>
                    <Textarea
                      id="message-he"
                      value={marketingForm.messageHe}
                      onChange={(e) => setMarketingForm(prev => ({ ...prev, messageHe: e.target.value }))}
                      placeholder="טקסט ההודעה"
                      rows={3}
                      dir="rtl"
                    />
                  </div>
                </div>

                {/* Arabic version */}
                <div className="space-y-4">
                  <h4 className="font-medium">العربية</h4>
                  <div>
                    <Label htmlFor="title-ar">العنوان</Label>
                    <Input
                      id="title-ar"
                      value={marketingForm.titleAr}
                      onChange={(e) => setMarketingForm(prev => ({ ...prev, titleAr: e.target.value }))}
                      placeholder="عنوان الإشعار"
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="message-ar">الرسالة</Label>
                    <Textarea
                      id="message-ar"
                      value={marketingForm.messageAr}
                      onChange={(e) => setMarketingForm(prev => ({ ...prev, messageAr: e.target.value }))}
                      placeholder="نص الإشعار"
                      rows={3}
                      dir="rtl"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  * Русский язык обязателен. Другие языки опциональны.
                </div>
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
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Уведомления еще не отправлялись
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{notification.title}</h4>
                        <div className="text-sm text-muted-foreground">
                          Отправлено: {notification.sentCount} пользователям
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        {new Date(notification.sentAt).toLocaleString('ru-RU')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}