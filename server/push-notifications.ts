import webpush from 'web-push';
import { getDB } from './db';
import { pushSubscriptions, users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

// VAPID ключи для push уведомлений
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BAAMfY2mqdW51T4mXUIz1ckbnYJK-OMO9HoSh3yFYKQSvc2vsecHfbFSaXALhHpHK1XPkfQOfsl5VmljhPndzGU';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'HL-vgkI1fxLdY4ZN19c52-2GR929lO42TqOJJZlKiog';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'admin@edahouse.com';

// Настройка web-push
webpush.setVapidDetails(
  `mailto:${VAPID_EMAIL}`,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

export class PushNotificationService {
  // Отправить уведомление конкретному пользователю
  static async sendToUser(userId: string, notification: PushNotification) {
    try {
      const db = await getDB();
      const subscriptions = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userId));

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/api/icons/icon-192x192.png',
        badge: notification.badge || '/api/icons/icon-96x96.png',
        data: notification.data || {},
        actions: notification.actions || []
      });

      const promises = subscriptions.map((sub: any) => {
        const pushConfig = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth,
            p256dh: sub.p256dh
          }
        };

        return webpush.sendNotification(pushConfig, payload)
          .catch(error => {
            console.error('Push notification failed:', error);
            // Удаляем неработающие подписки
            if (error.statusCode === 404 || error.statusCode === 410) {
              return db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
            }
          });
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  // Отправить уведомление всем пользователям (маркетинговая рассылка)
  static async sendToAll(notification: PushNotification, userType?: 'customer' | 'admin' | 'worker') {
    try {
      const db = await getDB();
      let query = db.select().from(pushSubscriptions);
      
      if (userType) {
        // Здесь можно добавить фильтрацию по типу пользователя
        // если нужно отправлять только определенным ролям
      }

      const subscriptions = await query;
      console.log(`📡 Attempting to send push notification to ${subscriptions.length} subscriptions`);
      console.log(`📄 Notification payload:`, JSON.stringify(notification, null, 2));

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/api/icons/icon-192x192.png',
        badge: notification.badge || '/api/icons/icon-96x96.png',
        data: notification.data || {},
        actions: notification.actions || []
      });

      const promises = subscriptions.map((sub: any) => {
        const pushConfig = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth,
            p256dh: sub.p256dh
          }
        };

        return webpush.sendNotification(pushConfig, payload)
          .then(result => {
            console.log('✅ Push notification sent successfully to:', sub.endpoint.substring(0, 50) + '...');
            return result;
          })
          .catch(error => {
            console.error('❌ Push notification failed for:', sub.endpoint.substring(0, 50) + '...', error);
            if (error.statusCode === 404 || error.statusCode === 410) {
              console.log('🗑️ Removing invalid subscription:', sub.id);
              return db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
            }
            throw error;
          });
      });

      const results = await Promise.allSettled(promises);
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;
      
      console.log(`📊 Push notification results: ${successful} successful, ${failed} failed out of ${subscriptions.length} total`);
      
      if (failed > 0) {
        const failedResults = results.filter(result => result.status === 'rejected') as PromiseRejectedResult[];
        failedResults.forEach((result, index) => {
          console.error(`❌ Failed notification ${index + 1}:`, result.reason);
        });
      }
      
      return { success: true, sent: successful, failed: failed, total: subscriptions.length };
    } catch (error) {
      console.error('Error sending bulk push notification:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Уведомления о статусе заказа
  static async notifyOrderStatus(userId: string, orderId: number, status: string, language: string = 'ru') {
    const statusMessages: Record<string, Record<string, string>> = {
      ru: {
        pending: 'Ваш заказ принят и обрабатывается',
        preparing: 'Ваш заказ готовится',
        ready: 'Ваш заказ готов!',
        delivering: 'Ваш заказ в пути',
        delivered: 'Ваш заказ доставлен',
        cancelled: 'Ваш заказ отменен'
      },
      en: {
        pending: 'Your order has been received and is being processed',
        preparing: 'Your order is being prepared',
        ready: 'Your order is ready!',
        delivering: 'Your order is on the way',
        delivered: 'Your order has been delivered',
        cancelled: 'Your order has been cancelled'
      },
      he: {
        pending: 'ההזמנה שלך התקבלה ומעובדת',
        preparing: 'ההזמנה שלך מוכנה',
        ready: 'ההזמנה שלך מוכנה!',
        delivering: 'ההזמנה שלך בדרך',
        delivered: 'ההזמנה שלך נמסרה',
        cancelled: 'ההזמנה שלך בוטלה'
      },
      ar: {
        pending: 'تم استلام طلبك وجاري المعالجة',
        preparing: 'جاري تحضير طلبك',
        ready: 'طلبك جاهز!',
        delivering: 'طلبك في الطريق',
        delivered: 'تم تسليم طلبك',
        cancelled: 'تم إلغاء طلبك'
      }
    };

    const messages = statusMessages[language] || statusMessages.ru;
    const statusIcons: Record<string, string> = {
      pending: '⏳',
      preparing: '👨‍🍳',
      ready: '✅',
      delivering: '🚗',
      delivered: '📦',
      cancelled: '❌'
    };

    await this.sendToUser(userId, {
      title: `${statusIcons[status]} Заказ #${orderId}`,
      body: messages?.[status] || `Статус заказа изменен на: ${status}`,
      data: {
        type: 'order-status',
        orderId,
        status
      },
      actions: [
        {
          action: 'view-order',
          title: 'Посмотреть заказ'
        }
      ]
    });
  }

  // Уведомить администраторов и работников о новом заказе
  static async notifyNewOrder(orderId: number, customerName: string, totalAmount: string, isGuest: boolean = false) {
    try {
      const db = await getDB();
      
      // Получить всех пользователей с ролями admin и worker
      const adminUsers = await db
        .select()
        .from(users)
        .where(sql`role IN ('admin', 'worker')`);
      
      if (adminUsers.length === 0) {
        console.log('No admin or worker users found for new order notification');
        return;
      }

      // Многоязычные сообщения для новых заказов
      const messages = {
        ru: {
          orderType: isGuest ? 'гостевой заказ' : 'заказ',
          title: `🔔 Новый ${isGuest ? 'гостевой заказ' : 'заказ'} #${orderId}`,
          body: `Клиент: ${customerName}, Сумма: ${totalAmount}₽`,
          viewOrder: 'Посмотреть заказ',
          adminPanel: 'Админ-панель'
        },
        en: {
          orderType: isGuest ? 'guest order' : 'order',
          title: `🔔 New ${isGuest ? 'guest order' : 'order'} #${orderId}`,
          body: `Customer: ${customerName}, Amount: ${totalAmount}₽`,
          viewOrder: 'View order',
          adminPanel: 'Admin panel'
        },
        he: {
          orderType: isGuest ? 'הזמנת אורח' : 'הזמנה',
          title: `🔔 ${isGuest ? 'הזמנת אורח חדשה' : 'הזמנה חדשה'} #${orderId}`,
          body: `לקוח: ${customerName}, סכום: ${totalAmount}₽`,
          viewOrder: 'צפה בהזמנה',
          adminPanel: 'פאנל ניהול'
        },
        ar: {
          orderType: isGuest ? 'طلب ضيف' : 'طلب',
          title: `🔔 ${isGuest ? 'طلب ضيف جديد' : 'طلب جديد'} #${orderId}`,
          body: `العميل: ${customerName}، المبلغ: ${totalAmount}₽`,
          viewOrder: 'عرض الطلب',
          adminPanel: 'لوحة الإدارة'
        }
      };

      // Отправить уведомления всем админам и работникам с поддержкой языков
      const promises = adminUsers.map(async (adminUser: any) => {
        // Определить язык пользователя (по умолчанию русский)
        const userLanguage = adminUser.preferredLanguage || 'ru';
        const msg = messages[userLanguage as keyof typeof messages] || messages.ru;

        const notification = {
          title: msg.title,
          body: msg.body,
          data: {
            type: 'new-order',
            orderId,
            customerName,
            totalAmount,
            isGuest,
            language: userLanguage
          },
          actions: [
            {
              action: 'view-order',
              title: msg.viewOrder
            },
            {
              action: 'admin-dashboard',
              title: msg.adminPanel
            }
          ]
        };

        return this.sendToUser(adminUser.id, notification);
      });

      await Promise.all(promises);
      console.log(`📱 New order notification sent to ${adminUsers.length} admin/worker users for order #${orderId}`);
      
    } catch (error) {
      console.error('Error sending new order notification:', error);
    }
  }

  // Напоминание о корзине
  static async sendCartReminder(userId: string, cartCount: number, language: string = 'ru') {
    const messages: Record<string, { title: string; body: string }> = {
      ru: {
        title: '🛒 Не забудьте о своем заказе!',
        body: `У вас ${cartCount} товаров в корзине. Завершите заказ, пока товары доступны!`
      },
      en: {
        title: '🛒 Don\'t forget your order!',
        body: `You have ${cartCount} items in your cart. Complete your order while items are available!`
      },
      he: {
        title: '🛒 אל תשכחו את ההזמנה שלכם!',
        body: `יש לכם ${cartCount} פריטים בעגלה. השלימו את ההזמנה בזמן שהפריטים זמינים!`
      },
      ar: {
        title: '🛒 لا تنسوا طلبكم!',
        body: `لديكم ${cartCount} عناصر في السلة. أكملوا الطلب بينما العناصر متوفرة!`
      }
    };

    const msg = messages[language] || messages['ru'];

    await this.sendToUser(userId, {
      title: msg.title,
      body: msg.body,
      data: {
        type: 'cart-reminder',
        cartCount
      },
      actions: [
        {
          action: 'view-cart',
          title: 'Открыть корзину'
        },
        {
          action: 'checkout',
          title: 'Оформить заказ'
        }
      ]
    });
  }

  // Отправить маркетинговое уведомление с учетом языка пользователя
  static async sendMarketingNotification({
    title,
    message,
    titleEn,
    messageEn,
    titleHe,
    messageHe,
    titleAr,
    messageAr,
    notificationId
  }: {
    title: string;
    message: string;
    titleEn?: string;
    messageEn?: string;
    titleHe?: string;
    messageHe?: string;
    titleAr?: string;
    messageAr?: string;
    notificationId: number;
  }) {
    try {
      const db = await getDB();
      const subscriptions = await db.select().from(pushSubscriptions);
      console.log(`📡 Attempting to send marketing notification to ${subscriptions.length} subscriptions`);

      if (subscriptions.length === 0) {
        return { success: true, sent: 0, failed: 0, total: 0 };
      }

      // Для каждой подписки отправляем уведомление на русском языке (основной язык)
      // В будущем можно добавить определение языка пользователя из базы данных
      const uniqueTag = `marketing-${notificationId}-${Date.now()}`;
      const payload = JSON.stringify({
        title: title,
        body: message,
        icon: '/api/icons/icon-192x192.png',
        badge: '/api/icons/icon-96x96.png',
        tag: uniqueTag,
        renotify: false,
        data: {
          type: 'marketing',
          notificationId: notificationId,
          language: 'ru',
          timestamp: Date.now()
        },
        actions: []
      });

      console.log(`📄 Marketing notification payload:`, JSON.stringify({ title, message }, null, 2));

      const promises = subscriptions.map((sub: any) => {
        const pushConfig = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth,
            p256dh: sub.p256dh
          }
        };

        return webpush.sendNotification(pushConfig, payload)
          .then(result => {
            console.log('✅ Marketing notification sent successfully to:', sub.endpoint.substring(0, 50) + '...');
            return result;
          })
          .catch(error => {
            console.error('❌ Marketing notification failed for:', sub.endpoint.substring(0, 50) + '...', error);
            if (error.statusCode === 404 || error.statusCode === 410) {
              console.log('🗑️ Removing invalid subscription:', sub.id);
              return db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
            }
            throw error;
          });
      });

      const results = await Promise.allSettled(promises);
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;
      
      console.log(`📊 Marketing notification results: ${successful} successful, ${failed} failed out of ${subscriptions.length} total`);
      
      if (failed > 0) {
        const failedResults = results.filter(result => result.status === 'rejected') as PromiseRejectedResult[];
        failedResults.forEach((result, index) => {
          console.error(`❌ Failed marketing notification ${index + 1}:`, result.reason);
        });
      }
      
      return { success: true, sent: successful, failed: failed, total: subscriptions.length };
    } catch (error) {
      console.error('Error sending marketing notification:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static getPublicKey() {
    return VAPID_PUBLIC_KEY;
  }
}