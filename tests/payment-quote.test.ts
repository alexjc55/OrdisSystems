import assert from "node:assert/strict";
import { test } from "node:test";
import type { Product, StoreSettings, User, ProductVolumeDiscount, Coupon } from "@shared/schema";
import type { IStorage } from "../server/storage";
import { CheckoutQuoteError, quotePaymentCheckout } from "../server/payment-quote";
import { quoteCheckout } from "../server/checkout-quote";
import { calculateTotal, effectiveProductPrice } from "../shared/product-pricing";

function fixture() {
  const product = {
    id: 1, name: "Product", price: "10", pricePerKg: "100", unit: "piece",
    isActive: true, isAvailable: true, availabilityStatus: "available",
    isSpecialOffer: false, minOrderQuantity: null, maxOrderQuantity: null,
  } as Product;
  const gift = { ...product, id: 2 };
  const settings = { deliveryFee: "15", freeDeliveryFrom: "50" } as StoreSettings;
  const user = { id: "real-customer", firstName: "Buyer", email: "real@example.test", role: "customer" } as User;
  let tiers: ProductVolumeDiscount[] = [];
  let coupon: Coupon | undefined;
  let couponSubtotal = 0;
  let couponItems: Array<{ productId: number; totalPrice: string }> = [];
  let couponIdentity: string | null | undefined;
  let branchProducts = [product];
  const storage = {
    getStoreSettings: async () => settings,
    getUser: async (id: string) => id === user.id ? user : undefined,
    getProductById: async (id: number) => id === 1 ? product : id === 2 ? gift : undefined,
    getProductVolumeDiscounts: async () => tiers,
    getBranchById: async (id: number) => id === 1 ? { id, isActive: true } : undefined,
    getProductsForBranch: async () => branchProducts,
    validateCoupon: async (_code: string, subtotal: number, userId: string | null | undefined,
      _email: string | null | undefined, items: Array<{ productId: number; totalPrice: string }>) => {
      couponSubtotal = subtotal; couponItems = items; couponIdentity = userId;
      return coupon ? { valid: true, coupon, discountAmount: 5 } : { valid: false, message: "coupon_expired" };
    },
  } as unknown as IStorage;
  const body = {
    items: [{ productId: 1, quantity: "1", pricePerKg: "0.01", totalPrice: "0.01" }],
    totalAmount: "25", userId: "someone-else",
    orderData: { totalAmount: "25", deliveryFee: "0", status: "completed", userId: "someone-else" } as Record<string, any>,
    language: "he",
  };
  const quote = (id: string | null = null, branches = false) =>
    quotePaymentCheckout(body, id, branches, storage, new Date("2026-10-08T10:00:00Z"));
  return {
    product, gift, settings, user, storage, body, quote,
    tiers: (value: ProductVolumeDiscount[]) => { tiers = value; },
    coupon: (value: Coupon) => { coupon = value; },
    branches: (value: Product[]) => { branchProducts = value; },
    couponInputs: () => ({ subtotal: couponSubtotal, items: couponItems, userId: couponIdentity }),
  };
}

test("simultaneously forged outer and inner totals and item prices cannot underpay", async () => {
  const f = fixture();
  f.body.totalAmount = "0.01"; f.body.orderData.totalAmount = "0.01";
  await assert.rejects(f.quote(), error => error instanceof CheckoutQuoteError && error.status === 409);
});

test("persistable quote rebuilds item prices, delivery, identity and status", async () => {
  const f = fixture();
  f.body.orderData.discountDetails = { coupon: { discountAmount: 999 } };
  f.body.orderData.loyaltyDiscount = "999"; f.body.orderData.branchId = 999;
  const result = await f.quote();
  assert.equal(result.amountInAgorot, 2500);
  assert.equal(result.orderData.totalAmount, "25.00");
  assert.equal(result.orderData.deliveryFee, "15.00");
  assert.equal(result.orderData.status, "pending");
  assert.equal(result.userId, null);
  assert.equal(result.orderData.userId, null);
  assert.equal(result.orderData.branchId, undefined);
  assert.equal(result.orderItems[0].pricePerKg, "10.00");
  assert.equal(result.orderItems[0].totalPrice, "10.00");
  assert.deepEqual(result.orderData.discountDetails, {});
});

test("missing nested total (current checkout format) is supported but conflicting nested total is rejected", async () => {
  const f = fixture();
  delete f.body.orderData.totalAmount;
  assert.equal((await f.quote()).amountInAgorot, 2500);
  f.body.orderData.totalAmount = "1";
  await assert.rejects(f.quote(), /Cart price changed/);
});

