import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../middleware/auth-guard";
import { emailService, sendNewOrderEmail, sendGuestOrderEmail } from "../email-service";
import { sendFacebookPurchaseEvent, type FacebookOrderData } from "../facebook-conversions-api";
import { PushNotificationService } from "../push-notifications";
import { insertOrderSchema } from "@shared/schema";
import { z } from "zod";
import { randomBytes } from "crypto";

const router = Router();

router.get('/orders', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const orders = user.role === 'admin' || user.role === 'worker'
      ? await storage.getOrders()
      : await storage.getOrders(userId);

    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

router.get('/orders/my', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const orders = await storage.getOrders(userId);
    res.json(orders);
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({ message: "Failed to fetch user orders" });
  }
});

router.get('/orders/guest/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const order = await storage.getGuestOrderByToken(token);

    if (!order) {
      return res.status(404).json({ message: "Order not found or token expired" });
    }

    res.json(order);
  } catch (error) {
    console.error("Error fetching guest order:", error);
    res.status(500).json({ message: "Failed to fetch order" });
  }
});

router.post('/orders/guest/:token/send-email', async (req, res) => {
  try {
    const { token } = req.params;

    const emailSchema = z.object({
      email: z.string().email("Invalid email format").min(1, "Email is required")
    });

    const validationResult = emailSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: validationResult.error.errors
      });
    }

    const { email } = validationResult.data;

    const order = await storage.getGuestOrderByToken(token);
    if (!order) {
      return res.status(404).json({ message: "Order not found or token expired" });
    }

    const itemsWithProducts = order.items.map(item => ({
      productId: item.productId,
      quantity: parseInt(item.quantity),
      pricePerKg: parseFloat(item.pricePerKg),
      totalPrice: parseFloat(item.totalPrice),
      product: item.product ? {
        name: item.product.name,
        unit: item.product.unit || 'кг'
      } : null
    }));

    const currentStoreSettings = await storage.getStoreSettings();
    if (!currentStoreSettings?.emailNotificationsEnabled) {
      return res.status(503).json({ message: "Email service is not available" });
    }

    emailService.updateSettings({
      useSendgrid: currentStoreSettings.useSendgrid || false,
      smtpHost: currentStoreSettings.smtpHost || undefined,
      smtpPort: currentStoreSettings.smtpPort || undefined,
      smtpSecure: currentStoreSettings.smtpSecure || undefined,
      smtpUser: currentStoreSettings.smtpUser || undefined,
      smtpPassword: currentStoreSettings.smtpPassword || undefined,
      sendgridApiKey: currentStoreSettings.sendgridApiKey || undefined
    });

    const fromEmail = currentStoreSettings.orderNotificationFromEmail || 'noreply@ordis.co.il';
    const fromName = currentStoreSettings.orderNotificationFromName || 'eDAHouse Store';
    const storeName = currentStoreSettings.storeName || 'eDAHouse';
    const baseUrl = req.get('host') ? `${req.protocol}://${req.get('host')}` : undefined;

    await sendGuestOrderEmail(
      order.id,
      order.guestName || 'Гость',
      email.trim(),
      order.totalAmount.toString(),
      {
        customerPhone: order.guestPhone,
        deliveryAddress: order.deliveryAddress,
        deliveryDate: order.deliveryDate,
        deliveryTime: order.deliveryTime,
        paymentMethod: order.paymentMethod,
        customerNotes: order.customerNotes,
        status: order.status,
        items: itemsWithProducts
      },
      order.guestAccessToken ?? '',
      order.guestClaimToken ?? '',
      fromEmail,
      fromName,
      order.orderLanguage || 'ru',
      storeName,
      baseUrl
    );

    res.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending guest order email:", error);
    res.status(500).json({ message: "Failed to send email" });
  }
});

