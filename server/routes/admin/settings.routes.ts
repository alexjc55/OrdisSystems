import { Router } from "express";
import { storage } from "../../storage";
import { isAuthenticated } from "../../middleware/auth-guard";
import { emailService } from "../../email-service";
import { getDB } from "../../db";
import { sql } from "drizzle-orm";
import { insertStoreSettingsSchema, storeSettings, closedDates, insertClosedDateSchema } from "@shared/schema";
import { z } from "zod";
import { deleteUploadFiles } from "../../utils/delete-upload-file";

const router = Router();

router.get('/settings', async (req, res) => {
  try {
    const settings = await storage.getStoreSettings();
    res.json(settings);
  } catch (error) {
    console.error("Error fetching store settings:", error);
    res.status(500).json({ message: "Failed to fetch store settings" });
  }
});

router.put('/settings', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    const currentSettings = await storage.getStoreSettings();
    if (!currentSettings) {
      return res.status(404).json({ message: "Store settings not found" });
    }

    const bodyData = { ...req.body };

    // Never overwrite the SMTP password with an empty string —
    // keep the stored value if the incoming value is blank
    if (!bodyData.smtpPassword || bodyData.smtpPassword.trim() === '') {
      delete bodyData.smtpPassword;
    }

    const mergedData = {
      ...currentSettings,
      ...bodyData,
      id: currentSettings.id
    };

    insertStoreSettingsSchema.partial().parse(req.body);
    const settings = await storage.updateStoreSettings(mergedData);

    res.json(settings);
  } catch (error) {
    console.error("Error updating store settings:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to update store settings" });
  }
});