test("all units, special offers and 10-agorot rounding match the shopping cart", async () => {
  for (const [unit, quantity] of [["piece", 3], ["portion", 2], ["kg", 0.375], ["100g", 375], ["100ml", 125]] as const) {
    for (const discountType of ["percentage", "fixed"] as const) {
      const f = fixture();
      Object.assign(f.product, { unit, price: "3.33", isSpecialOffer: true, discountType, discountValue: discountType === "percentage" ? "15" : "1.25" });
      f.body.items[0].quantity = String(quantity);
      const total = calculateTotal(effectiveProductPrice(f.product), quantity, unit);
      f.body.totalAmount = (total + 15).toFixed(2);
      delete f.body.orderData.totalAmount;
      const result = await f.quote();
      assert.equal(result.orderItems[0].totalPrice, total.toFixed(2), `${unit}/${discountType}`);
    }
  }
});

test("volume discount precedes coupon and loyalty, stacking and free delivery match checkout", async () => {
  for (const stacksWithLoyalty of [true, false]) {
    const f = fixture();
    Object.assign(f.settings, { loyaltyDiscountEnabled: true, loyaltyDiscountPercent: "10", freeDeliveryFrom: "30" });
    f.body.items[0].quantity = "5";
    f.tiers([{ minQuantity: "2", discountType: "percentage", discountValue: "20", isActive: true } as ProductVolumeDiscount]);
    f.coupon({ code: "SAVE", scope: "product", discountType: "fixed", discountValue: "5", stacksWithLoyalty } as Coupon);
    f.body.orderData.couponCode = "SAVE";
    f.body.totalAmount = stacksWithLoyalty ? "31" : "35";
    delete f.body.orderData.totalAmount;
    const result = await f.quote(f.user.id);
    assert.equal(result.orderData.totalAmount, stacksWithLoyalty ? "31.00" : "35.00");
    assert.equal(result.orderData.deliveryFee, "0.00");
    assert.equal(result.orderData.loyaltyDiscount, stacksWithLoyalty ? "4.00" : "0.00");
    assert.equal(result.userId, f.user.id);
    assert.equal(result.customerEmail, f.user.email);
    assert.deepEqual(f.couponInputs(), { subtotal: 40, items: [{ productId: 1, quantity: 5, totalPrice: "50.00" }], userId: f.user.id });
  }
});

test("forged user IDs give guests no loyalty discount; genuine session gets loyalty", async () => {
  const f = fixture();
  Object.assign(f.settings, { loyaltyDiscountEnabled: true, loyaltyDiscountPercent: "10" });
  assert.equal((await f.quote()).orderData.loyaltyDiscount, "0.00");
  f.body.totalAmount = "24"; delete f.body.orderData.totalAmount;
  const result = await f.quote(f.user.id);
  assert.equal(result.orderData.loyaltyDiscount, "1.00");
  assert.equal(result.orderData.userId, f.user.id);
  await assert.rejects(f.quote("nonexistent"), error => error instanceof CheckoutQuoteError && error.status === 401);
});

test("delivery threshold uses discounted subtotal, not a forged fee or raw subtotal", async () => {
  const f = fixture();
  Object.assign(f.settings, { loyaltyDiscountEnabled: true, loyaltyDiscountPercent: "10" });
  f.body.items[0].quantity = "5";
  f.body.totalAmount = "60"; delete f.body.orderData.totalAmount;
  assert.equal((await f.quote(f.user.id)).orderData.deliveryFee, "15.00");
});

test("invalid coupon is rejected; gifts are derived from DB threshold and consent", async () => {
  const f = fixture();
  f.body.orderData.couponCode = "EXPIRED";
  await assert.rejects(f.quote(), (error: any) => error.isCouponError && error.couponError === "coupon_expired");
  delete f.body.orderData.couponCode;
  Object.assign(f.settings, { giftEnabled: true, giftProductId: 2, giftMinOrderAmount: "10", giftProductQuantity: "2" });
  assert.equal((await f.quote()).orderItems.length, 1);
  f.body.orderData.giftAccepted = true;
  const result = await f.quote();
  assert.equal(result.orderData.giftProductId, 2);
  assert.deepEqual(result.orderItems[1], { productId: 2, quantity: "2", pricePerKg: "0", totalPrice: "0", orderId: 0 });
});

test("branch availability and tomorrow preorder do not change catalog prices", async () => {
  const f = fixture();
  Object.assign(f.body, { branchId: 1 });
  f.body.orderData.branchId = 1;
  f.product.availabilityStatus = "out_of_stock_today";
  f.body.orderData.deliveryDate = "2026-10-08";
  await assert.rejects(f.quote(null, true), /preorder only/);
  f.body.orderData.deliveryDate = "2026-10-09";
  const result = await f.quote(null, true);
  assert.equal(result.orderData.branchId, 1);
  assert.equal(result.orderData.deliveryDate, "2026-10-09");
  assert.equal(result.amountInAgorot, 2500);
  f.branches([]);
  await assert.rejects(f.quote(null, true), /unavailable/);
  Object.assign(f.body, { branchId: 2 });
  f.body.orderData.branchId = 2;
  await assert.rejects(f.quote(null, true), /Branch is unavailable/);
});

