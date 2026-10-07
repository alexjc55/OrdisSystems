/** Server-owned checkout facts. Never return this context to the browser. */
export interface PaymentVerificationContext {
  provider: string;
  merchant: string;
  amountInAgorot: number;
  j5: boolean;
  notifySecret: string;
  processId?: string;
  processToken?: string;
  saleId?: string;
}
