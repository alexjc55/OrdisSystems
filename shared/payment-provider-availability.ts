export const PAYMENT_PROVIDER_NAMES = ["hyp", "grow", "allpay", "payme"] as const;
export type PaymentProviderName = typeof PAYMENT_PROVIDER_NAMES[number];
export type PaymentProviderAvailability = Record<PaymentProviderName, boolean>;
