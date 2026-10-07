import type { InsertOrderItem } from "@shared/schema";
import type { IStorage } from "./storage";

// Shared by ordinary checkout and online-payment quotes. All inputs relating
// to identity and item totals must already have been resolved by the server.
export async function calculateOrderDiscounts({
  couponCode, subtotal, userId, userEmail, giftAccepted, orderItems,
}: {
  couponCode?: string | null;
  subtotal: number;
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  giftAccepted?: boolean;
  orderItems?: Array<{ productId: number; quantity: number; totalPrice: string }>;
}, storage: IStorage) {
  const settings = await storage.getStoreSettings();
  let serverCouponCode: string | null = null;
  let serverCouponDiscount = 0;
  let serverLoyaltyDiscount = 0;
  let serverVolumeDiscount = 0;
  let serverGiftProductId: number | null = null;
  const serverDiscountDetails: Record<string, any> = {};
  let giftOrderItem: InsertOrderItem | null = null;
  if (orderItems?.length) {
    const tiersPerProduct = await Promise.all([...new Set(orderItems.map(i => i.productId))].map(async productId => ({
      productId, tiers: (await storage.getProductVolumeDiscounts(productId)).filter(t => t.isActive),
    })));
    const tiersMap = new Map(tiersPerProduct.map(t => [t.productId, t.tiers]));
    const itemBreakdown: Record<number, number> = {};
    for (const item of orderItems) {
      const eligible = (tiersMap.get(item.productId) || []).filter(t => parseFloat(t.minQuantity) <= item.quantity);
      if (!eligible.length) continue;
      const best = eligible.reduce((a, b) => parseFloat(a.minQuantity) >= parseFloat(b.minQuantity) ? a : b);
      const itemTotal = parseFloat(item.totalPrice || "0");
      const discount = best.discountType === "percentage"
        ? Math.round(itemTotal * parseFloat(best.discountValue) / 100 * 100) / 100
        : Math.min(parseFloat(best.discountValue), itemTotal);
      if (discount > 0) {
        serverVolumeDiscount += discount;
        itemBreakdown[item.productId] = (itemBreakdown[item.productId] || 0) + discount;
      }
    }
    serverVolumeDiscount = Math.round(serverVolumeDiscount * 100) / 100;
    if (serverVolumeDiscount > 0) serverDiscountDetails.volumeDiscount = { totalAmount: serverVolumeDiscount, itemBreakdown };
  }
  const subtotalAfterVolume = Math.max(0, subtotal - serverVolumeDiscount);
  if (couponCode) {
    const validation = await storage.validateCoupon(couponCode, subtotalAfterVolume, userId, userEmail, orderItems);
    if (!validation.valid || !validation.coupon) {
      throw Object.assign(new Error(validation.message || "coupon_invalid"), { couponError: validation.message, isCouponError: true });
    }
    if (validation.coupon.scope === "product" && (validation.discountAmount ?? 0) <= 0) {
      throw Object.assign(new Error("coupon_not_eligible_for_cart"), { couponError: "coupon_not_eligible_for_cart", isCouponError: true });
    }
    serverCouponCode = validation.coupon.code;
    serverCouponDiscount = validation.discountAmount || 0;
    serverDiscountDetails.coupon = {
      code: validation.coupon.code, type: validation.coupon.discountType,
      value: parseFloat(validation.coupon.discountValue), discountAmount: serverCouponDiscount,
      stacksWithLoyalty: !!validation.coupon.stacksWithLoyalty,
    };
  }
  if (userId && (!serverCouponCode || serverDiscountDetails.coupon?.stacksWithLoyalty) && settings?.loyaltyDiscountEnabled) {
    const percent = parseFloat(settings.loyaltyDiscountPercent || "0");
    if (percent > 0) {
      serverLoyaltyDiscount = Math.round(subtotalAfterVolume * percent) / 100;
      serverDiscountDetails.loyalty = { percent, discountAmount: serverLoyaltyDiscount };
    }
  }
  if (giftAccepted && settings?.giftEnabled && settings.giftProductId &&
      subtotal >= parseFloat(settings.giftMinOrderAmount || "0")) {
    const gift = await storage.getProductById(settings.giftProductId);
    if (gift) {
      serverGiftProductId = gift.id;
      serverDiscountDetails.gift = { productId: gift.id, productName: gift.name };
      giftOrderItem = {
        productId: gift.id, quantity: String(parseFloat(settings.giftProductQuantity || "1")),
        pricePerKg: "0", totalPrice: "0", orderId: 0,
      };
    }
  }
  return {
    serverCouponCode, serverCouponDiscount, serverLoyaltyDiscount,
    serverVolumeDiscount, serverGiftProductId, serverDiscountDetails, giftOrderItem,
  };
}
