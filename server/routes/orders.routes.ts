import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../middleware/auth-guard";
import { emailService, sendGuestOrderEmail } from "../email-service";
import { prepareCheckoutEmail } from "../checkout-order-email";
import { sendFacebookPurchaseEvent, type FacebookOrderData } from "../facebook-conversions-api";
import { PushNotificationService } from "../push-notifications";
import { BRANCHES_ENABLED } from "../config";
import { insertOrderSchema, type InsertOrder } from "@shared/schema";
import { z } from "zod";
import { randomBytes } from "crypto";
import { CheckoutQuoteError, quoteCheckout } from "../checkout-quote";

const router = Router();

// ─── Resolve localized payment method names from store settings ───────────────
function resolvePaymentMethodNames(
  paymentMethods: any,
  paymentMethod: string | null | undefined
): Record<string, string> | undefined {
  if (!paymentMethod || !paymentMethods) return undefined;
  let methods: any[] = [];
  try {
    methods = typeof paymentMethods === 'string' ? JSON.parse(paymentMethods) : (Array.isArray(paymentMethods) ? paymentMethods : []);
  } catch { return undefined; }
  const found = methods.find((m: any) =>
    m.name === paymentMethod || m.name_en === paymentMethod ||
    m.name_he === paymentMethod || m.name_ar === paymentMethod
  );
  if (!found) return undefined;
  return { ru: found.name, en: found.name_en, he: found.name_he, ar: found.name_ar };
}

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

router.get('/orders/:id/reorder-items', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) return res.status(400).json({ message: "Invalid order id" });

    const userOrders = await storage.getOrders(userId);
    const order = userOrders.find(o => o.id === orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : null;

    // Fetch all products from the order in parallel
    const productEntries = await Promise.all(
      order.items.map(async (item: any) => {
        const product = await storage.getProductById(item.productId);
        if (!product) return null;
        if (!product.isAvailable) return null;
        return { product, quantity: item.quantity };
      })
    );
    const validEntries = productEntries.filter(Boolean) as { product: any; quantity: number }[];

    // Apply branch-specific availability overrides when branchId is provided
    let available: { product: any; quantity: number }[];
    if (branchId && !isNaN(branchId) && validEntries.length > 0) {
      const productIds = validEntries.map(e => e.product.id);
      const branchOverrides = await storage.getProductsBranchAvailabilityByBranchIds(productIds, [branchId]);
      const overrideMap = new Map(branchOverrides.map((o: any) => [o.productId, o]));

      available = validEntries.filter(({ product }) => {
        const override = overrideMap.get(product.id);
        if (override) {
          // Branch has an explicit record — hide if marked completely unavailable
          return override.isAvailable && override.availabilityStatus !== 'completely_unavailable';
        }
        // No branch override — fall back to global status
        return product.availabilityStatus !== 'completely_unavailable';
      }).map(({ product, quantity }) => {
        // Merge branch override into product so cart sees correct availability status
        const override = overrideMap.get(product.id);
        return { product: override ? { ...product, availabilityStatus: override.availabilityStatus, stockStatus: override.stockStatus } : product, quantity };
      });
    } else {
      // Single-branch / no branch: global availability only
      available = validEntries.filter(({ product }) => product.availabilityStatus !== 'completely_unavailable');
    }

    res.json({ items: available, totalRequested: order.items.length });
  } catch (error) {
    console.error("Error fetching reorder items:", error);
    res.status(500).json({ message: "Failed to fetch reorder items" });
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

    const resendBranchName = order.branchId
      ? (await storage.getBranchById(order.branchId))?.name
      : undefined;

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
    const activeTheme = await storage.getActiveTheme();

    const resendPaymentMethodNames = resolvePaymentMethodNames(currentStoreSettings.paymentMethods, order.paymentMethod);
    const resendDeliveryFee = parseFloat(String(order.deliveryFee || '0'));

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
        items: itemsWithProducts,
        branchName: resendBranchName,
        couponCode: order.couponCode || null,
        couponDiscount: order.couponDiscount ? parseFloat(String(order.couponDiscount)) : null,
        loyaltyDiscount: order.loyaltyDiscount ? parseFloat(String(order.loyaltyDiscount)) : null,
        giftProductId: order.giftProductId || null
      },
      order.guestAccessToken ?? '',
      order.guestClaimToken ?? '',
      fromEmail,
      fromName,
      order.orderLanguage || 'ru',
      storeName,
      baseUrl,
      activeTheme?.primaryColor,
      {
        deliveryFee: resendDeliveryFee,
        paymentMethodNames: resendPaymentMethodNames,
      }
    );

    res.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending guest order email:", error);
    res.status(500).json({ message: "Failed to send email" });
  }
});

