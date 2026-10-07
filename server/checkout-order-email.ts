import type { InsertOrder, InsertOrderItem, StoreSettings } from "@shared/schema";
import type { CheckoutEmailSnapshot } from "@shared/order-email";
import { storage } from "./storage";
import { emailService, sendNewOrderEmail, sendGuestOrderEmail } from "./email-service";

export async function prepareCheckoutEmail(
  order: InsertOrder,
  items: InsertOrderItem[],
  context: {
    customerName: string;
    notifyGuest: boolean;
    customerPhone?: string | null;
    baseUrl?: string;
    deliveryFee: number;
    volumeDiscount: number;
  },
): Promise<CheckoutEmailSnapshot> {
  const [products, theme, branch] = await Promise.all([
    storage.getProductsByIds(items.map(item => item.productId)),
    storage.getActiveTheme(),
    order.branchId ? storage.getBranchById(order.branchId) : undefined,
  ]);
  const productsMap = new Map(products.map(product => [product.id, product]));
  return {
    ...context,
    totalAmount: order.totalAmount,
    guestLanguage: order.orderLanguage || "ru",
    guestAccessToken: order.guestAccessToken,
    guestClaimToken: order.guestClaimToken,
    primaryColor: theme?.primaryColor,
    details: {
      customerPhone: context.customerPhone,
      deliveryAddress: order.deliveryAddress,
      deliveryDate: order.deliveryDate,
      deliveryTime: order.deliveryTime,
      paymentMethod: order.paymentMethod,
      customerNotes: order.customerNotes,
      status: "pending",
      branchName: branch?.name,
      couponCode: order.couponCode || null,
      couponDiscount: Number(order.couponDiscount || 0) || null,
      loyaltyDiscount: Number(order.loyaltyDiscount || 0) || null,
      giftProductId: order.giftProductId || null,
      items: items.map(item => {
        const product = productsMap.get(item.productId);
        return {
          productId: item.productId,
          quantity: Number(item.quantity),
          pricePerKg: Number(item.pricePerKg),
          totalPrice: Number(item.totalPrice),
          product: product ? {
            name: product.name, name_en: product.name_en, name_he: product.name_he,
            name_ar: product.name_ar, unit: product.unit || "кг",
          } : null,
        };
      }),
    },
  };
}

function paymentMethodNames(paymentMethods: StoreSettings["paymentMethods"], name?: string | null) {
  if (!name || !paymentMethods) return undefined;
  try {
    const parsed: unknown = typeof paymentMethods === "string" ? JSON.parse(paymentMethods) : paymentMethods;
    if (!Array.isArray(parsed)) return undefined;
    const found = parsed.find(method =>
      [method.name, method.name_en, method.name_he, method.name_ar].includes(name));
    return found ? { ru: found.name, en: found.name_en, he: found.name_he, ar: found.name_ar } : undefined;
  } catch { return undefined; }
}

const dependencies = {
  updateSettings: (settings: Parameters<typeof emailService.updateSettings>[0]) => emailService.updateSettings(settings),
  sendNewOrderEmail,
  sendGuestOrderEmail,
};

export async function sendCheckoutOrderEmail(
  orderId: number,
  audience: "admin" | "guest",
  recipient: string,
  snapshot: CheckoutEmailSnapshot,
  settings: StoreSettings,
  mail = dependencies,
): Promise<void> {
  // The transaction already fixed eligibility and recipient; current settings
  // provide the store's existing transport, sender and localization.
  await mail.updateSettings({
    useSendgrid: settings.useSendgrid || false,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpSecure: settings.smtpSecure,
    smtpUser: settings.smtpUser,
    smtpPassword: settings.smtpPassword,
    sendgridApiKey: settings.sendgridApiKey || undefined,
  });
  const fromEmail = settings.orderNotificationFromEmail || "noreply@ordis.co.il";
  const fromName = settings.orderNotificationFromName || "Ordis Store";
  const options = {
    deliveryFee: snapshot.deliveryFee,
    volumeDiscount: snapshot.volumeDiscount,
    paymentMethodNames: paymentMethodNames(settings.paymentMethods, snapshot.details.paymentMethod),
    languageOrder: Array.isArray(settings.languageOrder) ? settings.languageOrder as string[] : ["ru", "he", "en", "ar"],
  };
  let sent: boolean;
  if (audience === "admin") {
    sent = await mail.sendNewOrderEmail(
      orderId, snapshot.customerName, snapshot.totalAmount, snapshot.details,
      recipient, fromEmail, fromName, settings.defaultLanguage || "ru",
      settings.storeName || "Ordis", snapshot.baseUrl, snapshot.primaryColor, options,
    );
  } else {
    if (!snapshot.guestAccessToken || !snapshot.guestClaimToken) {
      throw new Error("Guest order is missing access tokens");
    }
    sent = await mail.sendGuestOrderEmail(
      orderId, snapshot.customerName, recipient, snapshot.totalAmount, snapshot.details,
      snapshot.guestAccessToken, snapshot.guestClaimToken, fromEmail, fromName,
      snapshot.guestLanguage, settings.storeName || "Ordis", snapshot.baseUrl,
      snapshot.primaryColor, {
        ...options,
        storeNameVariants: { en: settings.storeNameEn, he: settings.storeNameHe, ar: settings.storeNameAr },
      },
    );
  }
  if (!sent) throw new Error("Order email transport failed");
}
