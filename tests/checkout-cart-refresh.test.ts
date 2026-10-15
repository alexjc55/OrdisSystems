import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import type { Product } from "../shared/schema";
import type { CartItem, AppliedCoupon } from "../client/src/lib/cart";
import { refreshCheckoutCart, reconcileCartItems, cartVolumeDiscount } from "../client/src/lib/refresh-checkout-cart";
import { quotePaymentCheckout } from "../server/payment-quote";
import type { IStorage } from "../server/storage";

const product = (patch: Partial<Product> = {}) => ({
  id: 1, name: "Товар", price: "10", unit: "piece", isActive: true, isAvailable: true,
  availabilityStatus: "available", isSpecialOffer: false, minOrderQuantity: null, maxOrderQuantity: null,
  ...patch,
} as Product);
const item = (p = product(), quantity = 2): CartItem => ({ product: p, quantity, totalPrice: 1 });
const coupon: AppliedCoupon = {
  code: "SAVE", discountType: "fixed", discountValue: 99, discountAmount: 99, stacksWithLoyalty: false,
};

test("catalog replacement removes cancelled special offers and preserves every weight unit", () => {
  for (const [unit, quantity, expected] of [
    ["piece", 2, 20], ["portion", 2, 20], ["kg", 0.375, 3.8], ["100g", 375, 37.5], ["100ml", 125, 12.5],
  ] as const) {
    const old = product({ unit, isSpecialOffer: true, discountType: "percentage", discountValue: "50" });
    const fresh = product({ unit });
    const result = reconcileCartItems([item(old, quantity)], [fresh]);
    assert.equal(result.items[0].quantity, quantity);
    assert.equal(result.items[0].product, fresh);
    assert.equal(result.items[0].product.isSpecialOffer, false);
    assert.equal(result.items[0].totalPrice, expected);
    assert.equal(old.isSpecialOffer, true);
  }
});

test("removed, inactive, unavailable, incompatible units and invalid limits are reported, not silently changed", () => {
  const patches: Partial<Product>[] = [
    { isActive: false }, { isAvailable: false }, { availabilityStatus: "completely_unavailable" },
    { unit: "kg" }, { minOrderQuantity: "3" }, { maxOrderQuantity: "1" },
  ];
  for (const patch of patches) {
    const old = item();
    const result = reconcileCartItems([old], [product(patch)]);
    assert.deepEqual(result.removed, [old]);
    assert.deepEqual(result.items, []);
  }
  assert.equal(reconcileCartItems([item()], []).removed.length, 1);
  const weighted = product({ unit: "100g", minOrderQuantity: "2.5", maxOrderQuantity: "5" });
  assert.equal(reconcileCartItems([item(weighted, 375)], [weighted]).items.length, 1);
});

test("refresh preserves valid quantities with existing storefront limits and still rejects violations", () => {
  for (const [unit, min, max, quantity, below, above] of [
    ["100g", "5.500", "5.550", 550, 549, 556],
    ["100ml", "2.750", "2.760", 275, 274, 277],
    ["kg", "0.250", "0.500", 0.375, 0.249, 0.501],
    ["piece", "2", "4", 3, 1, 5],
    ["portion", "1", "3", 2, 0.5, 4],
  ] as const) {
    const fresh = product({ unit, minOrderQuantity: min, maxOrderQuantity: max });
    for (const valid of [quantity, Number(max) * (unit === "100g" || unit === "100ml" ? 100 : 1)]) {
      const original = item(fresh, valid);
      const result = reconcileCartItems([original], [fresh]);
      assert.equal(result.removed.length, 0, `${unit}: valid quantity must not disappear`);
      assert.equal(result.items[0].quantity, valid);
    }
    for (const invalid of [below, above]) {
      assert.equal(reconcileCartItems([item(fresh, invalid)], [fresh]).removed.length, 1, unit);
    }
    fresh.maxOrderQuantity = "0.000";
    assert.equal(reconcileCartItems([item(fresh, quantity)], [fresh]).items.length, 1, unit);
    assert.equal(reconcileCartItems([item(fresh, below)], [fresh]).removed.length, 1, unit);
    const unlimited = product({ unit, minOrderQuantity: "0.000", maxOrderQuantity: "0.000" });
    assert.equal(reconcileCartItems([item(unlimited, quantity)], [unlimited]).items.length, 1, unit);
  }
});

test("exact fractional weighted maximum does not acquire a floating-point rejection", () => {
  for (const unit of ["100g", "100ml"]) {
    const fresh = product({ unit, minOrderQuantity: "4.550", maxOrderQuantity: "4.560" });
    assert.equal(reconcileCartItems([item(fresh, 456)], [fresh]).items.length, 1);
    assert.equal(reconcileCartItems([item(fresh, 456.001)], [fresh]).removed.length, 1);
  }
});

test("tomorrow-only products stay in the cart with their new preorder status", () => {
  const result = reconcileCartItems([item()], [product({ availabilityStatus: "out_of_stock_today" })]);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].product.availabilityStatus, "out_of_stock_today");
});