test("bad quantities, nonexistent products and per-product min/max cannot be bypassed", async () => {
  for (const quantity of ["-1", "0", "NaN", "Infinity", "1junk", "0.0001", 0, {}, null]) {
    const f = fixture();
    f.body.items[0].quantity = quantity as any;
    await assert.rejects(f.quote(), /Invalid quantity/);
  }
  const f = fixture();
  f.product.maxOrderQuantity = "1";
  f.body.items.push({ ...f.body.items[0] });
  await assert.rejects(f.quote(), /allowed range/);
  f.body.items = [{ ...f.body.items[0], productId: 99 }];
  await assert.rejects(f.quote(), /unavailable/);
  const weight = fixture();
  Object.assign(weight.product, { unit: "100g", minOrderQuantity: "2.5" });
  weight.body.items[0].quantity = "100";
  await assert.rejects(weight.quote(), /allowed range/);
});

test("ordinary guest/authenticated and online checkout match storefront quantity limits without changing prices", async () => {
  for (const [unit, min, max, quantity, below, above] of [
    ["100g", "5.500", "5.550", 550, 549, 556],
    ["100ml", "2.750", "2.760", 275, 274, 277],
    ["kg", "0.250", "0.500", 0.375, 0.249, 0.501],
    ["piece", "2", "4", 3, 1, 5],
    ["portion", "1", "3", 2, 0.5, 4],
  ] as const) {
    const f = fixture();
    Object.assign(f.product, { unit, minOrderQuantity: min, maxOrderQuantity: max });
    f.settings.deliveryFee = "0";
    const setQuantity = (value: number) => {
      f.body.items[0].quantity = String(value);
      const total = calculateTotal(effectiveProductPrice(f.product), value, unit).toFixed(2);
      f.body.totalAmount = f.body.orderData.totalAmount = total;
      return total;
    };
    for (const valid of [quantity, Number(max) * (unit === "100g" || unit === "100ml" ? 100 : 1)]) {
      const total = setQuantity(valid);
      for (const userId of [null, f.user.id]) {
        const result = await quoteCheckout(f.body, userId, false, f.storage);
        assert.equal(result.orderData.totalAmount, total, unit);
        assert.equal(result.orderItems[0].quantity, String(valid), unit);
        const online = await f.quote(userId);
        assert.equal(online.amountInAgorot, Math.round(Number(total) * 100), unit);
      }
    }
    for (const invalid of [below, above]) {
      setQuantity(invalid);
      await assert.rejects(quoteCheckout(f.body, null, false, f.storage), /allowed range/, unit);
      await assert.rejects(f.quote(), /allowed range/, unit);
    }
    f.product.maxOrderQuantity = "0.000";
    setQuantity(quantity);
    await quoteCheckout(f.body, null, false, f.storage);
    await f.quote();
    setQuantity(below);
    await assert.rejects(f.quote(), /allowed range/, unit);
    f.product.minOrderQuantity = "0.000";
    setQuantity(quantity);
    await quoteCheckout(f.body, null, false, f.storage);
    await f.quote();
  }
});

test("exact fractional weighted maximum remains inclusive without accepting excess weight", async () => {
  for (const unit of ["100g", "100ml"]) {
    const f = fixture();
    Object.assign(f.product, { unit, minOrderQuantity: "4.550", maxOrderQuantity: "4.560" });
    f.settings.deliveryFee = "0";
    f.body.items[0].quantity = "456";
    f.body.totalAmount = f.body.orderData.totalAmount = "45.60";
    assert.equal((await f.quote()).amountInAgorot, 4560);
    f.body.items[0].quantity = "456.001";
    await assert.rejects(f.quote(), /allowed range/);
  }
});

test("weighted min/max are checked against aggregate quantity, including split item submissions", async () => {
  const f = fixture();
  Object.assign(f.product, { unit: "100g", minOrderQuantity: "5.500", maxOrderQuantity: "5.500" });
  f.settings.deliveryFee = "0";
  f.body.items[0].quantity = "275";
  f.body.items.push({ ...f.body.items[0] });
  f.body.totalAmount = f.body.orderData.totalAmount = "55.00";
  const result = await f.quote();
  assert.equal(result.orderItems[0].quantity, "550");
  f.body.items.push({ ...f.body.items[0], quantity: "0.1" });
  await assert.rejects(f.quote(), /allowed range/);
});
