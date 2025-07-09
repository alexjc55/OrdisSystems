export type ProductUnit = "100g" | "100ml" | "piece" | "kg" | "portion";

export function formatCurrency(amount: number | string, locale?: string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '₪0.00';
  
  // For Hebrew interface, always show shekel symbol on the left
  // regardless of RTL direction to maintain consistency
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
  
  return `₪${formatted}`;
}

export function parseCurrency(amount: string): number {
  // Remove currency symbol and parse
  const cleaned = amount.replace(/[₪,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function roundUpToNearestTenAgorot(amount: number): number {
  // Round up to the nearest 0.10 ₪ (10 agorot)
  return Math.ceil(amount * 10) / 10;
}

export function getUnitLabel(unit: ProductUnit, t?: (key: string, fallback?: string) => string): string {
  if (t) {
    const labels = {
      "100g": t('units.per100g'),
      "100ml": t('units.per100ml'), 
      "piece": `${t('units.per')} ${t('units.piece')}`,
      "portion": `${t('units.per')} ${t('units.portion')}`,
      "kg": `${t('units.per')} ${t('units.kg')}`
    };
    return labels[unit];
  }
  
  // Fallback without translation
  const labels = {
    "100g": "за 100г",
    "100ml": "за 100мл", 
    "piece": "за штуку",
    "portion": "за порцию",
    "kg": "за кг"
  };
  return labels[unit];
}

export function getUnitShortLabel(unit: ProductUnit, t?: (key: string, fallback?: string) => string): string {
  if (t) {
    const labels = {
      "100g": t('units.per100g', '100г'),
      "100ml": t('units.per100ml', '100мл'),
      "piece": t('units.piece', 'шт'),
      "portion": t('units.portionShort', 'порц.'),
      "kg": t('units.kg', 'кг')
    };
    return labels[unit];
  }
  
  // Fallback without translation
  const labels = {
    "100g": "100г",
    "100ml": "100мл",
    "piece": "шт",
    "portion": "порц.",
    "kg": "кг"
  };
  return labels[unit];
}

export function calculateTotal(price: number | string, quantity: number | string, unit: ProductUnit): number {
  const priceNum = typeof price === 'string' ? parseFloat(price) : price;
  const quantityNum = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
  
  if (isNaN(priceNum) || isNaN(quantityNum)) return 0;
  
  let total;
  switch (unit) {
    case "100g":
    case "100ml":
      // Price is per 100g/100ml, quantity is in grams/ml, so divide by 100
      total = priceNum * (quantityNum / 100);
      break;
    case "piece":
      total = priceNum * quantityNum;
      break;
    case "kg":
      total = priceNum * quantityNum;
      break;
    default:
      total = priceNum * quantityNum;
  }
  
  // Round up to nearest 10 agorot (0.10 ₪)
  return roundUpToNearestTenAgorot(total);
}

export function formatQuantity(quantity: number | string, unit: ProductUnit, t?: (key: string) => string): string {
  const quantityNum = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
  if (isNaN(quantityNum)) return '0';
  
  switch (unit) {
    case "100g":
      // For 100g products, quantity is already in grams - show as whole numbers
      if (quantityNum >= 1000) {
        return `${Math.round(quantityNum / 1000)} ${t ? t('units.kg') : 'кг'}`;
      }
      return `${Math.round(quantityNum)} ${t ? t('units.g') : 'г'}`;
    case "100ml":
      // For 100ml products, quantity is already in ml - show as whole numbers
      if (quantityNum >= 1000) {
        return `${Math.round(quantityNum / 1000)} ${t ? t('units.l') : 'л'}`;
      }
      return `${Math.round(quantityNum)} ${t ? t('units.ml') : 'мл'}`;
    case "piece":
      return `${Math.round(quantityNum)} ${t ? t('units.piece') : 'шт'}`;
    case "portion":
      return `${Math.round(quantityNum)} ${t ? t('units.portionShort') : 'порц.'}`;
    case "kg":
      return `${Math.round(quantityNum)} ${t ? t('units.kg') : 'кг'}`;
    default:
      return Math.round(quantityNum).toString();
  }
}

// Legacy functions for backward compatibility
export function formatWeight(weight: number | string): string {
  return formatQuantity(weight, "100g");
}

// Convert single delivery time to time range format
export function formatDeliveryTimeRange(deliveryTime: string): string {
  if (!deliveryTime) return deliveryTime;
  
  // If it's already a range, return as is
  if (deliveryTime.includes(' - ')) {
    return deliveryTime;
  }
  
  // Parse the time and create a 2-hour range
  const timeMatch = deliveryTime.match(/(\d{1,2}):(\d{2})/);
  if (!timeMatch) return deliveryTime;
  
  const hour = parseInt(timeMatch[1]);
  const minute = parseInt(timeMatch[2]);
  
  // Create 2-hour range
  const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const endHour = hour + 2;
  const endTime = `${endHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  
  return `${startTime} - ${endTime}`;
}