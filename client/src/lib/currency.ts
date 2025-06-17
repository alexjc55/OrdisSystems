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
  
  switch (unit) {
    case "100g":
    case "100ml":
      // Convert quantity from kg/l to 100g/100ml units (multiply by 10)
      return priceNum * quantityNum * 10;
    case "piece":
      return priceNum * quantityNum;
    case "kg":
      return priceNum * quantityNum;
    default:
      return priceNum * quantityNum;
  }
}

export function formatQuantity(quantity: number | string, unit: ProductUnit): string {
  const quantityNum = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
  if (isNaN(quantityNum)) return '0';
  
  switch (unit) {
    case "100g":
      if (quantityNum < 1) {
        return `${(quantityNum * 1000).toFixed(0)}г`;
      }
      return `${quantityNum.toFixed(2)} кг`;
    case "100ml":
      if (quantityNum < 1) {
        return `${(quantityNum * 1000).toFixed(0)}мл`;
      }
      return `${quantityNum.toFixed(2)} л`;
    case "piece":
      return `${quantityNum.toFixed(0)} шт`;
    case "kg":
      return `${quantityNum.toFixed(2)} кг`;
    default:
      return quantityNum.toString();
  }
}

// Legacy functions for backward compatibility
export function formatWeight(weight: number | string): string {
  return formatQuantity(weight, "100g");
}