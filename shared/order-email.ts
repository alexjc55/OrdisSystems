// Only template data belongs here, never SMTP credentials or transport errors.
export interface CheckoutEmailSnapshot {
  customerName: string;
  totalAmount: string;
  details: {
    customerPhone?: string | null;
    deliveryAddress?: string | null;
    deliveryDate?: string | null;
    deliveryTime?: string | null;
    paymentMethod?: string | null;
    customerNotes?: string | null;
    status: string;
    branchName?: string | null;
    couponCode?: string | null;
    couponDiscount?: number | null;
    loyaltyDiscount?: number | null;
    giftProductId?: number | null;
    items: Array<{
      productId: number;
      quantity: number;
      pricePerKg: number;
      totalPrice: number;
      product: {
        name: string | null;
        name_en: string | null;
        name_he: string | null;
        name_ar: string | null;
        unit: string;
      } | null;
    }>;
  };
  guestLanguage: string;
  notifyGuest: boolean;
  guestAccessToken?: string | null;
  guestClaimToken?: string | null;
  baseUrl?: string;
  primaryColor?: string;
  deliveryFee: number;
  volumeDiscount: number;
}
