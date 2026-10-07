import assert from "node:assert/strict";
import { test } from "node:test";
import type { StoreSettings } from "../shared/schema";
import type { CheckoutEmailSnapshot } from "../shared/order-email";
import { sendCheckoutOrderEmail } from "../server/checkout-order-email";
import type { emailService, sendGuestOrderEmail, sendNewOrderEmail } from "../server/email-service";

const settings = {
  storeName: "Shop", storeNameHe: "חנות", defaultLanguage: "ar",
  emailNotificationsEnabled: false, orderNotificationEmail: "changed@example.test",
  orderNotificationFromEmail: "shop@example.test", orderNotificationFromName: "Shop Sender",
  smtpHost: "smtp.example.test", smtpPort: 587, useSendgrid: false,
  languageOrder: ["he", "ar", "ru", "en"],
  paymentMethods: [{ name: "Наличные", name_en: "Cash", name_he: "מזומן", name_ar: "نقد" }],
} as StoreSettings;
const snapshot: CheckoutEmailSnapshot = {
  customerName: "Guest", totalAmount: "32", guestLanguage: "he", notifyGuest: true,
  guestAccessToken: "access-test", guestClaimToken: "claim-test",
  baseUrl: "https://shop.example.test", primaryColor: "#123456",
  deliveryFee: 7, volumeDiscount: 5,
  details: {
    status: "pending", customerPhone: "123", customerNotes: "Note",
    branchName: "Branch", paymentMethod: "Наличные",
    couponCode: "COUPON", couponDiscount: 3, loyaltyDiscount: 2, giftProductId: 3,
    items: [{
      productId: 1, quantity: 0.5, pricePerKg: 70, totalPrice: 35,
      product: { name: "Продукт", name_en: "Product", name_he: "מוצר", name_ar: "منتج", unit: "кг" },
    }],
  },
};

test("ordinary checkout keeps the existing template arguments, languages and transport per audience", async () => {
  const admin: Parameters<typeof sendNewOrderEmail>[] = [];
  const guest: Parameters<typeof sendGuestOrderEmail>[] = [];
  const transport: Parameters<typeof emailService.updateSettings>[0][] = [];
  const mail = {
    updateSettings: async (config: Parameters<typeof emailService.updateSettings>[0]) => { transport.push(config); },
    sendNewOrderEmail: async (...args: Parameters<typeof sendNewOrderEmail>) => { admin.push(args); return true; },
    sendGuestOrderEmail: async (...args: Parameters<typeof sendGuestOrderEmail>) => { guest.push(args); return true; },
  };
  await sendCheckoutOrderEmail(42, "admin", "original-admin@example.test", snapshot, settings, mail);
  assert.equal(guest.length, 0);
  assert.deepEqual(admin[0].slice(0, 3), [42, "Guest", "32"]);
  assert.deepEqual(admin[0].slice(4, 11), [
    "original-admin@example.test", "shop@example.test", "Shop Sender", "ar", "Shop",
    "https://shop.example.test", "#123456",
  ]);
  assert.deepEqual(admin[0][3], snapshot.details);
  assert.deepEqual(admin[0][11], {
    deliveryFee: 7, volumeDiscount: 5, languageOrder: settings.languageOrder,
    paymentMethodNames: { ru: "Наличные", en: "Cash", he: "מזומן", ar: "نقد" },
  });
  await sendCheckoutOrderEmail(42, "guest", "original-guest@example.test", snapshot, settings, mail);
  assert.equal(admin.length, 1);
  assert.deepEqual(guest[0].slice(0, 4), [42, "Guest", "original-guest@example.test", "32"]);
  assert.deepEqual(guest[0].slice(5, 13), [
    "access-test", "claim-test", "shop@example.test", "Shop Sender", "he", "Shop",
    "https://shop.example.test", "#123456",
  ]);
  assert.deepEqual(guest[0][13]?.storeNameVariants, { en: undefined, he: "חנות", ar: undefined });
  assert.equal(transport[0].smtpHost, settings.smtpHost);
  assert.equal(transport[1].smtpPort, 587);
});

test("ordinary mail false and thrown transport failures propagate to the queue", async () => {
  for (const audience of ["admin", "guest"] as const) {
    for (const throws of [false, true]) {
      const fail = async () => {
        if (throws) throw new Error("Transport unavailable");
        return false;
      };
      await assert.rejects(sendCheckoutOrderEmail(42, audience, "test@example.test", snapshot, settings, {
        updateSettings: async () => {}, sendNewOrderEmail: fail, sendGuestOrderEmail: fail,
      }), throws ? /Transport unavailable/ : /transport failed/);
    }
  }
});