router.get('/manifest', async (req, res) => {
  try {
    const settings = await storage.getStoreSettings();
    const acceptLanguage = req.headers['accept-language'];
    let currentLang = 'ru';

    if (acceptLanguage) {
      if (acceptLanguage.includes('en')) currentLang = 'en';
      else if (acceptLanguage.includes('he')) currentLang = 'he';
      else if (acceptLanguage.includes('ar')) currentLang = 'ar';
    }

    const getPwaField = (field: string) => {
      if (currentLang === 'ru') return (settings as any)?.[field] || '';
      const langField = `${field}${currentLang.charAt(0).toUpperCase() + currentLang.slice(1)}`;
      return (settings as any)?.[langField] || (settings as any)?.[field] || '';
    };

    const activeTheme = await storage.getActiveTheme();
    const themeColor = (activeTheme as any)?.primaryColor || '#f97316';
    const splashBg = (activeTheme as any)?.splashBgColor || '#ffffff';

    const manifest = {
      name: getPwaField('pwaName') || 'eDAHouse',
      short_name: getPwaField('pwaName')?.split(' ')[0] || 'eDAHouse',
      description: getPwaField('pwaDescription') || 'Готовые блюда с доставкой',
      start_url: '/',
      display: 'standalone',
      background_color: splashBg,
      theme_color: themeColor,
      orientation: 'portrait-primary',
      scope: '/',
      categories: ['food', 'shopping', 'lifestyle'],
      lang: currentLang,
      icons: [
        { src: settings?.pwaIcon || '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png', purpose: 'any maskable' },
        { src: settings?.pwaIcon || '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'any maskable' },
        { src: settings?.pwaIcon || '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png', purpose: 'any maskable' },
        { src: settings?.pwaIcon || '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png', purpose: 'any maskable' },
        { src: settings?.pwaIcon || '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png', purpose: 'any maskable' },
        { src: settings?.pwaIcon || '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: settings?.pwaIcon || '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png', purpose: 'any maskable' },
        { src: settings?.pwaIcon || '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ],
      shortcuts: [
        {
          name: currentLang === 'en' ? 'Product Catalog' : currentLang === 'he' ? 'קטלוג מוצרים' : currentLang === 'ar' ? 'كتالوج المنتجات' : 'Каталог продуктов',
          short_name: currentLang === 'en' ? 'Catalog' : currentLang === 'he' ? 'קטלוג' : currentLang === 'ar' ? 'كتالوج' : 'Каталог',
          description: currentLang === 'en' ? 'View all products' : currentLang === 'he' ? 'צפה בכל המוצרים' : currentLang === 'ar' ? 'عرض جميع المنتجات' : 'Просмотр всех продуктов',
          url: '/',
          icons: [{ src: settings?.pwaIcon || '/icons/icon-96x96.png', sizes: '96x96' }]
        },
        {
          name: currentLang === 'en' ? 'Shopping Cart' : currentLang === 'he' ? 'עגלת קניות' : currentLang === 'ar' ? 'سلة التسوق' : 'Корзина',
          short_name: currentLang === 'en' ? 'Cart' : currentLang === 'he' ? 'עגלה' : currentLang === 'ar' ? 'سلة' : 'Корзина',
          description: currentLang === 'en' ? 'View shopping cart' : currentLang === 'he' ? 'צפה בעגלת הקניות' : currentLang === 'ar' ? 'عرض سلة التسوق' : 'Просмотр корзины покупок',
          url: '/checkout',
          icons: [{ src: settings?.pwaIcon || '/icons/icon-96x96.png', sizes: '96x96' }]
        }
      ]
    };

    res.setHeader('Content-Type', 'application/manifest+json');
    res.json(manifest);
  } catch (error) {
    console.error('Error generating PWA manifest:', error);
    res.status(500).json({ message: 'Failed to generate PWA manifest' });
  }
});

router.get('/favicon', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Expires', new Date(Date.now() + 3600000).toUTCString());

    const settings = await storage.getStoreSettings();

    if (settings?.pwaIcon) {
      res.redirect(301, settings.pwaIcon);
    } else {
      res.redirect(301, '/favicon.ico');
    }
  } catch (error) {
    console.error('Error serving favicon:', error);
    res.redirect(301, '/favicon.ico');
  }
});

router.post("/test-email", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { toEmail } = req.body;

    if (!toEmail) {
      return res.status(400).json({ success: false, message: "Email address is required" });
    }

    const db = await getDB();
    const [settingsData] = await db.select().from(storeSettings).limit(1);

    if (!settingsData?.emailNotificationsEnabled) {
      return res.status(400).json({
        success: false,
        message: "Email notifications are disabled in settings"
      });
    }

    await emailService.updateSettings({
      useSendgrid: settingsData.useSendgrid || false,
      sendgridApiKey: process.env.SENDGRID_API_KEY,
      smtpHost: settingsData.smtpHost,
      smtpPort: settingsData.smtpPort,
      smtpSecure: settingsData.smtpSecure,
      smtpUser: settingsData.smtpUser,
      smtpPassword: settingsData.smtpPassword
    });

    const storeName = settingsData.storeName || 'Ordis';
    const lang = settingsData.defaultLanguage || 'ru';
    const isRTL = lang === 'he' || lang === 'ar';

    const i18n: Record<string, { subject: string; heading: string; body: string; success: string; sent: string; locale: string }> = {
      ru: {
        subject: `🧪 Тест email - ${storeName}`,
        heading: '🧪 Тест email уведомлений',
        body: `Это тестовое письмо от системы <strong>${storeName}</strong>.`,
        success: 'Если вы получили это письмо, значит email уведомления настроены правильно!',
        sent: 'Отправлено',
        locale: 'ru-RU'
      },
      en: {
        subject: `🧪 Email test - ${storeName}`,
        heading: '🧪 Email notification test',
        body: `This is a test email from <strong>${storeName}</strong> system.`,
        success: 'If you received this email, your email notifications are configured correctly!',
        sent: 'Sent',
        locale: 'en-US'
      },
      he: {
        subject: `🧪 בדיקת אימייל - ${storeName}`,
        heading: '🧪 בדיקת התראות אימייל',
        body: `זוהי הודעת בדיקה ממערכת <strong>${storeName}</strong>.`,
        success: 'אם קיבלת את המייל הזה, התראות האימייל מוגדרות כראוי!',
        sent: 'נשלח',
        locale: 'he-IL'
      },
      ar: {
        subject: `🧪 اختبار البريد الإلكتروني - ${storeName}`,
        heading: '🧪 اختبار إشعارات البريد الإلكتروني',
        body: `هذه رسالة بريد إلكتروني تجريبية من نظام <strong>${storeName}</strong>.`,
        success: 'إذا استلمت هذا البريد الإلكتروني، فإن إشعارات البريد الإلكتروني مُهيَّأة بشكل صحيح!',
        sent: 'أُرسل',
        locale: 'ar-SA'
      }
    };

    const t = i18n[lang] || i18n.ru;
    const dir = isRTL ? 'rtl' : 'ltr';
    const textAlign = isRTL ? 'right' : 'left';

    const emailSent = await emailService.sendEmail({
      to: toEmail,
      from: settingsData.orderNotificationFromEmail || 'noreply@ordis.co.il',
      fromName: settingsData.orderNotificationFromName || storeName,
      subject: t.subject,
      text: `${t.body.replace(/<[^>]+>/g, '')} ${t.success}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: ${dir}; text-align: ${textAlign};">
          <h2 style="color: #f97316;">${t.heading}</h2>
          <p>${t.body}</p>
          <p>${t.success}</p>
          <p style="color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            ${t.sent}: ${new Date().toLocaleString(t.locale)}
          </p>
        </div>
      `
    });

    if (emailSent) {
      res.json({
        success: true,
        message: `✅ Письмо отправлено на ${toEmail}`,
        details: {
          from: settingsData.orderNotificationFromEmail || 'noreply@ordis.co.il',
          to: toEmail,
          provider: settingsData.useSendgrid ? 'SendGrid' : 'SMTP'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Ошибка при отправке тестового письма"
      });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: "Ошибка при отправке тестового письма"
    });
  }
});

router.get('/closed-dates', async (req, res) => {
  try {
    const db = await getDB();
    const dates = await db.select().from(closedDates).orderBy(closedDates.date);
    res.json(dates);
  } catch (error) {
    console.error('Error fetching closed dates:', error);
    res.status(500).json({ message: 'Failed to fetch closed dates' });
  }
});

