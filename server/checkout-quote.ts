import type { InsertOrder, InsertOrderItem } from "@shared/schema";
import { calculateTotal, effectiveProductPrice } from "@shared/product-pricing";
import type { IStorage } from "./storage";
import { calculateOrderDiscounts } from "./order-discounts";

export class CheckoutQuoteError extends Error {
  constructor(message: string, public status = 400, public code = "INVALID_CHECKOUT") {
    super(message);
  }
}

function decimal(value: unknown): number {
  if ((typeof value !== "number" && typeof value !== "string") ||
      !/^\d+(\.\d{1,3})?$/.test(String(value))) throw new CheckoutQuoteError("Invalid quantity");
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > 9999999.999) throw new CheckoutQuoteError("Invalid quantity");
  return number;
}

function cents(value: unknown): number {
  if ((typeof value !== "number" && typeof value !== "string") ||
      !/^\d+(?:\.\d{1,2})?$/.test(String(value))) throw new CheckoutQuoteError("Invalid checkout total");
  const result = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(result) || result < 0) throw new CheckoutQuoteError("Invalid checkout total");
  return result;
}

// All customer checkout paths use this calculation. Browser monetary fields
// are never authorities; the submitted total is only a consent/consistency check.
export async function quoteCheckout(
  body: any, authenticatedUserId: string | null, branchesEnabled: boolean,
  storage: IStorage, now = new Date(),
) {
  if (!body || !Array.isArray(body.items) || !body.items.length || body.items.length > 200 ||
      !body.orderData || typeof body.orderData !== "object" || Array.isArray(body.orderData)) {
    throw new CheckoutQuoteError("Invalid order items or order data");
  }
  const data = body.orderData;
  const settings = await storage.getStoreSettings();
  if (!settings) throw new CheckoutQuoteError("Store settings not found");
  const user = authenticatedUserId ? await storage.getUser(authenticatedUserId) : undefined;
  if (authenticatedUserId && !user) throw new CheckoutQuoteError("Please sign in again", 401);

  let branchId: number | undefined;
  if (branchesEnabled) {
    const requested = body.branchId ?? data.branchId;
    branchId = Number(requested);
    if (!Number.isSafeInteger(branchId) || branchId <= 0 ||
        (data.branchId != null && Number(data.branchId) !== branchId)) throw new CheckoutQuoteError("Select a valid branch");
    const branch = await storage.getBranchById(branchId);
    if (!branch?.isActive) throw new CheckoutQuoteError("Branch is unavailable");
  }
  const branchProducts = branchId !== undefined
    ? new Map((await storage.getProductsForBranch(branchId)).map(product => [product.id, product]))
    : null;
  const quantities = new Map<number, number>();
  for (const item of body.items) {
    if (!item || !Number.isSafeInteger(item.productId) || item.productId <= 0) throw new CheckoutQuoteError("Invalid product");
    const quantity = (quantities.get(item.productId) || 0) + decimal(item.quantity);
    if (quantity > 9999999.999) throw new CheckoutQuoteError("Invalid quantity");
    quantities.set(item.productId, quantity);
  }
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const deliveryDate = typeof data.deliveryDate === "string" ? data.deliveryDate : "";
  if (deliveryDate && (!/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate) ||
      Number.isNaN(Date.parse(deliveryDate)) || new Date(deliveryDate).toISOString().slice(0, 10) !== deliveryDate ||
      deliveryDate < today)) throw new CheckoutQuoteError("Invalid delivery date");

  const orderItems: InsertOrderItem[] = [];
  for (const [productId, quantity] of quantities) {
    const product = branchProducts ? branchProducts.get(productId) : await storage.getProductById(productId);
    if (!product || !product.isActive || !product.isAvailable || product.availabilityStatus === "completely_unavailable") {
      throw new CheckoutQuoteError("Product is unavailable");
    }
    if (product.availabilityStatus === "out_of_stock_today" && (!deliveryDate || deliveryDate <= today)) {
      throw new CheckoutQuoteError("This product is available for preorder only");
    }
    // Catalog limits are kg for 100g/ml products; cart quantities are grams/ml.
    const limitQuantity = product.unit === "100g" || product.unit === "100ml" ? quantity / 1000 : quantity;
    if ((product.minOrderQuantity != null && limitQuantity < Number(product.minOrderQuantity)) ||
        (product.maxOrderQuantity != null && limitQuantity > Number(product.maxOrderQuantity))) {
      throw new CheckoutQuoteError("Product quantity is outside the allowed range");
    }
    const price = effectiveProductPrice(product);
    const total = calculateTotal(price, quantity, product.unit);
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(total) || total < 0) throw new CheckoutQuoteError("Invalid catalog price");
    orderItems.push({
      productId, quantity: String(quantity), pricePerKg: price.toFixed(2),
      totalPrice: total.toFixed(2), orderId: 0,
    });
  }
  const subtotal = Math.round(orderItems.reduce((sum, item) => sum + Number(item.totalPrice), 0) * 100) / 100;
  if (data.couponCode != null && typeof data.couponCode !== "string") throw new CheckoutQuoteError("Invalid coupon");
  const discounts = await calculateOrderDiscounts({
    subtotal, couponCode: data.couponCode, userId: user?.id,
    userEmail: user?.email || data.guestEmail, giftAccepted: data.giftAccepted === true,
    orderItems: orderItems.map(item => ({ productId: item.productId, quantity: Number(item.quantity), totalPrice: item.totalPrice })),
  }, storage);
  const discountedSubtotal = Math.max(0, subtotal - discounts.serverVolumeDiscount -
    discounts.serverCouponDiscount - discounts.serverLoyaltyDiscount);
  const configuredFee = Number(settings.deliveryFee ?? "15.00");
  const threshold = settings.freeDeliveryFrom == null ? null : Number(settings.freeDeliveryFrom);
  if (!Number.isFinite(configuredFee) || configuredFee < 0 || (threshold !== null && !Number.isFinite(threshold))) {
    throw new CheckoutQuoteError("Invalid delivery configuration");
  }
  const deliveryFee = threshold !== null && threshold > 0 && discountedSubtotal >= threshold ? 0 : configuredFee;
  const totalAmount = (discountedSubtotal + deliveryFee).toFixed(2);
  const amountInAgorot = cents(totalAmount);
  if (cents(body.totalAmount) !== amountInAgorot ||
      (data.totalAmount !== undefined && cents(data.totalAmount) !== amountInAgorot)) {
    throw new CheckoutQuoteError("Cart price changed. Please review your cart before placing the order.", 409, "CART_PRICE_CHANGED");
  }
  const descriptive: Record<string, string> = {};
  for (const field of ["deliveryAddress", "deliveryDate", "deliveryTime", "customerPhone", "customerNotes",
    "guestName", "guestEmail", "guestPhone", "paymentMethod"] as const) {
    if (data[field] != null) {
      if (typeof data[field] !== "string" || data[field].length > 5000) throw new CheckoutQuoteError("Invalid order data");
      descriptive[field] = data[field];
    }
  }
  const orderData: InsertOrder = {
    ...descriptive, userId: user?.id || null, totalAmount, deliveryFee: deliveryFee.toFixed(2),
    status: "pending",
    orderLanguage: ["ru", "en", "he", "ar"].includes(body.language) ? body.language : "ru",
    ...(branchId !== undefined ? { branchId } : {}),
    couponCode: discounts.serverCouponCode,
    couponDiscount: discounts.serverCouponDiscount.toFixed(2),
    loyaltyDiscount: discounts.serverLoyaltyDiscount.toFixed(2),
    giftProductId: discounts.serverGiftProductId,
    discountDetails: discounts.serverDiscountDetails,
  };
  if (discounts.giftOrderItem) orderItems.push(discounts.giftOrderItem);
  return {
    orderData, orderItems, amountInAgorot, userId: user?.id || null,
    volumeDiscount: discounts.serverVolumeDiscount,
    customerName: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username : orderData.guestName || "",
    customerEmail: user?.email || orderData.guestEmail || "",
    customerPhone: orderData.customerPhone || orderData.guestPhone || user?.phone || "",
  };
}
