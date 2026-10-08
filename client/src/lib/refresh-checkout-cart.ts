import type { Product, StoreSettings } from "../../../shared/schema";
import { calculateTotal, effectiveProductPrice } from "../../../shared/product-pricing";
import type { AppliedCoupon, CartItem } from "./cart";
import { apiRequest } from "./queryClient";

export type VolumeDiscounts = Record<number, Array<{
  minQuantity: string; discountType: string; discountValue: string;
}>>;

export interface LoyaltyContext {
  loyaltyDiscountEnabled: boolean;
  loyaltyDiscountPercent: number;
  giftEnabled: boolean;
  giftProduct: Product | null;
  giftProductQuantity: number;
  giftMinOrderAmount: number;
}

export function reconcileCartItems(items: CartItem[], products: Product[]) {
  const catalog = new Map(products.map(product => [product.id, product]));
  const removed: CartItem[] = [];
  const refreshed: CartItem[] = [];
  for (const item of items) {
    const product = catalog.get(item.product.id);
    // Never reinterpret a saved weight as pieces (or vice versa), or silently
    // adjust quantities when the catalog's ordering limits have changed.
    const limitQuantity = product?.unit === "100g" || product?.unit === "100ml"
      ? item.quantity / 1000 : item.quantity;
    if (!product || !product.isActive || !product.isAvailable ||
        product.availabilityStatus === "completely_unavailable" ||
        product.unit !== item.product.unit ||
        (product.minOrderQuantity != null && limitQuantity < Number(product.minOrderQuantity)) ||
        (product.maxOrderQuantity != null && limitQuantity > Number(product.maxOrderQuantity))) {
      removed.push(item);
      continue;
    }
    refreshed.push({
      product, quantity: item.quantity,
      totalPrice: calculateTotal(effectiveProductPrice(product), item.quantity, product.unit),
    });
  }
  return { items: refreshed, removed };
}

export function cartVolumeDiscount(items: CartItem[], discounts: VolumeDiscounts = {}) {
  let total = 0;
  for (const item of items) {
    const tiers = (discounts[item.product.id] || []).filter(tier =>
      tier.minQuantity != null && Number(tier.minQuantity) <= item.quantity);
    if (!tiers.length) continue;
    const best = tiers.reduce((a, b) => Number(a.minQuantity) >= Number(b.minQuantity) ? a : b);
    total += best.discountType === "percentage"
      ? Math.round(item.totalPrice * Number(best.discountValue) / 100 * 100) / 100
      : Math.min(Number(best.discountValue), item.totalPrice);
  }
  return Math.round(total * 100) / 100;
}

// Fetch everything before committing any cart state. A network failure must
// not look like a cancelled coupon or a successfully updated checkout.
export async function refreshCheckoutCart(
  items: CartItem[], coupon: AppliedCoupon | null, branchId: number | null,
  request: typeof apiRequest = apiRequest,
) {
  const [products, settings, loyalty] = await Promise.all([
    request("GET", `/api/products${branchId ? `?branchId=${branchId}` : ""}`) as Promise<Product[]>,
    request("GET", "/api/settings") as Promise<StoreSettings>,
    request("GET", "/api/loyalty/context") as Promise<LoyaltyContext>,
  ]);
  if (!Array.isArray(products) || !settings || !loyalty) throw new Error("Invalid checkout refresh");
  const reconciled = reconcileCartItems(items, products);
  const productIds = reconciled.items.map(item => item.product.id).join(",");
  const volume: VolumeDiscounts = productIds
    ? await request("GET", `/api/products/volume-discounts?productIds=${productIds}`) : {};
  const subtotal = Math.round(reconciled.items.reduce((sum, item) => sum + item.totalPrice, 0) * 100) / 100;
  const orderTotal = Math.max(0, subtotal - cartVolumeDiscount(reconciled.items, volume));
  let refreshedCoupon: AppliedCoupon | null = null;
  if (coupon && orderTotal > 0) {
    const validation = await request("POST", "/api/coupons/validate", {
      code: coupon.code, orderTotal,
      cartItems: reconciled.items.map(item => ({
        productId: item.product.id, quantity: item.quantity, totalPrice: item.totalPrice.toFixed(2),
      })),
    });
    if (validation.valid && validation.coupon) {
      refreshedCoupon = {
        code: validation.coupon.code, discountType: validation.coupon.discountType,
        discountValue: Number(validation.coupon.discountValue),
        discountAmount: validation.discountAmount ?? 0,
        stacksWithLoyalty: !!validation.coupon.stacksWithLoyalty,
      };
    }
  }
  return {
    ...reconciled, settings, loyalty, volume, productIds,
    coupon: refreshedCoupon, couponRemoved: !!coupon && !refreshedCoupon,
  };
}