router.post('/admin/closed-dates', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const validatedData = insertClosedDateSchema.parse(req.body);
    const db = await getDB();

    const [newDate] = await db.insert(closedDates)
      .values(validatedData)
      .returning();

    res.status(201).json(newDate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }

    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return res.status(409).json({
        message: 'Эта дата уже добавлена как выходной день',
        isDuplicate: true
      });
    }

    console.error('Error adding closed date:', error);
    res.status(500).json({ message: 'Failed to add closed date' });
  }
});

router.delete('/admin/closed-dates/:id', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { id } = req.params;
    const db = await getDB();

    await db.delete(closedDates).where(sql`id = ${id}`);

    res.json({ message: 'Closed date deleted successfully' });
  } catch (error) {
    console.error('Error deleting closed date:', error);
    res.status(500).json({ message: 'Failed to delete closed date' });
  }
});

// ── Danger Zone: bulk delete operations (admin only) ──────────────────────────

router.delete('/admin/danger/all-orders', isAuthenticated, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: "Admin access required" });
    const db = await getDB();
    await db.execute(sql`DELETE FROM order_items`);
    await db.execute(sql`DELETE FROM orders`);
    res.json({ message: 'All orders deleted' });
  } catch (error) {
    console.error('Error deleting all orders:', error);
    res.status(500).json({ message: 'Failed to delete orders' });
  }
});

router.delete('/admin/danger/all-users', isAuthenticated, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: "Admin access required" });
    const currentUserId = req.user.id;
    const db = await getDB();

    // Collect avatar image URLs before deleting users
    const avatarRows = await db.execute(sql`SELECT profile_image_url FROM users WHERE id != ${currentUserId}`);
    const avatarUrls: string[] = (avatarRows.rows as any[]).map((r: any) => r.profile_image_url);
    deleteUploadFiles(avatarUrls);

    // Delete order_items first (FK: order_items.order_id → orders.id)
    await db.execute(sql`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id != ${currentUserId} AND user_id IS NOT NULL)`);
    // Delete orders belonging to other users
    await db.execute(sql`DELETE FROM orders WHERE user_id != ${currentUserId} AND user_id IS NOT NULL`);
    // Delete user profile data
    await db.execute(sql`DELETE FROM user_addresses WHERE user_id != ${currentUserId}`);
    await db.execute(sql`DELETE FROM user_branches WHERE user_id != ${currentUserId}`);
    await db.execute(sql`DELETE FROM push_subscriptions WHERE user_id != ${currentUserId}`);
    await db.execute(sql`DELETE FROM users WHERE id != ${currentUserId}`);
    res.json({ message: 'All users deleted except current admin' });
  } catch (error) {
    console.error('Error deleting all users:', error);
    res.status(500).json({ message: 'Failed to delete users' });
  }
});

router.delete('/admin/danger/all-products', isAuthenticated, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: "Admin access required" });
    const db = await getDB();

    // Collect all product image URLs before deleting from DB
    const rows = await db.execute(sql`SELECT image_url, image_url_en, image_url_he, image_url_ar FROM products`);
    const imageUrls: string[] = [];
    for (const row of rows.rows as any[]) {
      imageUrls.push(row.image_url, row.image_url_en, row.image_url_he, row.image_url_ar);
    }
    // Delete files from filesystem
    deleteUploadFiles(imageUrls);

    // Must delete in FK order: junction tables first, then order_items (FK→products), then products
    await db.execute(sql`DELETE FROM product_branch_availability`);
    await db.execute(sql`DELETE FROM product_categories`);
    await db.execute(sql`DELETE FROM order_items`);
    await db.execute(sql`DELETE FROM orders`);
    await db.execute(sql`DELETE FROM products`);
    res.json({ message: 'All products deleted' });
  } catch (error) {
    console.error('Error deleting all products:', error);
    res.status(500).json({ message: 'Failed to delete products' });
  }
});

router.delete('/admin/danger/all-categories', isAuthenticated, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: "Admin access required" });
    const db = await getDB();

    // Collect all category image URLs before deleting from DB
    const rows = await db.execute(sql`SELECT image FROM categories`);
    const imageUrls: string[] = (rows.rows as any[]).map((r: any) => r.image);
    // Delete files from filesystem
    deleteUploadFiles(imageUrls);

    // Delete junction table first, then categories (products remain but unlinked)
    await db.execute(sql`DELETE FROM product_categories`);
    await db.execute(sql`DELETE FROM categories`);
    res.json({ message: 'All categories deleted' });
  } catch (error) {
    console.error('Error deleting all categories:', error);
    res.status(500).json({ message: 'Failed to delete categories' });
  }
});

router.delete('/admin/danger/all-push', isAuthenticated, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: "Admin access required" });
    const db = await getDB();
    await db.execute(sql`DELETE FROM marketing_notifications`);
    await db.execute(sql`DELETE FROM push_subscriptions`);
    res.json({ message: 'All push history and subscriptions deleted' });
  } catch (error) {
    console.error('Error deleting push history:', error);
    res.status(500).json({ message: 'Failed to delete push history' });
  }
});

export default router;
