import assert from "node:assert/strict";
import { test } from "node:test";
import type { StoreSettings } from "../shared/schema";
import type { OrderWithItems } from "../shared/catalog-dto";
import { sendPaidOrderEmails } from "../server/payment-order-email";
import type { emailService, sendGuestOrderEmail, sendNewOrderEmail } from "../server/email-service";

const settings = {
  emailNotificationsEnabled: true,
  orderNotificationEmail: "admin@example.test",
  orderNotificationFromEmail: "shop@example.test",
  orderNotificationFromName: "Test Shop",
  storeName: "Test Shop",
  defaultLanguage: "ru",
  languageOrder: ["he", "ar", "ru", "en"],
  useSendgrid: false,
  smtpHost: "smtp.example.test",
  smtpPort: 587,
} as StoreSettings;

function makeOrder(overrides: Partial<OrderWithItems> = {}): OrderWithItems {
  return {
    id: 42, userId: null, user: null, totalAmount: "52.00", deliveryFee: "7.00",
    guestName: "Guest", guestEmail: "guest@example.test", guestPhone: "12345",
    guestAccessToken: "test-access", guestClaimToken: "test-claim",
    orderLanguage: "he", status: "pending",
    items: [{
      id: 1, orderId: 42, productId: 3, quantity: "0.500",
      pricePerKg: "90.00", totalPrice: "45.00", createdAt: null,
      product: {
        id: 3, name: "Продукт", name_en: "Product", name_he: "מוצר", name_ar: "منتج",
        price: "90.00", unit: "kg",
        imageUrl: null, imageUrl_en: null, imageUrl_he: null, imageUrl_ar: null,
      },
    }],
    ...overrides,
  } as OrderWithItems;
}

function captureMail() {
  const admin: Parameters<typeof sendNewOrderEmail>[] = [];
  const guest: Parameters<typeof sendGuestOrderEmail>[] = [];
  const transport: Parameters<typeof emailService.updateSettings>[0][] = [];
  let originCalls = 0;
  return {
    admin, guest, transport,
    get originCalls() { return originCalls; },
    dependencies: {
      updateSettings: async (config: Parameters<typeof emailService.updateSettings>[0]) => { transport.push(config); },
      sendNewOrderEmail: async (...args: Parameters<typeof sendNewOrderEmail>) => { admin.push(args); return true; },
      sendGuestOrderEmail: async (...args: Parameters<typeof sendGuestOrderEmail>) => { guest.push(args); return true; },
      storeOrigin: () => { originCalls++; return "https://shop.example.test"; },
    },
  };
}

test("paid guest order uses positional template arguments and existing store transport", async () => {
  const mail = captureMail();
  await sendPaidOrderEmails(makeOrder(), settings, mail.dependencies);
  assert.equal(mail.transport[0].smtpHost, settings.smtpHost);
  assert.equal(mail.admin.length, 1);
  assert.equal(mail.guest.length, 1);
  assert.deepEqual(mail.admin[0].slice(0, 3), [42, "Guest", "52.00"]);
  assert.deepEqual(mail.admin[0].slice(4, 10), [
    "admin@example.test", "shop@example.test", "Test Shop", "he", "Test Shop",
    "https://shop.example.test",
  ]);
  assert.deepEqual(mail.guest[0].slice(0, 4), [42, "Guest", "guest@example.test", "52.00"]);
  assert.deepEqual(mail.guest[0].slice(5, 10), ["test-access", "test-claim", "shop@example.test", "Test Shop", "he"]);
  assert.equal(mail.guest[0][11], "https://shop.example.test");
  assert.equal(mail.admin[0][3].items[0].quantity, 0.5);
  assert.equal(mail.admin[0][3].items[0].totalPrice, 45);
  assert.equal(mail.admin[0][11]?.deliveryFee, 7);
});

test("registered customer payment sends admin notification without guest tokens", async () => {
  const mail = captureMail();
  await sendPaidOrderEmails(makeOrder({
    userId: "customer", guestName: null, guestEmail: null, guestPhone: null,
    guestAccessToken: null, guestClaimToken: null,
    user: { firstName: "First", lastName: "Last", username: "customer", phone: "67890" } as OrderWithItems["user"],
  }), settings, mail.dependencies);
  assert.equal(mail.admin[0][1], "First Last");
  assert.equal(mail.admin[0][3].customerPhone, "67890");
  assert.equal(mail.guest.length, 0);
});

test("disabled notifications and missing admin recipient do not initialize mail or resolve links", async () => {
  for (const override of [{ emailNotificationsEnabled: false }, { orderNotificationEmail: null }]) {
    const mail = captureMail();
    await sendPaidOrderEmails(makeOrder(), { ...settings, ...override }, mail.dependencies);
    assert.equal(mail.transport.length, 0);
    assert.equal(mail.admin.length, 0);
    assert.equal(mail.guest.length, 0);
    assert.equal(mail.originCalls, 0);
  }
});

test("guest without email does not attempt a guest notification", async () => {
  const mail = captureMail();
  await sendPaidOrderEmails(makeOrder({ guestEmail: null }), settings, mail.dependencies);
  assert.equal(mail.admin.length, 1);
  assert.equal(mail.guest.length, 0);
});

test("audiences are sent independently and false transport results fail explicitly", async () => {
  for (const audience of ["admin", "guest"] as const) {
    const mail = captureMail();
    await sendPaidOrderEmails(makeOrder(), settings, mail.dependencies, audience);
    assert.equal(mail.admin.length, audience === "admin" ? 1 : 0);
    assert.equal(mail.guest.length, audience === "guest" ? 1 : 0);
    await assert.rejects(sendPaidOrderEmails(makeOrder(), settings, {
      ...mail.dependencies,
      sendNewOrderEmail: async () => false,
      sendGuestOrderEmail: async () => false,
    }, audience), /transport failed/);
  }
  const mail = captureMail();
  await assert.rejects(
    sendPaidOrderEmails(makeOrder({ userId: "claimed-customer" }), settings, mail.dependencies, "guest"),
    /eligible guest order/,
  );
});

test("missing guest tokens and unconfigured trusted origin fail explicitly", async () => {
  const mail = captureMail();
  await assert.rejects(
    sendPaidOrderEmails(makeOrder({ guestAccessToken: null }), settings, mail.dependencies),
    /missing access tokens/,
  );
  assert.equal(mail.guest.length, 0);
  const second = captureMail();
  await assert.rejects(sendPaidOrderEmails(makeOrder(), settings, {
    ...second.dependencies, storeOrigin: () => { throw new Error("Missing trusted origin"); },
  }), /Missing trusted origin/);
  assert.equal(second.admin.length, 0);
  assert.equal(second.guest.length, 0);
});
