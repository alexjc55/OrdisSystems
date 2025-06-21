export type ProductUnit = "100g" | "100ml" | "piece" | "kg";

export function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '₪0.00';
  
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
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

export function getUnitLabel(unit: ProductUnit): string {
  const labels = {
    "100g": "за 100г",
    "100ml": "за 100мл", 
    "piece": "за штуку",
    "kg": "за кг"
  };
  return labels[unit];
}

export function getUnitShortLabel(unit: ProductUnit): string {
  const labels = {
    "100g": "100г",
    "100ml": "100мл",
    "piece": "шт",
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
      // For 100g products, quantity is already in grams
      if (quantityNum >= 1000) {
        return `${(quantityNum / 1000).toFixed(2)} ${t ? t('units.kg') : 'кг'}`;
      }
      return `${quantityNum.toFixed(0)}${t ? t('units.g') : 'г'}`;
    case "100ml":
      // For 100ml products, quantity is already in ml
      if (quantityNum >= 1000) {
        return `${(quantityNum / 1000).toFixed(2)} ${t ? t('units.l') : 'л'}`;
      }
      return `${quantityNum.toFixed(0)}${t ? t('units.ml') : 'мл'}`;
    case "piece":
      return `${quantityNum.toFixed(0)} ${t ? t('units.piece') : 'шт'}`;
    case "kg":
      return `${quantityNum.toFixed(2)} ${t ? t('units.kg') : 'кг'}`;
    default:
      return quantityNum.toString();
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