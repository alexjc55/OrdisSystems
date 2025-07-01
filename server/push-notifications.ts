import webpush from 'web-push';
import { db } from './db';
import { pushSubscriptions } from '@shared/schema';
import { eq } from 'drizzle-orm';

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

      const promises = subscriptions.map(sub => {
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
      let query = db.select().from(pushSubscriptions);
      
      if (userType) {
        // Здесь можно добавить фильтрацию по типу пользователя
        // если нужно отправлять только определенным ролям
      }

      const subscriptions = await query;

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/api/icons/icon-192x192.png',
        badge: notification.badge || '/api/icons/icon-96x96.png',
        data: notification.data || {},
        actions: notification.actions || []
      });

      const promises = subscriptions.map(sub => {
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
            if (error.statusCode === 404 || error.statusCode === 410) {
              return db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
            }
          });
      });

      await Promise.all(promises);
      return { success: true, sent: subscriptions.length };
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
      body: messages[status] || `Статус заказа изменен на: ${status}`,
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

  // Напоминание о корзине
  static async sendCartReminder(userId: string, cartCount: number, language: string = 'ru') {
    const messages = {
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

    const msg = messages[language] || messages.ru;

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

  static getPublicKey() {
    return VAPID_PUBLIC_KEY;
  }
}