import crypto from "node:crypto";
import type { PendingPayment } from "@shared/schema";
import type { PaymentProviderConfig } from "./index";
import type { PaymentVerificationContext } from "@shared/payment-verification";

export interface VerificationInput {
  pending: PendingPayment;
  payload: Record<string, any>;
  source: "callback" | "webhook";
  notifySecret?: unknown;
  legacyJ5?: boolean;
  legacyBufferPercent?: number;
}

export class PaymentVerificationError extends Error {
  constructor() { super("Payment could not be verified"); }
}
function requireMatch(condition: unknown): asserts condition {
  if (!condition) throw new PaymentVerificationError();
}
export function money(value: unknown): number {
  requireMatch(typeof value === "number" || typeof value === "string");
  requireMatch(/^\d+(?:\.\d{1,2})?$/.test(String(value)));
  const result = Math.round(Number(value) * 100);
  requireMatch(Number.isSafeInteger(result) && result > 0);
  return result;
}
function sameSecret(received: unknown, expected: string): boolean {
  return typeof received === "string" && Buffer.byteLength(received) === Buffer.byteLength(expected) &&
    crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}
export function merchantFingerprint(config: PaymentProviderConfig, name: string): string {
  const c = (config as any)[name];
  requireMatch(c);
  // No credentials in the database snapshot. The fingerprint also detects key rotation.
  const identity = name === "hyp" ? [c.masof, c.passP, c.key] :
    name === "grow" ? [c.userId, c.apiKey, c.pageCode] :
    name === "allpay" ? [c.login, c.apiKey] : [c.sellerPaymeId];
  return crypto.createHash("sha256").update(JSON.stringify([name, identity, !!c.testMode])).digest("hex");
}
export function checkoutVerification(config: PaymentProviderConfig, name: string, amount: number): PaymentVerificationContext {
  const c = (config as any)[name];
  const j5 = c?.j5Enabled === true;
  const buffer = j5 ? Number(c.j5BufferPercent || 0) : 0;
  requireMatch(Number.isFinite(buffer) && buffer >= 0);
  const amountInAgorot = Math.round(amount * (1 + buffer / 100));
  requireMatch(Number.isSafeInteger(amountInAgorot) && amountInAgorot > 0);
  return { provider: name, merchant: merchantFingerprint(config, name),
    amountInAgorot, j5, notifySecret: crypto.randomBytes(32).toString("hex") };
}
function expectedAmount(input: VerificationInput): number {
  return input.pending.verification?.amountInAgorot ??
    Math.round(money((input.pending.orderData as any).totalAmount) *
      (1 + (input.legacyJ5 ? Number(input.legacyBufferPercent || 0) : 0) / 100));
}
function verifiedId(input: VerificationInput, id: unknown): string {
  requireMatch(typeof id === "string" || typeof id === "number");
  const result = String(id);
  requireMatch(result.length > 0 && result.length <= 255);
  requireMatch(!input.pending.transactionId || input.pending.transactionId === result);
  return result;
}
async function post(url: string, body: URLSearchParams | Record<string, any>): Promise<any> {
  const form = body instanceof URLSearchParams;
  const response = await fetch(url, {
    method: "POST", signal: AbortSignal.timeout(15_000),
    headers: { "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json" },
    body: form ? body.toString() : JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Payment verification service unavailable");
  return response.json();
}
// A private, per-payment notification URL is sent ONLY to the provider's API.
// It is never put in a return URL, redirect URL, API response or browser storage.
// Used for the older Grow contract and PayMe MPL (which has no signature keys).
function privateNotification(input: VerificationInput) {
  requireMatch(input.source === "webhook" && input.pending.verification);
  requireMatch(sameSecret(input.notifySecret, input.pending.verification.notifySecret));
}

export async function verifyHyp(input: VerificationInput, credentials: { masof: string; passP: string; key: string }): Promise<string> {
  const p = input.payload;
  requireMatch(p.Order === input.pending.token && p.CCode === "0" && typeof p.Sign === "string" && p.Sign.length > 0);
  const amount = money(p.Amount);
  const expected = expectedAmount(input);
  // Before verification snapshots, this integration sent agorot as HYP's
  // decimal ILS Amount. Honor only that exact historical amount (or the
  // documented ILS amount), with successful remote signature verification.
  // New payments have one exact, persisted expected amount.
  requireMatch(amount === expected || (!input.pending.verification && amount === expected * 100));
  requireMatch(!p.Coin || p.Coin === "1");
  requireMatch(!p.Masof || p.Masof === credentials.masof);
  const id = verifiedId(input, p.Id);
  const params = new URLSearchParams({ action: "APISign", What: "VERIFY",
    Masof: credentials.masof, KEY: credentials.key, PassP: credentials.passP });
  for (const [key, value] of Object.entries(p)) {
    requireMatch(typeof value === "string");
    // Never allow untrusted parameters to change the verification operation/credentials.
    if (!["action", "What", "Masof", "KEY", "PassP"].includes(key)) params.append(key, value);
  }
  const response = await fetch(`https://pay.hyp.co.il/p/?${params}`, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error("Payment verification service unavailable");
  const text = await response.text();
  requireMatch(!text.includes("<") && new URLSearchParams(text.trim()).get("CCode") === "0");
  return id;
}

export async function verifyAllPay(input: VerificationInput, login: string, key: string,
  sign: (data: Record<string, any>, key: string) => string): Promise<string> {
  let p = input.payload;
  if (input.source === "webhook") {
    requireMatch(sameSecret(p.sign, sign(p, key)));
    requireMatch(!p.type && p.subscription_create == null);
    requireMatch(!p.login || p.login === login);
    requireMatch(!p.add_field_1 || p.add_field_1 === input.pending.token);
  } else {
    const body = { login, order_id: input.pending.token, sign: "" };
    body.sign = sign(body, key);
    p = await post("https://allpay.to/app/?show=paymentstatus&mode=api12", body);
  }
  requireMatch(p.order_id === input.pending.token && String(p.status) === "1");
  requireMatch(p.currency === "ILS" && money(p.amount) === expectedAmount(input));
  return verifiedId(input, p.order_id);
}

export async function verifyGrow(input: VerificationInput, base: string, pageCode: string): Promise<string> {
  const p = input.payload.data || input.payload;
  const context = input.pending.verification;
  const announced = p.transactionCode || p.transactionId;
  if (context?.processId && context.processToken) {
    const info = await post(`${base}/getPaymentProcessInfo`, new URLSearchParams({
      pageCode, processId: context.processId, processToken: context.processToken,
    }));
    requireMatch(String(info.status) === "1" && String(info.data?.processId) === context.processId &&
      info.data?.processToken === context.processToken && Array.isArray(info.data?.transactions));
    const transactions = info.data.transactions.filter((t: any) =>
      (!announced || String(t.transactionId) === String(announced)) &&
      String(t.statusCode) === (context.j5 ? "11" : "2") &&
      money(t.sum) === expectedAmount(input));
    requireMatch(transactions.length === 1);
    return verifiedId(input, transactions[0].transactionId);
  }
  // In-flight sessions from before process details were persisted can be queried
  // using the provider's transaction pair; the returned description binds our token.
  if (p.transactionId && p.transactionToken) {
    const info = await post(`${base}/getTransactionInfo`, new URLSearchParams({
      pageCode, transactionId: String(p.transactionId), transactionToken: p.transactionToken,
    }));
    const t = info.data;
    requireMatch(String(info.status) === "1" && String(t?.transactionId) === String(p.transactionId) &&
      t.transactionToken === p.transactionToken && t.description === input.pending.token);
    requireMatch(String(t.statusCode) === ((context?.j5 ?? input.legacyJ5) ? "11" : "2") && money(t.sum) === expectedAmount(input));
    return verifiedId(input, t.transactionId);
  }
  privateNotification(input);
  requireMatch(!p.paymentDesc || p.paymentDesc === input.pending.token);
  requireMatch(money(p.paymentSum ?? p.sum) === expectedAmount(input));
  requireMatch(p.statusCode == null || String(p.statusCode) === (context?.j5 ? "11" : "2"));
  return verifiedId(input, announced);
}

export async function verifyPayme(input: VerificationInput): Promise<string> {
  privateNotification(input);
  const p = input.payload;
  requireMatch(p.transaction_id === input.pending.token && String(p.status_code) === "0");
  requireMatch(p.notify_type === (input.pending.verification?.j5 ? "sale-authorized" : "sale-complete"));
  requireMatch(String(p.is_token_sale ?? "0") === "0" && p.currency === "ILS");
  requireMatch((typeof p.price === "number" || typeof p.price === "string") &&
    /^\d+$/.test(String(p.price)) && Number.isSafeInteger(Number(p.price)) &&
    Number(p.price) === expectedAmount(input));
  requireMatch(input.pending.verification?.saleId === p.payme_sale_id && !!p.payme_sale_id);
  return verifiedId(input, p.payme_sale_id);
}
