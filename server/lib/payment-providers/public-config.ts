import { getProvider, type PaymentProviderConfig } from "./index";

/** Public checkout needs availability, not merchant credentials or API keys. */
export function publicPaymentConfig(config: PaymentProviderConfig | null | undefined) {
  return {
    active: config?.active || "none",
    configured: !!getProvider({ paymentProviderConfig: config }),
  };
}
