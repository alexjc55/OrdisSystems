import type { IStorage } from "./storage";
import { quoteCheckout } from "./checkout-quote";
import { money } from "./lib/payment-providers/verification";

export { CheckoutQuoteError } from "./checkout-quote";

export async function quotePaymentCheckout(
  body: any, authenticatedUserId: string | null, branchesEnabled: boolean,
  storage: IStorage, now = new Date(),
) {
  // Browser paymentMethod cannot change the online-payment flow.
  const quote = await quoteCheckout({
    ...body, orderData: body?.orderData && { ...body.orderData, paymentMethod: "online" },
  }, authenticatedUserId, branchesEnabled, storage, now);
  // Gateways still require a positive charge; ordinary discounted orders may be free.
  money(quote.orderData.totalAmount);
  return quote;
}