router.post('/orders/guest', async (req: any, res) => {
  try {
    const { items, totalAmount, guestInfo, language } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Invalid order items" });
    }

    if (!guestInfo || !guestInfo.firstName || !guestInfo.lastName || !guestInfo.phone || !guestInfo.address) {
      return res.status(400).json({ message: "Guest information is required" });
    }

    const guestAccessToken = randomBytes(32).toString('hex');
    const guestClaimToken = randomBytes(32).toString('hex');
    const guestAccessTokenExpires = new Date();
    guestAccessTokenExpires.setDate(guestAccessTokenExpires.getDate() + 30);

    const orderData = {
      userId: null,
      totalAmount,
      status: "pending" as const,
      deliveryAddress: guestInfo.address,
      guestName: `${guestInfo.firstName} ${guestInfo.lastName}`,
      guestEmail: guestInfo.email,
      guestPhone: guestInfo.phone,
      deliveryDate: guestInfo.deliveryDate,
      deliveryTime: guestInfo.deliveryTime,
      paymentMethod: guestInfo.paymentMethod,
      guestAccessToken,
      guestAccessTokenExpires,
      guestClaimToken,
      orderLanguage: language || 'ru'
    };

    const orderItems = items.map((item: any) => ({
      productId: item.productId,
      quantity: item.quantity.toString(),
      pricePerKg: item.pricePerKg.toString(),
      totalPrice: item.totalPrice.toString(),
      orderId: 0
    }));

    const order = await storage.createOrder(orderData, orderItems);

    try {
      await PushNotificationService.notifyNewOrder(
        order.id,
        orderData.guestName || 'Гость',
        totalAmount.toString(),
        true
      );
    } catch (pushError) {
      console.error('Error sending new order push notification:', pushError);
    }

    try {
      const currentStoreSettings = await storage.getStoreSettings();
      if (currentStoreSettings?.emailNotificationsEnabled && currentStoreSettings?.orderNotificationEmail) {
        emailService.updateSettings({
          useSendgrid: currentStoreSettings.useSendgrid || false,
          smtpHost: currentStoreSettings.smtpHost || undefined,
          smtpPort: currentStoreSettings.smtpPort || undefined,
          smtpSecure: currentStoreSettings.smtpSecure || undefined,
          smtpUser: currentStoreSettings.smtpUser || undefined,
          smtpPassword: currentStoreSettings.smtpPassword || undefined,
          sendgridApiKey: currentStoreSettings.sendgridApiKey || undefined
        });

        const productIds = orderItems.map((item: any) => item.productId);
        const productsMap = await storage.getProductsByIds(productIds)
          .then(products => new Map(products.map(p => [p.id, p])));

        const itemsWithProducts = orderItems.map((item: any) => {
          const product = productsMap.get(item.productId);
          return {
            productId: item.productId,
            quantity: parseInt(item.quantity),
            pricePerKg: parseFloat(item.pricePerKg),
            totalPrice: parseFloat(item.totalPrice),
            product: product ? { name: product.name, unit: product.unit || 'кг' } : null
          };
        });

        await sendNewOrderEmail(
          order.id,
          orderData.guestName || 'Гость',
          totalAmount.toString(),
          {
            customerPhone: guestInfo.phone,
            deliveryAddress: guestInfo.address,
            deliveryDate: guestInfo.deliveryDate,
            deliveryTime: guestInfo.deliveryTime,
            paymentMethod: guestInfo.paymentMethod,
            customerNotes: guestInfo.customerNotes,
            status: 'pending',
            items: itemsWithProducts
          },
          currentStoreSettings.orderNotificationEmail,
          currentStoreSettings.orderNotificationFromEmail || 'noreply@ordis.co.il',
          currentStoreSettings.orderNotificationFromName || 'eDAHouse Store',
          currentStoreSettings.defaultLanguage || 'ru',
          currentStoreSettings.storeName || 'eDAHouse',
          req.get('host') ? `${req.protocol}://${req.get('host')}` : undefined
        );

        if (guestInfo.email && guestInfo.email.trim()) {
          const fromEmail = currentStoreSettings.orderNotificationFromEmail || 'noreply@ordis.co.il';
          const fromName = currentStoreSettings.orderNotificationFromName || 'eDAHouse Store';
          const storeName = currentStoreSettings.storeName || 'eDAHouse';
          const baseUrl = req.get('host') ? `${req.protocol}://${req.get('host')}` : undefined;

          await sendGuestOrderEmail(
            order.id,
            orderData.guestName || 'Гость',
            guestInfo.email,
            totalAmount.toString(),
            {
              customerPhone: guestInfo.phone,
              deliveryAddress: guestInfo.address,
              deliveryDate: guestInfo.deliveryDate,
              deliveryTime: guestInfo.deliveryTime,
              paymentMethod: guestInfo.paymentMethod,
              customerNotes: guestInfo.customerNotes,
              status: 'pending',
              items: itemsWithProducts
            },
            guestAccessToken,
            guestClaimToken,
            fromEmail,
            fromName,
            orderData.orderLanguage || 'ru',
            storeName,
            baseUrl
          );
        }
      }
    } catch (emailError) {
      console.error('Error sending email notifications:', emailError);
    }

    try {
      const currentStoreSettings = await storage.getStoreSettings();
      if (
        currentStoreSettings?.facebookConversionsApiEnabled &&
        currentStoreSettings?.facebookPixelId &&
        currentStoreSettings?.facebookAccessToken
      ) {
        const fbOrderData: FacebookOrderData = {
          orderId: order.id,
          email: guestInfo.email,
          phone: guestInfo.phone,
          firstName: guestInfo.firstName,
          lastName: guestInfo.lastName,
          totalAmount: typeof totalAmount === 'string' ? parseFloat(totalAmount) : totalAmount,
          currency: 'ILS',
          items: items.map((item: any) => ({
            productId: item.productId,
            quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
            price: typeof item.pricePerKg === 'string' ? parseFloat(item.pricePerKg) : item.pricePerKg,
          })),
          eventSourceUrl: req.get('origin') || req.get('referer') || `${req.protocol}://${req.get('host')}`,
          clientIp: req.ip || req.headers['x-forwarded-for'] as string,
          clientUserAgent: req.headers['user-agent'],
          fbp: req.cookies?._fbp,
          fbc: req.cookies?._fbc || (req.query?.fbclid ? `fb.1.${Date.now()}.${req.query.fbclid}` : undefined),
        };

        await sendFacebookPurchaseEvent(
          currentStoreSettings.facebookPixelId,
          currentStoreSettings.facebookAccessToken,
          fbOrderData
        );
      }
    } catch (fbError) {
      console.error('Error sending Facebook Conversions API event:', fbError);
    }

    res.status(201).json({
      orderId: order.id,
      guestAccessToken,
      guestClaimToken,
      orderLanguage: orderData.orderLanguage
    });
  } catch (error) {
    console.error("Error creating guest order:", error);
    res.status(500).json({ message: "Failed to create order" });
  }
});

