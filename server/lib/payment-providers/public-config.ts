import { getProvider, type PaymentProviderConfig } from "./index";
import { isPaymentProviderEnabled } from "./availability";

/** Public checkout needs availability, not merchant credentials or API keys. */
export function publicPaymentConfig(config: PaymentProviderConfig | null | undefined) {
  return {
    active: config?.active || "none",
    configured: isPaymentProviderEnabled(config?.active || "none") &&
      !!getProvider({ paymentProviderConfig: config }),
  };
}
