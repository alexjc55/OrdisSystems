import {
  PAYMENT_PROVIDER_NAMES,
  type PaymentProviderAvailability,
} from "@shared/payment-provider-availability";

/** Defaults keep independently hosted, already configured stores working. */
export function getPaymentProviderAvailability(
  environment: NodeJS.ProcessEnv = process.env,
): PaymentProviderAvailability {
  return Object.fromEntries(PAYMENT_PROVIDER_NAMES.map(provider => {
    const key = `PAYMENT_${provider.toUpperCase()}_ENABLED`;
    const raw = environment[key];
    if (raw === undefined) return [provider, true];
    switch (raw.trim().toLowerCase()) {
      case "true":
      case "1": return [provider, true];
      case "false":
      case "0": return [provider, false];
      default: throw new Error(`${key} must be true, false, 1 or 0`);
    }
  })) as PaymentProviderAvailability;
}

export function isPaymentProviderEnabled(name: string): boolean {
  return PAYMENT_PROVIDER_NAMES.includes(name as typeof PAYMENT_PROVIDER_NAMES[number]) &&
    getPaymentProviderAvailability()[name as typeof PAYMENT_PROVIDER_NAMES[number]];
}

/** Hidden controls must not erase credentials needed by in-flight payments. */
export function preserveDisabledPaymentConfig<T extends { active?: string } | null | undefined>(
  incoming: T, current: T,
): T {
  const availability = getPaymentProviderAvailability();
  if (!Object.values(availability).some(Boolean)) return current;
  const name = incoming?.active;
  if (name && name !== "none" && !isPaymentProviderEnabled(name)) {
    if (name === current?.active) return current;
    throw new Error("payment_provider_disabled");
  }
  return incoming;
}