router.post('/orders', async (req: any, res) => {
  try {
    let userId = null;
    let user = null;

    if (req.isAuthenticated && req.isAuthenticated() && req.user?.id) {
      userId = req.user.id;
      user = await storage.getUser(userId);
    } else if (req.body.userId) {
      userId = req.body.userId;
      user = await storage.getUser(userId);
    }

    const { items, language, ...orderData } = req.body;

    const orderSchema = insertOrderSchema.extend({
      requestedDeliveryDate: z.string().optional(),
      requestedDeliveryTime: z.string().optional(),
      items: z.array(z.object({
        productId: z.number(),
        quantity: z.string(),
        pricePerKg: z.string(),
        totalPrice: z.string(),
      }))
    });

    const validatedData = orderSchema.parse({ ...orderData, userId, items });

    const { requestedDeliveryDate, requestedDeliveryTime, items: _, ...orderDataWithoutTemp } = validatedData;
    let processedOrderData = { ...orderDataWithoutTemp };

    if (userId) {
      processedOrderData.userId = userId;
    }

    processedOrderData.orderLanguage = language || 'ru';

    if (requestedDeliveryTime && requestedDeliveryDate) {
      processedOrderData.deliveryDate = requestedDeliveryDate;
      processedOrderData.deliveryTime = requestedDeliveryTime;
    }

    delete (processedOrderData as any).requestedDeliveryDate;
    delete (processedOrderData as any).requestedDeliveryTime;

    const order = await storage.createOrder(
      processedOrderData,
      validatedData.items.map(item => ({ ...item, orderId: 0 }))
    );

    try {
      const customerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Пользователь';
      await PushNotificationService.notifyNewOrder(
        order.id,
        customerName,
        validatedData.totalAmount?.toString() || '0',
        false
      );
    } catch (pushError) {
      console.error('Error sending new order push notification:', pushError);
    }

    try {
      const currentStoreSettings = await storage.getStoreSettings();
      if (currentStoreSettings?.emailNotificationsEnabled && currentStoreSettings?.orderNotificationEmail) {
        emailService.updateSettings({
          useSendgrid: currentStoreSettings.useSendgrid || false,
          smtpHost: currentStoreSettings.smtpHost || undefined,
          smtpPort: currentStoreSettings.smtpPort || undefined,
          smtpSecure: currentStoreSettings.smtpSecure || undefined,
          smtpUser: currentStoreSettings.smtpUser || undefined,
          smtpPassword: currentStoreSettings.smtpPassword || undefined,
          sendgridApiKey: currentStoreSettings.sendgridApiKey || undefined
        });

        const productIds = validatedData.items.map((item: any) => item.productId);
        const productsMap = await storage.getProductsByIds(productIds)
          .then(products => new Map(products.map(p => [p.id, p])));

        const itemsWithProducts = validatedData.items.map((item: any) => {
          const product = productsMap.get(item.productId);
          return {
            productId: item.productId,
            quantity: parseInt(item.quantity),
            pricePerKg: parseFloat(item.pricePerKg),
            totalPrice: parseFloat(item.totalPrice),
            product: product ? { name: product.name, unit: product.unit || 'кг' } : null
          };
        });

        const customerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Пользователь';
        await sendNewOrderEmail(
          order.id,
          customerName,
          validatedData.totalAmount?.toString() || '0',
          {
            customerPhone: orderData.customerPhone || user?.phone,
            deliveryAddress: orderData.deliveryAddress,
            deliveryDate: orderData.deliveryDate,
            deliveryTime: orderData.deliveryTime,
            paymentMethod: orderData.paymentMethod,
            customerNotes: orderData.customerNotes,
            status: 'pending',
            items: itemsWithProducts
          },
          currentStoreSettings.orderNotificationEmail,
          currentStoreSettings.orderNotificationFromEmail || 'noreply@ordis.co.il',
          currentStoreSettings.orderNotificationFromName || 'eDAHouse Store',
          currentStoreSettings.defaultLanguage || 'ru',
          currentStoreSettings.storeName || 'eDAHouse',
          req.get('host') ? `${req.protocol}://${req.get('host')}` : undefined
        );
      }
    } catch (emailError) {
      console.error('Error sending new order email notification:', emailError);
    }

    try {
      const currentStoreSettings = await storage.getStoreSettings();
      if (
        currentStoreSettings?.facebookConversionsApiEnabled &&
        currentStoreSettings?.facebookPixelId &&
        currentStoreSettings?.facebookAccessToken
      ) {
        const fbOrderData: FacebookOrderData = {
          orderId: order.id,
          email: user?.email || undefined,
          phone: orderData.customerPhone || user?.phone,
          firstName: user?.firstName || undefined,
          lastName: user?.lastName || undefined,
          totalAmount: typeof validatedData.totalAmount === 'string' ? parseFloat(validatedData.totalAmount as string) : (validatedData.totalAmount as number),
          currency: 'ILS',
          items: validatedData.items.map((item: any) => ({
            productId: item.productId,
            quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
            price: typeof item.pricePerKg === 'string' ? parseFloat(item.pricePerKg) : item.pricePerKg,
          })),
          eventSourceUrl: req.get('origin') || req.get('referer') || `${req.protocol}://${req.get('host')}`,
          clientIp: req.ip || req.headers['x-forwarded-for'] as string,
          clientUserAgent: req.headers['user-agent'],
          fbp: req.cookies?._fbp,
          fbc: req.cookies?._fbc || (req.query?.fbclid ? `fb.1.${Date.now()}.${req.query.fbclid}` : undefined),
        };

        await sendFacebookPurchaseEvent(
          currentStoreSettings.facebookPixelId,
          currentStoreSettings.facebookAccessToken,
          fbOrderData
        );
      }
    } catch (fbError) {
      console.error('Error sending Facebook Conversions API event:', fbError);
    }

    res.json(order);
  } catch (error) {
    console.error("Error creating order:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to create order" });
  }
});

router.post('/orders/claim', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { claimToken } = req.body;

    if (!claimToken) {
      return res.status(400).json({ message: "Claim token is required" });
    }

    const order = await storage.claimGuestOrder(claimToken, userId);
    if (!order) {
      return res.status(404).json({ message: "Order not found or already claimed" });
    }

    res.json(order);
  } catch (error) {
    console.error("Error claiming order:", error);
    res.status(500).json({ message: "Failed to claim order" });
  }
});

export default router;
