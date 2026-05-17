import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../middleware/auth-guard";
import { emailService, sendNewOrderEmail, sendGuestOrderEmail } from "../email-service";
import { sendFacebookPurchaseEvent, type FacebookOrderData } from "../facebook-conversions-api";
import { PushNotificationService } from "../push-notifications";
import { BRANCHES_ENABLED } from "../config";
import { insertOrderSchema, type InsertOrder, type InsertOrderItem } from "@shared/schema";
import { z } from "zod";
import { randomBytes } from "crypto";

const router = Router();

// ─── Server-side discount computation ────────────────────────────────────────
// This ensures discount amounts are authoritative from DB, not from client input.
async function computeServerDiscounts({
  couponCode,
  subtotal,
  userId,
  userEmail,
  userRole,
  giftAccepted,
  orderItems,
}: {
  couponCode?: string | null;
  subtotal: number;
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  giftAccepted?: boolean;
  orderItems?: Array<{ productId: number; quantity: number; totalPrice: string }>;
}): Promise<{
  serverCouponCode: string | null;
  serverCouponDiscount: number;
  serverLoyaltyDiscount: number;
  serverVolumeDiscount: number;
  serverGiftProductId: number | null;
  serverDiscountDetails: Record<string, any>;
  giftOrderItem: InsertOrderItem | null;
}> {
  const settings = await storage.getStoreSettings();

  let serverCouponCode: string | null = null;
  let serverCouponDiscount = 0;
  let serverLoyaltyDiscount = 0;
  let serverVolumeDiscount = 0;
  let serverGiftProductId: number | null = null;
  const serverDiscountDetails: Record<string, any> = {};
  let giftOrderItem: InsertOrderItem | null = null;

  // 1. Volume discounts — computed per item, best (highest minQuantity) applicable tier wins.
  //    Applied first so that subsequent discounts operate on the post-volume subtotal.
  if (orderItems && orderItems.length > 0) {
    const uniqueProductIds = [...new Set(orderItems.map(i => i.productId))];
    const tiersPerProduct = await Promise.all(
      uniqueProductIds.map(async (pid) => ({
        productId: pid,
        tiers: (await storage.getProductVolumeDiscounts(pid)).filter(t => t.isActive),
      }))
    );
    const tiersMap = new Map(tiersPerProduct.map(({ productId, tiers }) => [productId, tiers]));
    const volumeItemBreakdown: Record<number, number> = {};

    for (const item of orderItems) {
      const tiers = tiersMap.get(item.productId) || [];
      const eligible = tiers.filter(t => parseFloat(t.minQuantity) <= item.quantity);
      if (eligible.length === 0) continue;
      const best = eligible.reduce((a, b) => parseFloat(a.minQuantity) >= parseFloat(b.minQuantity) ? a : b);
      const itemTotal = parseFloat(item.totalPrice || '0');
      let itemDiscount = 0;
      if (best.discountType === 'percentage') {
        itemDiscount = Math.round(itemTotal * parseFloat(best.discountValue) / 100 * 100) / 100;
      } else {
        itemDiscount = Math.min(parseFloat(best.discountValue), itemTotal);
      }
      if (itemDiscount > 0) {
        serverVolumeDiscount += itemDiscount;
        volumeItemBreakdown[item.productId] = (volumeItemBreakdown[item.productId] || 0) + itemDiscount;
      }
    }
    serverVolumeDiscount = Math.round(serverVolumeDiscount * 100) / 100;
    if (serverVolumeDiscount > 0) {
      serverDiscountDetails.volumeDiscount = {
        totalAmount: serverVolumeDiscount,
        itemBreakdown: volumeItemBreakdown,
      };
    }
  }

  // Effective subtotal after volume discounts — used as base for loyalty/coupon
  const subtotalAfterVolume = Math.max(0, subtotal - serverVolumeDiscount);

  // 2. Validate coupon from DB (pass userId + userEmail + orderItems for full enforcement)
  if (couponCode) {
    const validation = await storage.validateCoupon(couponCode, subtotalAfterVolume, userId, userEmail, orderItems);
    if (validation.valid && validation.coupon) {
      // Reject product-scoped coupons that match no items in this order's cart
      if (validation.coupon.scope === 'product' && (validation.discountAmount ?? 0) <= 0) {
        throw Object.assign(new Error('coupon_not_eligible_for_cart'), { couponError: 'coupon_not_eligible_for_cart', isCouponError: true });
      }
      serverCouponCode = validation.coupon.code;
      serverCouponDiscount = validation.discountAmount || 0;
      serverDiscountDetails.coupon = {
        code: validation.coupon.code,
        type: validation.coupon.discountType,
        value: parseFloat(validation.coupon.discountValue),
        discountAmount: serverCouponDiscount,
      };
    } else {
      // Coupon was submitted but is invalid — surface reason via thrown error so callers can return 422
      throw Object.assign(new Error(validation.message || 'coupon_invalid'), { couponError: validation.message, isCouponError: true });
    }
  }

  // 3. Loyalty discount for any registered user (not guests)
  //    Non-stacking rule: if coupon was applied, skip loyalty discount
  if (userId && !serverCouponCode && settings?.loyaltyDiscountEnabled) {
    const pct = parseFloat(settings.loyaltyDiscountPercent || '0');
    if (pct > 0) {
      serverLoyaltyDiscount = Math.round(subtotalAfterVolume * pct) / 100;
      serverDiscountDetails.loyalty = { percent: pct, discountAmount: serverLoyaltyDiscount };
    }
  }

  // 4. Gift: only if enabled, amount eligible, and client explicitly accepted.
  //    Threshold is compared against raw subtotal (before discounts) — matches UI behavior.
  if (giftAccepted && settings?.giftEnabled && settings.giftProductId) {
    const minAmount = parseFloat(settings.giftMinOrderAmount || '0');
    if (subtotal >= minAmount) {
      const giftProduct = await storage.getProductById(settings.giftProductId);
      if (giftProduct) {
        serverGiftProductId = giftProduct.id;
        serverDiscountDetails.gift = { productId: giftProduct.id, productName: giftProduct.name };
        // Add gift as zero-price order item
        giftOrderItem = {
          productId: giftProduct.id,
          quantity: '1',
          pricePerKg: '0',
          totalPrice: '0',
          orderId: 0,
        };
      }
    }
  }

  return {
    serverCouponCode,
    serverCouponDiscount,
    serverLoyaltyDiscount,
    serverVolumeDiscount,
    serverGiftProductId,
    serverDiscountDetails,
    giftOrderItem,
  };
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
        branchName: resendBranchName
      },
      order.guestAccessToken ?? '',
      order.guestClaimToken ?? '',
      fromEmail,
      fromName,
      order.orderLanguage || 'ru',
      storeName,
      baseUrl,
      activeTheme?.primaryColor
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

    // Compute subtotal from client items (prices are unit-based; authoritative prices reside in DB
    // but changing unit-based pricing logic server-side is out of scope here)
    const subtotal = items.reduce((sum: number, item: any) => sum + parseFloat(item.totalPrice || '0'), 0);

    // Server-side authoritative discount computation
    const guestOrderItems = items.map((item: any) => ({
      productId: parseInt(item.productId),
      quantity: parseFloat(item.quantity),
      totalPrice: item.totalPrice?.toString() || '0',
    }));
    const {
      serverCouponCode,
      serverCouponDiscount,
      serverLoyaltyDiscount,
      serverVolumeDiscount,
      serverGiftProductId,
      serverDiscountDetails,
      giftOrderItem,
    } = await computeServerDiscounts({
      couponCode: couponCode || null,
      subtotal,
      userId: null, // Guest — no loyalty discount
      giftAccepted: !!giftAccepted,
      orderItems: guestOrderItems,
    });

    const deliveryFee = parseFloat(guestInfo.deliveryFee || '0');
    const serverTotalAmount = Math.max(0, subtotal - serverVolumeDiscount - serverCouponDiscount - serverLoyaltyDiscount + deliveryFee);

    const guestAccessToken = randomBytes(32).toString('hex');
    const guestClaimToken = randomBytes(32).toString('hex');
    const guestAccessTokenExpires = new Date();
    guestAccessTokenExpires.setDate(guestAccessTokenExpires.getDate() + 30);

    const parsedBranchId = BRANCHES_ENABLED && branchId && !isNaN(parseInt(branchId))
      ? parseInt(branchId)
      : undefined;

    const orderData: InsertOrder = {
      userId: null,
      totalAmount: serverTotalAmount.toString(),
      status: "pending",
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
      orderLanguage: language || 'ru',
      ...(parsedBranchId !== undefined ? { branchId: parsedBranchId } : {}),
      ...(serverCouponCode ? { couponCode: serverCouponCode } : {}),
      ...(serverCouponDiscount > 0 ? { couponDiscount: serverCouponDiscount.toString() } : {}),
      ...(serverLoyaltyDiscount > 0 ? { loyaltyDiscount: serverLoyaltyDiscount.toString() } : {}),
      ...(serverGiftProductId ? { giftProductId: serverGiftProductId } : {}),
      ...(Object.keys(serverDiscountDetails).length > 0 ? { discountDetails: serverDiscountDetails } : {}),
    };

    const orderItems: InsertOrderItem[] = items.map((item: any) => ({
      productId: item.productId,
      quantity: item.quantity.toString(),
      pricePerKg: item.pricePerKg.toString(),
      totalPrice: item.totalPrice.toString(),
      orderId: 0
    }));
    if (giftOrderItem) orderItems.push(giftOrderItem);

    const order = await storage.createOrder(orderData, orderItems);

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

        const branchNameForEmail = parsedBranchId
          ? (await storage.getBranchById(parsedBranchId))?.name
          : undefined;

        const guestActiveTheme = await storage.getActiveTheme();

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
            items: itemsWithProducts,
            branchName: branchNameForEmail,
            couponCode: serverCouponCode || null,
            couponDiscount: serverCouponDiscount > 0 ? serverCouponDiscount : null,
            loyaltyDiscount: serverLoyaltyDiscount > 0 ? serverLoyaltyDiscount : null
          },
          currentStoreSettings.orderNotificationEmail,
          currentStoreSettings.orderNotificationFromEmail || 'noreply@ordis.co.il',
          currentStoreSettings.orderNotificationFromName || 'eDAHouse Store',
          currentStoreSettings.defaultLanguage || 'ru',
          currentStoreSettings.storeName || 'eDAHouse',
          req.get('host') ? `${req.protocol}://${req.get('host')}` : undefined,
          guestActiveTheme?.primaryColor
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
              items: itemsWithProducts,
              branchName: branchNameForEmail,
              couponCode: serverCouponCode || null,
              couponDiscount: serverCouponDiscount > 0 ? serverCouponDiscount : null,
              loyaltyDiscount: serverLoyaltyDiscount > 0 ? serverLoyaltyDiscount : null
            },
            guestAccessToken,
            guestClaimToken,
            fromEmail,
            fromName,
            orderData.orderLanguage || 'ru',
            storeName,
            baseUrl,
            guestActiveTheme?.primaryColor
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
  } catch (error: any) {
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
    } else if (req.body.userId) {
      userId = req.body.userId;
      user = await storage.getUser(userId);
    }

    const { items, language, couponCode: authCouponCode, giftAccepted: authGiftAccepted, ...orderData } = req.body;

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

    // Compute subtotal from validated items
    const authSubtotal = validatedData.items.reduce((sum, item) => sum + parseFloat(item.totalPrice || '0'), 0);

    // Server-side authoritative discount computation
    const authOrderItemsForDiscounts = validatedData.items.map(item => ({
      productId: item.productId,
      quantity: parseFloat(item.quantity?.toString() || '0'),
      totalPrice: item.totalPrice?.toString() || '0',
    }));
    const {
      serverCouponCode: authSvrCouponCode,
      serverCouponDiscount: authSvrCouponDiscount,
      serverLoyaltyDiscount: authSvrLoyaltyDiscount,
      serverVolumeDiscount: authSvrVolumeDiscount,
      serverGiftProductId: authSvrGiftProductId,
      serverDiscountDetails: authSvrDiscountDetails,
      giftOrderItem: authGiftOrderItem,
    } = await computeServerDiscounts({
      couponCode: authCouponCode || null,
      subtotal: authSubtotal,
      userId,
      userEmail: req.user ? (req.user as any).email : null,
      userRole: req.user ? (req.user as any).role : null,
      giftAccepted: !!authGiftAccepted,
      orderItems: authOrderItemsForDiscounts,
    });

    const authDeliveryFee = parseFloat(String(orderData.deliveryFee || '0'));
    const authServerTotal = Math.max(0, authSubtotal - authSvrVolumeDiscount - authSvrCouponDiscount - authSvrLoyaltyDiscount + authDeliveryFee);

    const deliveryOverride = (requestedDeliveryTime && requestedDeliveryDate)
      ? { deliveryDate: requestedDeliveryDate, deliveryTime: requestedDeliveryTime }
      : {};

    const processedOrderData: InsertOrder = {
      ...orderDataWithoutTemp,
      totalAmount: authServerTotal.toString(),
      ...(userId ? { userId } : {}),
      orderLanguage: language || 'ru',
      ...deliveryOverride,
      ...(!BRANCHES_ENABLED ? { branchId: undefined } : {}),
      ...(authSvrCouponCode ? { couponCode: authSvrCouponCode } : {}),
      ...(authSvrCouponDiscount > 0 ? { couponDiscount: authSvrCouponDiscount.toString() } : {}),
      ...(authSvrLoyaltyDiscount > 0 ? { loyaltyDiscount: authSvrLoyaltyDiscount.toString() } : {}),
      ...(authSvrGiftProductId ? { giftProductId: authSvrGiftProductId } : {}),
      ...(Object.keys(authSvrDiscountDetails).length > 0 ? { discountDetails: authSvrDiscountDetails } : {}),
    };

    const authOrderItems: InsertOrderItem[] = validatedData.items.map(item => ({ ...item, orderId: 0 }));
    if (authGiftOrderItem) authOrderItems.push(authGiftOrderItem);

    const order = await storage.createOrder(processedOrderData, authOrderItems);

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

        const authBranchName = processedOrderData.branchId
          ? (await storage.getBranchById(processedOrderData.branchId))?.name
          : undefined;

        const customerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Пользователь';
        const authActiveTheme = await storage.getActiveTheme();
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
            items: itemsWithProducts,
            branchName: authBranchName,
            couponCode: authCouponCode || null,
            couponDiscount: authSvrCouponDiscount > 0 ? authSvrCouponDiscount : null,
            loyaltyDiscount: authSvrLoyaltyDiscount > 0 ? authSvrLoyaltyDiscount : null
          },
          currentStoreSettings.orderNotificationEmail,
          currentStoreSettings.orderNotificationFromEmail || 'noreply@ordis.co.il',
          currentStoreSettings.orderNotificationFromName || 'eDAHouse Store',
          currentStoreSettings.defaultLanguage || 'ru',
          currentStoreSettings.storeName || 'eDAHouse',
          req.get('host') ? `${req.protocol}://${req.get('host')}` : undefined,
          authActiveTheme?.primaryColor
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
  } catch (error: any) {
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
