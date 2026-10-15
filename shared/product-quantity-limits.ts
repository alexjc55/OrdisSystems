import type { Product } from "./schema";

type QuantityLimits = Pick<Product, "unit" | "minOrderQuantity" | "maxOrderQuantity">;

// Match the existing product editor and storefront: for 100g/100ml products,
// stored limits count hundreds of grams/ml (5.5 means 550g/ml), not kg/litres.
// Non-positive limits mean no restriction, including a stored maximum of zero.
export function isProductQuantityWithinLimits(product: QuantityLimits, quantity: number): boolean {
  const multiplier = product.unit === "100g" || product.unit === "100ml" ? 100 : 1;
  const min = Number(product.minOrderQuantity);
  const max = Number(product.maxOrderQuantity);
  // Quantities and stored limits have three decimal places. Compare integers
  // so an exact upper boundary cannot fail due to floating-point multiplication.
  const scaledQuantity = Math.round(quantity * 1000);
  return !(min > 0 && scaledQuantity < Math.round(min * 1000) * multiplier) &&
    !(max > 0 && scaledQuantity > Math.round(max * 1000) * multiplier);
}