router.post('/orders/guest', async (req: any, res) => {
  try {
    const { items, totalAmount, guestInfo, language, branchId, couponCode, giftAccepted } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Invalid order items" });
    }

    if (!guestInfo || !guestInfo.firstName || !guestInfo.lastName || !guestInfo.phone || !guestInfo.address) {
      return res.status(400).json({ message: "Guest information is required" });
    }

    const quote = await quoteCheckout({
      items, totalAmount, language, branchId,
      orderData: {
        deliveryAddress: guestInfo.address,
        guestName: `${guestInfo.firstName} ${guestInfo.lastName}`,
        guestEmail: guestInfo.email,
        guestPhone: guestInfo.phone,
        customerNotes: guestInfo.customerNotes,
        deliveryDate: guestInfo.deliveryDate,
        deliveryTime: guestInfo.deliveryTime,
        paymentMethod: guestInfo.paymentMethod,
        couponCode, giftAccepted,
      },
    }, null, BRANCHES_ENABLED, storage);
    const { orderItems, volumeDiscount: serverVolumeDiscount } = quote;
    const serverCouponCode = quote.orderData.couponCode;
    const deliveryFee = Number(quote.orderData.deliveryFee);

    const guestAccessToken = randomBytes(32).toString('hex');
    const guestClaimToken = randomBytes(32).toString('hex');
    const guestAccessTokenExpires = new Date();
    guestAccessTokenExpires.setDate(guestAccessTokenExpires.getDate() + 30);

    const orderData: InsertOrder = {
      ...quote.orderData,
      guestAccessToken,
      guestAccessTokenExpires,
      guestClaimToken,
    };

    const emailSnapshot = await prepareCheckoutEmail(orderData, orderItems, {
      customerName: orderData.guestName || 'Гость',
      notifyGuest: true,
      customerPhone: guestInfo.phone,
      baseUrl: req.get('host') ? `${req.protocol}://${req.get('host')}` : undefined,
      deliveryFee,
      volumeDiscount: serverVolumeDiscount,
    });
    const order = await storage.createOrder(orderData, orderItems, emailSnapshot);

    // Record coupon usage with server-authoritative coupon code
    if (serverCouponCode) {
      try {
        const coupon = await storage.getCouponByCode(serverCouponCode);
        if (coupon) {
          await storage.recordCouponUse(coupon.id, order.id, null);
        }
      } catch (couponError) {
        console.error('Error recording coupon use:', couponError);
      }
    }

    try {
      await PushNotificationService.notifyNewOrder(
        order.id,
        orderData.guestName || 'Гость',
        orderData.totalAmount,
        true
      );
    } catch (pushError) {
      console.error('Error sending new order push notification:', pushError);
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
          totalAmount: Number(orderData.totalAmount),
          currency: 'ILS',
          items: orderItems.map((item) => ({
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
  } catch (error: any) {
    if (error instanceof CheckoutQuoteError) {
      return res.status(error.status).json({ message: error.message, code: error.code });
    }
    if (error?.isCouponError) {
      return res.status(422).json({ message: "coupon_invalid", couponError: error.couponError });
    }
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
    }

    const { items, language, couponCode: authCouponCode, giftAccepted: authGiftAccepted, ...orderData } = req.body;

    const { requestedDeliveryDate, requestedDeliveryTime } = orderData;
    const deliveryOverride = (requestedDeliveryTime && requestedDeliveryDate)
      ? { deliveryDate: requestedDeliveryDate, deliveryTime: requestedDeliveryTime }
      : {};
    const quote = await quoteCheckout({
      items, totalAmount: orderData.totalAmount, language, branchId: orderData.branchId,
      orderData: { ...orderData, ...deliveryOverride, couponCode: authCouponCode, giftAccepted: authGiftAccepted },
    }, userId, BRANCHES_ENABLED, storage);
    const processedOrderData = insertOrderSchema.parse(quote.orderData);
    const authOrderItems = quote.orderItems;
    const authSvrCouponCode = processedOrderData.couponCode;
    const authDeliveryFee = Number(processedOrderData.deliveryFee);
    const authSvrVolumeDiscount = quote.volumeDiscount;

    const emailSnapshot = await prepareCheckoutEmail(processedOrderData, authOrderItems, {
      customerName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Пользователь',
      notifyGuest: false,
      customerPhone: orderData.customerPhone || user?.phone,
      baseUrl: req.get('host') ? `${req.protocol}://${req.get('host')}` : undefined,
      deliveryFee: authDeliveryFee,
      volumeDiscount: authSvrVolumeDiscount,
    });
    const order = await storage.createOrder(processedOrderData, authOrderItems, emailSnapshot);

    // Record coupon usage with server-authoritative code
    if (authSvrCouponCode) {
      try {
        const coupon = await storage.getCouponByCode(authSvrCouponCode);
        if (coupon) {
          await storage.recordCouponUse(coupon.id, order.id, userId);
        }
      } catch (couponError) {
        console.error('Error recording coupon use for authenticated order:', couponError);
      }
    }

    try {
      const customerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Пользователь';
      await PushNotificationService.notifyNewOrder(
        order.id,
        customerName,
        processedOrderData.totalAmount,
        false
      );
    } catch (pushError) {
      console.error('Error sending new order push notification:', pushError);
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
          totalAmount: Number(processedOrderData.totalAmount),
          currency: 'ILS',
          items: authOrderItems.map((item) => ({
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
  } catch (error: any) {
    if (error instanceof CheckoutQuoteError) {
      return res.status(error.status).json({ message: error.message, code: error.code });
    }
    if (error?.isCouponError) {
      return res.status(422).json({ message: "coupon_invalid", couponError: error.couponError });
    }
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
