export function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₪${numAmount.toFixed(2)}`;
}

export function parseCurrency(amount: string): number {
  return parseFloat(amount.replace('₪', ''));
}

export function calculateTotal(pricePerKg: number | string, weight: number | string): number {
  const price = typeof pricePerKg === 'string' ? parseFloat(pricePerKg) : pricePerKg;
  const qty = typeof weight === 'string' ? parseFloat(weight) : weight;
  return price * qty;
}

export function formatWeight(weight: number | string): string {
  const numWeight = typeof weight === 'string' ? parseFloat(weight) : weight;
  return `${numWeight.toFixed(1)} кг`;
}
