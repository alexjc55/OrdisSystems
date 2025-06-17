export function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₪${numAmount.toFixed(2)}`;
}

export function parseCurrency(amount: string): number {
  return parseFloat(amount.replace('₪', ''));
}

export function calculateTotal(pricePer100g: number | string, weight: number | string): number {
  const price = typeof pricePer100g === 'string' ? parseFloat(pricePer100g) : pricePer100g;
  const weightInKg = typeof weight === 'string' ? parseFloat(weight) : weight;
  // Convert weight from kg to 100g units (1 kg = 10 units of 100g)
  return price * (weightInKg * 10);
}

export function formatWeight(weight: number | string): string {
  const numWeight = typeof weight === 'string' ? parseFloat(weight) : weight;
  return `${numWeight.toFixed(1)} кг`;
}
