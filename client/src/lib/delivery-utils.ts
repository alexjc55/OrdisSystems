// Utility functions for dynamic delivery fee calculation
export const calculateDeliveryFee = (
  orderTotal: number, 
  deliveryFee: number, 
  freeDeliveryFrom: number | null
): number => {
  // If no free delivery threshold is set or it's empty/invalid, always charge delivery fee
  if (!freeDeliveryFrom || isNaN(freeDeliveryFrom) || freeDeliveryFrom <= 0) {
    return deliveryFee;
  }
  return orderTotal >= freeDeliveryFrom ? 0 : deliveryFee;
};

// Parse free delivery threshold from store settings
export const parseFreeDeliveryThreshold = (freeDeliveryFrom: string | null | undefined): number | null => {
  if (!freeDeliveryFrom || freeDeliveryFrom.trim() === "") {
    return null;
  }
  const parsed = parseFloat(freeDeliveryFrom);
  return isNaN(parsed) ? null : parsed;
};

// Calculate delivery fee from store settings
export const calculateDeliveryFeeFromSettings = (
  orderTotal: number,
  storeSettings: any
): number => {
  const deliveryFee = parseFloat(storeSettings?.deliveryFee || "15.00");
  const freeDeliveryThreshold = parseFreeDeliveryThreshold(storeSettings?.freeDeliveryFrom);
  
  return calculateDeliveryFee(orderTotal, deliveryFee, freeDeliveryThreshold);
};