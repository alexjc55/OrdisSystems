import { useQuery } from "@tanstack/react-query";
import { PAYMENT_PROVIDER_NAMES, type PaymentProviderName } from "@shared/payment-provider-availability";
export type { PaymentProviderName } from "@shared/payment-provider-availability";

type PaymentProviderAvailabilityResponse = {
  paymentProviders?: Partial<Record<PaymentProviderName, boolean>>;
};

const PROVIDERS = PAYMENT_PROVIDER_NAMES;

export function usePaymentProviderAvailability() {
  const { data, isLoading, isError } = useQuery<PaymentProviderAvailabilityResponse>({
    queryKey: ["/api/config"],
  });

  const enabledProviders: Record<PaymentProviderName, boolean> = {
    hyp: data?.paymentProviders?.hyp === true,
    grow: data?.paymentProviders?.grow === true,
    allpay: data?.paymentProviders?.allpay === true,
    payme: data?.paymentProviders?.payme === true,
  };
  const hasAnyProvider = PROVIDERS.some((provider) => enabledProviders[provider]);

  const isProviderEnabled = (name: string): boolean =>
    PROVIDERS.includes(name as PaymentProviderName) &&
    enabledProviders[name as PaymentProviderName] === true;

  return { enabledProviders, hasAnyProvider, isProviderEnabled, isLoading, isError };
}
