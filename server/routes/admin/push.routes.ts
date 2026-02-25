import { Router } from "express";
import { isAuthenticated } from "../../middleware/auth-guard";
import { PushNotificationService } from "../../push-notifications";
import { getDB } from "../../db";
import { sql } from "drizzle-orm";
import { pushSubscriptions, marketingNotifications } from "@shared/schema";

const router = Router();

router.get('/push/vapid-key', (req, res) => {
  res.json({ publicKey: PushNotificationService.getPublicKey() });
});

router.post('/push/subscribe', async (req: any, res) => {
  try {
    const userId = req.user?.id || 'guest';
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: 'Invalid subscription data' });
    }

    const db = await getDB();
    const existingSubscription = await db
      .select()
      .from(pushSubscriptions)
      .where(sql`user_id = ${userId}`)
      .limit(1);

    if (existingSubscription.length > 0) {
      await db
        .update(pushSubscriptions)
        .set({
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: req.headers['user-agent'] || '',
          updatedAt: new Date()
        })
        .where(sql`user_id = ${userId}`);

      return res.json({ message: 'Subscription updated successfully' });
    } else {
      await db.insert(pushSubscriptions).values({
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: req.headers['user-agent'] || ''
      });
    }

    res.json({ message: 'Subscription saved successfully' });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ message: 'Failed to save subscription' });
  }
});

router.delete('/push/unsubscribe', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { endpoint } = req.body;

    const db = await getDB();
    await db
      .delete(pushSubscriptions)
      .where(sql`endpoint = ${endpoint} AND user_id = ${userId}`);

    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({ message: 'Failed to unsubscribe' });
  }
});

router.post('/test/push/marketing', async (req: any, res) => {
  try {
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const db = await getDB();
    const [notification] = await db.insert(marketingNotifications).values({
      title,
      message,
      createdBy: 'test',
      sentAt: new Date()
    }).returning();

    const result = await PushNotificationService.sendMarketingNotification({
      title,
      message,
      notificationId: notification.id
    });

    let totalSent = 0;
    if (result.success) {
      totalSent = result.sent || 0;
    }

    await db
      .update(marketingNotifications)
      .set({ sentCount: totalSent })
      .where(sql`id = ${notification.id}`);

    res.json({
      message: 'Test marketing notification sent successfully',
      sentCount: totalSent,
      notificationId: notification.id
    });
  } catch (error) {
    console.error('Error sending test marketing notification:', error);
    res.status(500).json({ message: 'Failed to send test marketing notification' });
  }
});

router.post('/admin/push/marketing', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { title, message, titleEn, messageEn, titleHe, messageHe, titleAr, messageAr } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const db = await getDB();
    const [notification] = await db.insert(marketingNotifications).values({
      title,
      message,
      titleEn: titleEn || null,
      messageEn: messageEn || null,
      titleHe: titleHe || null,
      messageHe: messageHe || null,
      titleAr: titleAr || null,
      messageAr: messageAr || null,
      createdBy: user.id,
      sentAt: new Date()
    }).returning();

    const result = await PushNotificationService.sendMarketingNotification({
      title,
      message,
      titleEn,
      messageEn,
      titleHe,
      messageHe,
      titleAr,
      messageAr,
      notificationId: notification.id
    });

    let totalSent = 0;
    if (result.success) {
      totalSent = result.sent || 0;
    }

    await db
      .update(marketingNotifications)
      .set({ sentCount: totalSent })
      .where(sql`id = ${notification.id}`);

    res.json({
      message: 'Marketing notification sent successfully',
      sentCount: totalSent,
      notificationId: notification.id
    });
  } catch (error) {
    console.error('Error sending marketing notification:', error);
    res.status(500).json({ message: 'Failed to send marketing notification' });
  }
});

router.get('/admin/push/stats', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const db = await getDB();
    const subscriptionsCount = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(pushSubscriptions);

    res.json({ totalSubscriptions: subscriptionsCount[0]?.count || 0 });
  } catch (error) {
    console.error('Error fetching push statistics:', error);
    res.status(500).json({ message: 'Failed to fetch push statistics' });
  }
});

router.get('/admin/push/marketing', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const db = await getDB();
    const notifications = await db
      .select()
      .from(marketingNotifications)
      .orderBy(sql`created_at DESC`)
      .limit(50);

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching marketing notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

router.post('/admin/push/test', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    await PushNotificationService.sendToUser(user.id, {
      title: '🧪 Тестовое уведомление',
      body: 'Система push уведомлений работает корректно!',
      data: { type: 'test' }
    });

    res.json({ message: 'Test notification sent' });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ message: 'Failed to send test notification' });
  }
});

export default router;