test("branch refresh rereads delivery/loyalty/tier data and validates coupon against refreshed items after volume discount", async () => {
  const calls: Array<[string, string, any]> = [];
  const updated = await refreshCheckoutCart([item()], coupon, 7, async (method, url, body) => {
    calls.push([method, url, body]);
    if (url === "/api/products?branchId=7") return [product({ price: "20" })];
    if (url === "/api/settings") return { deliveryFee: "25", freeDeliveryFrom: "35" };
    if (url === "/api/loyalty/context") return { loyaltyDiscountEnabled: true, loyaltyDiscountPercent: 10 };
    if (url.startsWith("/api/products/volume-discounts?")) return {
      1: [{ minQuantity: "2", discountType: "percentage", discountValue: "10" }],
    };
    if (url === "/api/coupons/validate") {
      assert.deepEqual(body, {
        code: "SAVE", orderTotal: 36, cartItems: [{ productId: 1, quantity: 2, totalPrice: "40.00" }],
      });
      return { valid: true, coupon: { ...coupon, discountValue: "5", stacksWithLoyalty: true }, discountAmount: 5 };
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  assert.equal(calls.length, 5);
  assert.equal(updated.items[0].totalPrice, 40);
  assert.equal(updated.settings.deliveryFee, "25");
  assert.equal(updated.loyalty.loyaltyDiscountPercent, 10);
  assert.equal(updated.coupon?.discountAmount, 5);
  assert.equal(updated.coupon?.stacksWithLoyalty, true);
  assert.equal(cartVolumeDiscount(updated.items, updated.volume), 4);
  assert.equal(coupon.discountAmount, 99);
});

test("expired/ineligible coupons are removed, but a network failure does not become a removed coupon", async () => {
  const request = async (_method: string, url: string) => {
    if (url === "/api/products") return [product()];
    if (url === "/api/settings") return { deliveryFee: "15" };
    if (url === "/api/loyalty/context") return { loyaltyDiscountEnabled: false };
    if (url.startsWith("/api/products/volume-discounts")) return {};
    return { valid: false, message: "coupon_expired" };
  };
  const result = await refreshCheckoutCart([item()], coupon, null, request);
  assert.equal(result.coupon, null);
  assert.equal(result.couponRemoved, true);
  await assert.rejects(refreshCheckoutCart([item()], coupon, null, async (method, url) => {
    if (url === "/api/coupons/validate") throw new Error("offline");
    return request(method, url);
  }), /offline/);
  assert.equal(coupon.discountAmount, 99);
});

test("all unavailable items returns an empty cart and removes its coupon without requesting invalid zero-subtotal validation", async () => {
  const result = await refreshCheckoutCart([item()], coupon, 7, async (_method, url) => {
    if (url === "/api/products?branchId=7") return [];
    if (url === "/api/settings" || url === "/api/loyalty/context") return {};
    throw new Error("Unexpected coupon/volume request for empty cart");
  });
  assert.equal(result.items.length, 0);
  assert.equal(result.removed.length, 1);
  assert.equal(result.couponRemoved, true);
});

test("refreshed guest and signed-in weighted preorder totals match server checkout, including free-delivery loss", async () => {
  for (const authenticated of [false, true]) {
    const fresh = product({ price: "10", unit: "100g", availabilityStatus: "out_of_stock_today" });
    const settings = { deliveryFee: "15", freeDeliveryFrom: "30", loyaltyDiscountEnabled: true, loyaltyDiscountPercent: "20" };
    const tiers = [{ minQuantity: "250", discountType: "percentage", discountValue: "10", isActive: true }];
    const refreshed = await refreshCheckoutCart([item(fresh, 375)], null, 7, async (_method, url) => {
      if (url === "/api/products?branchId=7") return [fresh];
      if (url === "/api/settings") return settings;
      if (url === "/api/loyalty/context") return { ...settings, loyaltyDiscountPercent: 20 };
      return { 1: tiers };
    });
    const subtotal = refreshed.items[0].totalPrice;
    const afterVolume = subtotal - cartVolumeDiscount(refreshed.items, refreshed.volume);
    const afterLoyalty = afterVolume - (authenticated ? Math.round(afterVolume * 20) / 100 : 0);
    const total = afterLoyalty + (afterLoyalty >= 30 ? 0 : 15);
    const storage = {
      getStoreSettings: async () => settings,
      getUser: async () => ({ id: "buyer", role: "customer", username: "buyer" }),
      getBranchById: async () => ({ id: 7, isActive: true }),
      getProductsForBranch: async () => [fresh],
      getProductVolumeDiscounts: async () => tiers,
    } as unknown as IStorage;
    const result = await quotePaymentCheckout({
      items: [{ productId: 1, quantity: 375 }], branchId: 7,
      totalAmount: total.toFixed(2), orderData: { deliveryDate: "2026-10-09" },
    }, authenticated ? "buyer" : null, true, storage, new Date("2026-10-08T10:00:00Z"));
    assert.equal(result.orderData.totalAmount, total.toFixed(2));
    assert.equal(result.orderData.deliveryDate, "2026-10-09");
    assert.equal(result.orderData.deliveryFee, authenticated ? "15.00" : "0.00");
  }
});

test("all four checkout languages provide the same complete recovery controls and messages", () => {
  const keys = [
    "cartRefreshNeeded", "cartRefreshAction", "cartRefreshing", "cartRefreshFailed",
    "cartRefreshReview", "cartRefreshTotal", "cartRefreshConfirm", "cartRefreshRemoved",
    "cartRefreshCouponRemoved", "cartRefreshPreorder",
  ];
  for (const lang of ["ru", "en", "he", "ar"]) {
    const messages = JSON.parse(readFileSync(`client/src/locales/${lang}/shop.json`, "utf8")).checkout;
    for (const key of keys) assert.ok(messages[key]?.trim(), `${lang}: ${key}`);
    assert.ok(messages.cartRefreshTotal.includes("{{total}}"));
  }
});
