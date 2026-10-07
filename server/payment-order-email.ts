import type { StoreSettings } from "@shared/schema";
import type { OrderWithItems } from "@shared/catalog-dto";
import { emailService, sendNewOrderEmail, sendGuestOrderEmail } from "./email-service";
import { passwordResetOrigin } from "./password-reset-email";

type MailDependencies = {
  updateSettings: typeof emailService.updateSettings;
  sendNewOrderEmail: typeof sendNewOrderEmail;
  sendGuestOrderEmail: typeof sendGuestOrderEmail;
  storeOrigin: () => string;
};

const mailDependencies: MailDependencies = {
  updateSettings: settings => emailService.updateSettings(settings),
  sendNewOrderEmail,
  sendGuestOrderEmail,
  storeOrigin: passwordResetOrigin,
};

export type PaidOrderEmailAudience = "admin" | "guest";

// Use the same store transport, senders and templates as ordinary order checkout.
export async function sendPaidOrderEmails(
  order: OrderWithItems,
  settings: StoreSettings,
  dependencies: MailDependencies = mailDependencies,
  audience?: PaidOrderEmailAudience,
): Promise<void> {
  if (!settings.emailNotificationsEnabled || !settings.orderNotificationEmail) return;
  if (audience === "guest" && (order.userId || !order.guestEmail)) {
    throw new Error("Guest notification no longer has an eligible guest order");
  }

  await dependencies.updateSettings({
    useSendgrid: settings.useSendgrid || false,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpSecure: settings.smtpSecure,
    smtpUser: settings.smtpUser,
    smtpPassword: settings.smtpPassword,
    sendgridApiKey: settings.sendgridApiKey || undefined,
  });

  const customerName = order.guestName ||
    [order.user?.firstName, order.user?.lastName].filter(Boolean).join(" ") ||
    order.user?.username || "Пользователь";
  const details = {
    ...order,
    customerPhone: order.customerPhone || order.guestPhone || order.user?.phone,
    items: order.items.map(item => ({
      ...item,
      quantity: Number(item.quantity),
      pricePerKg: Number(item.pricePerKg),
      totalPrice: Number(item.totalPrice),
    })),
  };
  const fromEmail = settings.orderNotificationFromEmail || "noreply@ordis.co.il";
  const fromName = settings.orderNotificationFromName || "Ordis Store";
  const language = order.orderLanguage || settings.defaultLanguage || "ru";
  const baseUrl = dependencies.storeOrigin();
  const options = {
    deliveryFee: Number(order.deliveryFee || 0),
    languageOrder: Array.isArray(settings.languageOrder) ? settings.languageOrder as string[] : undefined,
    storeNameVariants: {
      en: settings.storeNameEn, he: settings.storeNameHe, ar: settings.storeNameAr,
    },
  };

  if (audience !== "guest" && !await dependencies.sendNewOrderEmail(
    order.id, customerName, order.totalAmount, details,
    settings.orderNotificationEmail, fromEmail, fromName, language,
    settings.storeName, baseUrl, undefined, options,
  )) throw new Error("Admin order email transport failed");
  if (audience !== "admin" && !order.userId && order.guestEmail) {
    if (!order.guestAccessToken || !order.guestClaimToken) {
      throw new Error("Guest payment order is missing access tokens");
    }
    if (!await dependencies.sendGuestOrderEmail(
      order.id, customerName, order.guestEmail, order.totalAmount, details,
      order.guestAccessToken, order.guestClaimToken, fromEmail, fromName, language,
      settings.storeName, baseUrl, undefined, options,
    )) throw new Error("Guest order email transport failed");
  }
}
