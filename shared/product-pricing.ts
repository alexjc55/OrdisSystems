import type { Product } from "./schema";

export function effectiveProductPrice(product: Pick<Product, "price" | "isSpecialOffer" | "discountType" | "discountValue">): number {
  const base = parseFloat(product.price);
  if (product.isSpecialOffer && product.discountType && product.discountValue) {
    const discount = parseFloat(String(product.discountValue));
    if (!isNaN(discount)) {
      if (product.discountType === "percentage") return Math.max(0, base * (1 - discount / 100));
      if (product.discountType === "fixed") return Math.max(0, base - discount);
    }
  }
  return base;
}

export function roundUpToNearestTenAgorot(amount: number): number {
  return Math.ceil(amount * 10) / 10;
}

export function calculateTotal(price: number | string, quantity: number | string, unit: string): number {
  const priceNum = typeof price === "string" ? parseFloat(price) : price;
  const quantityNum = typeof quantity === "string" ? parseFloat(quantity) : quantity;
  if (isNaN(priceNum) || isNaN(quantityNum)) return 0;
  const total = unit === "100g" || unit === "100ml"
    ? priceNum * (quantityNum / 100)
    : priceNum * quantityNum;
  return roundUpToNearestTenAgorot(total);
}
