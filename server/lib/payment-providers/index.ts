// ─── Payment Provider Abstraction ─────────────────────────────────────────────
// Defines a common interface for online payment gateways.
// Adding a new provider requires only a new class implementing IPaymentProvider.

import crypto from 'crypto';

export interface PaymentProviderConfig {
  active: 'none' | 'hyp' | 'grow' | 'allpay' | 'payme';
  hyp?: {
    masof: string;
    passP: string;
    key: string;
    testMode?: boolean;
    j5Enabled?: boolean;        // Deferred transaction: reserves funds without charging
    j5BufferPercent?: number;   // Extra % added to reserved amount (e.g. 10 = +10% buffer)
    sendEmail?: boolean;        // Auto-send payment receipt to customer email
  };
  grow?: {
    userId: string;
    apiKey: string;
    pageCode: string;
    testMode?: boolean;
    j5Enabled?: boolean;        // Deferred transaction: reserves funds without charging
    j5BufferPercent?: number;   // Extra % added to reserved amount (e.g. 10 = +10% buffer)
    maxInstallments?: number;   // 1 = single payment, 2–12 = installments
    createInvoice?: boolean;    // Auto-send invoice to customer after payment
  };
  allpay?: {
    login: string;              // API login from AllPay Settings → Integrations
    apiKey: string;             // Private API key used to sign requests
    j5Enabled?: boolean;        // Pre-authorization: reserves funds without charging (7 days)
    j5BufferPercent?: number;   // Extra % added to reserved amount (e.g. 10 = +10% buffer)
    maxInstallments?: number;   // 1 = single payment, 2–12 = installments
    createInvoice?: boolean;    // Auto-issue receipt/invoice after payment (doc_type 400)
  };
  payme?: {
    sellerPaymeId: string;      // MPL key from PayMe account (MPLDEMO-MPLDEMO-MPLDEMO-1234567)
    testMode?: boolean;         // true → sandbox.payme.io, false → live.payme.io
    j5Enabled?: boolean;        // Pre-authorization: reserves funds without charging (7 days)
    j5BufferPercent?: number;   // Extra % added to reserved amount (e.g. 10 = +10% buffer)
  };
}

export interface InitiateParams {
  token: string;           // Our unique payment token (returned unchanged by gateway)
  amountInAgorot: number;  // Amount in smallest currency unit (ILS agorot = cents × 100)
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  successUrl: string;
  errorUrl: string;
  notifyUrl?: string;
  language?: string;       // User's UI language ("ru", "en", "he", "ar")
}

export interface InitiateResult {
  redirectUrl: string;
}

export interface CallbackResult {
  token: string | undefined;
  isSuccess: boolean;
  transactionId: string | undefined;
}

export interface WebhookResult {
  token: string | undefined;
  isSuccess: boolean;
  transactionId: string | undefined;
}

export interface IPaymentProvider {
  readonly name: string;
  initiate(params: InitiateParams): Promise<InitiateResult>;
  parseCallback(query: Record<string, string>): CallbackResult;
  parseWebhook(body: Record<string, string>): WebhookResult;
  approveTransaction?(transactionId: string): Promise<void>;
  /** J5 capture: charge the final amount (≤ reserved). Called when order status → "ready". */
  captureJ5?(orderId: string, amountILS: number): Promise<void>;
  /** J5 void: release the reserved amount without charging. Called when order → "cancelled". */
  voidJ5?(orderId: string, amountILS: number): Promise<void>;
}

// ─── HYP Provider ─────────────────────────────────────────────────────────────

const HYP_BASE = "https://pay.hyp.co.il/p/";

export class HypProvider implements IPaymentProvider {
  readonly name = 'hyp';

  constructor(
    private readonly masof: string,
    private readonly passP: string,
    private readonly key: string,
    private readonly j5Enabled: boolean = false,
    private readonly j5BufferPercent: number = 0,
    private readonly sendEmail: boolean = false,
  ) {}

  async initiate(params: InitiateParams): Promise<InitiateResult> {
    const bufferedAgorot = this.j5Enabled && this.j5BufferPercent > 0
      ? Math.round(params.amountInAgorot * (1 + this.j5BufferPercent / 100))
      : params.amountInAgorot;

    const apiSignParams = new URLSearchParams({
      action: "APISign",
      What: "SIGN",
      Sign: "True",
      KEY: this.key,
      PassP: this.passP,
      Masof: this.masof,
      Amount: String(bufferedAgorot),
      Coin: "1",
      Order: params.token,
      Fild1: params.customerName || "",
      Fild2: params.customerEmail || "",
      Fild3: params.customerPhone || "",
      SuccessUrl: params.successUrl,
      ErrorUrl: params.errorUrl,
      PageLang: (params.language === "he" || params.language === "ar") ? "HEB" : "ENG",
      J5: this.j5Enabled ? "True" : "False",
      sendemail: this.sendEmail ? "True" : "False",
    });

    if (params.notifyUrl) {
      apiSignParams.set("NotifyUrl", params.notifyUrl);
    }

    const apiSignUrl = `${HYP_BASE}?${apiSignParams.toString()}`;
    const response = await fetch(apiSignUrl, { method: "GET" });

    if (!response.ok) {
      throw new Error(`HYP APISign request failed: HTTP ${response.status}`);
    }

    const signedParams = await response.text();
    if (!signedParams || signedParams.toLowerCase().includes("error")) {
      throw new Error(`HYP APISign returned error: ${signedParams}`);
    }

    return { redirectUrl: `${HYP_BASE}?${signedParams}` };
  }

  parseCallback(query: Record<string, string>): CallbackResult {
    const token = query.Order || query.token;
    const isSuccess = query.CCode === "0" || (query.status === "success" && !query.CCode);
    const transactionId = query.Id || query.TransactionId;
    return { token, isSuccess, transactionId };
  }

  parseWebhook(body: Record<string, string>): WebhookResult {
    const token = body.Order || body.token;
    const isSuccess = body.CCode === "0" || body.Status === "000" || body.Status === "0";
    const transactionId = body.Id || body.TransactionId;
    return { token, isSuccess, transactionId };
  }

  async captureJ5(orderId: string, _amountILS: number): Promise<void> {
    console.warn(`[HYP] captureJ5: manual capture required in HYP dashboard for order ${orderId}`);
  }

  async voidJ5(orderId: string, _amountILS: number): Promise<void> {
    console.warn(`[HYP] voidJ5: manual void required in HYP dashboard for order ${orderId}`);
  }
}

// ─── Grow (Meshulam) Provider ─────────────────────────────────────────────────

const GROW_SANDBOX_BASE = "https://sandbox.meshulam.co.il/api/light/server/1.0";
const GROW_PROD_BASE    = "https://secure.meshulam.co.il/api/light/server/1.0";

export class GrowProvider implements IPaymentProvider {
  readonly name = 'grow';

  constructor(
    private readonly userId: string,
    private readonly apiKey: string,
    private readonly pageCode: string,
    private readonly testMode: boolean = false,
    private readonly j5Enabled: boolean = false,
    private readonly j5BufferPercent: number = 0,
    private readonly maxInstallments: number = 1,
    private readonly createInvoice: boolean = false,
  ) {}

  private get base() {
    return this.testMode ? GROW_SANDBOX_BASE : GROW_PROD_BASE;
  }

  async initiate(params: InitiateParams): Promise<InitiateResult> {
    const bufferedAgorot = this.j5Enabled && this.j5BufferPercent > 0
      ? Math.round(params.amountInAgorot * (1 + this.j5BufferPercent / 100))
      : params.amountInAgorot;
    const sum = (bufferedAgorot / 100).toFixed(2);

    // Embed our internal token in callback URLs so we can match responses to orders
    const successUrl = `${params.successUrl}?token=${encodeURIComponent(params.token)}`;
    const cancelUrl  = `${params.errorUrl}?token=${encodeURIComponent(params.token)}`;
    const notifyUrl  = params.notifyUrl
      ? `${params.notifyUrl}?token=${encodeURIComponent(params.token)}`
      : undefined;

    const form = new URLSearchParams();
    form.append('userId',      this.userId);
    form.append('apiKey',      this.apiKey);
    form.append('pageCode',    this.pageCode);
    form.append('sum',         sum);
    form.append('paymentDesc', params.token); // echoed back in webhook body
    form.append('successUrl',  successUrl);
    form.append('cancelUrl',   cancelUrl);
    if (params.customerName)  form.append('fullName',   params.customerName);
    if (params.customerEmail) form.append('payerEmail', params.customerEmail);
    if (params.customerPhone) form.append('payerPhone', params.customerPhone);
    if (notifyUrl)            form.append('notifyUrl',  notifyUrl);
    // J5: deferred transaction — reserves funds without charging
    if (this.j5Enabled)       form.append('J5', 'True');
    // Installments: number of payments (1 = single, 2-12 = installments)
    if (this.maxInstallments > 1) form.append('paymentNum', String(this.maxInstallments));
    // Auto-generate and send invoice to customer
    if (this.createInvoice)   form.append('createInvoice', '1');

    const response = await fetch(`${this.base}/createPaymentProcess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    if (!response.ok) {
      throw new Error(`Grow createPaymentProcess HTTP ${response.status}`);
    }

    const data = await response.json();
    if (String(data.status) !== '1') {
      throw new Error(`Grow error: ${data.err || JSON.stringify(data)}`);
    }

    return { redirectUrl: data.data.url };
  }

  parseCallback(query: Record<string, string>): CallbackResult {
    // token was embedded in successUrl; transactionCode signals success
    const token = query.token;
    const transactionCode = query.transactionCode;
    return { token, isSuccess: !!transactionCode, transactionId: transactionCode };
  }

  parseWebhook(body: Record<string, string>): WebhookResult {
    // token is in body.paymentDesc (we set it during initiate)
    // also returned via notifyUrl query param — handled in handleWebhook as fallback
    const token = body.paymentDesc || undefined;
    const transactionCode = body.transactionCode;
    const isSuccess = !!transactionCode && !!body.paymentSum;
    return { token, isSuccess, transactionId: transactionCode };
  }

  async approveTransaction(transactionId: string): Promise<void> {
    const form = new URLSearchParams();
    form.append('userId',          this.userId);
    form.append('apiKey',          this.apiKey);
    form.append('transactionCode', transactionId);

    const response = await fetch(`${this.base}/approveTransaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    if (!response.ok) {
      console.error(`Grow approveTransaction HTTP ${response.status}`);
      return;
    }

    const data = await response.json().catch(() => ({}));
    if (String(data.status) !== '1') {
      console.error(`Grow approveTransaction error:`, data);
    }
  }

  async captureJ5(orderId: string, _amountILS: number): Promise<void> {
    // Grow J5 capture = approveTransaction (Meshulam charges the reserved amount)
    await this.approveTransaction(orderId);
  }

  async voidJ5(orderId: string, _amountILS: number): Promise<void> {
    // Meshulam void API is not publicly documented — reservation expires automatically after 72h
    console.warn(`[Grow] voidJ5: reservation will expire automatically. Manual cancellation via Meshulam dashboard if needed. order=${orderId}`);
  }
}

// ─── AllPay Provider ───────────────────────────────────────────────────────────
// Docs: https://allpay.to/docs/api-reference.htm
// Auth: SHA256 signature over sorted non-empty values + API key

const ALLPAY_BASE = "https://allpay.to/app/?show=getpayment&mode=api12";

/**
 * Builds the SHA256 signature for AllPay requests.
 * Algorithm: sort non-empty keys A-Z, join values with ':', append apiKey, SHA256.
 */
function buildAllPaySign(data: Record<string, any>, apiKey: string): string {
  const filtered: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (k !== 'sign' && v !== '' && v != null) {
      filtered[k] = v;
    }
  }

  const chunks: string[] = [];
  for (const key of Object.keys(filtered).sort()) {
    const val = filtered[key];
    if (Array.isArray(val)) {
      for (const item of val) {
        for (const k of Object.keys(item as Record<string, any>).sort()) {
          const iv = (item as Record<string, any>)[k];
          if (iv !== '' && iv != null) chunks.push(String(iv));
        }
      }
    } else {
      chunks.push(String(val));
    }
  }
  chunks.push(apiKey);

  return crypto.createHash('sha256').update(chunks.join(':'), 'utf8').digest('hex');
}

export class AllPayProvider implements IPaymentProvider {
  readonly name = 'allpay';

  constructor(
    private readonly login: string,
    private readonly apiKey: string,
    private readonly j5Enabled: boolean = false,
    private readonly j5BufferPercent: number = 0,
    private readonly maxInstallments: number = 1,
    private readonly createInvoice: boolean = false,
  ) {}

  async initiate(params: InitiateParams): Promise<InitiateResult> {
    const bufferedAgorot = this.j5Enabled && this.j5BufferPercent > 0
      ? Math.round(params.amountInAgorot * (1 + this.j5BufferPercent / 100))
      : params.amountInAgorot;
    const amountILS = (bufferedAgorot / 100).toFixed(2);

    // Map our language codes to AllPay lang codes
    const langMap: Record<string, string> = { he: 'HE', ar: 'AR', ru: 'RU', en: 'EN' };
    const lang = langMap[params.language || ''] || 'AUTO';

    const body: Record<string, any> = {
      login:      this.login,
      order_id:   params.token,             // unique per payment
      items:      [{ name: 'Order', qty: '1', price: amountILS, vat: '1' }],
      currency:   'ILS',
      lang,
      success_url:  params.successUrl,
      backlink_url: params.errorUrl,
      add_field_1:  params.token,           // echoed back in webhook unchanged
    };

    if (params.notifyUrl)       body.webhook_url    = params.notifyUrl;
    if (params.customerName)    body.client_name    = params.customerName;
    if (params.customerEmail)   body.client_email   = params.customerEmail;
    if (params.customerPhone)   body.client_phone   = params.customerPhone;

    // J5 pre-authorization (reserve without charging)
    if (this.j5Enabled)         body.preauthorize   = true;

    // Installments (1 = single payment)
    if (this.maxInstallments > 1) body.inst = this.maxInstallments;

    // Auto-invoice (doc_type 400 = Receipt)
    if (this.createInvoice)     body.doc_type = 400;

    body.sign = buildAllPaySign(body, this.apiKey);

    const response = await fetch(ALLPAY_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`AllPay HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.error_code) {
      throw new Error(`AllPay error ${data.error_code}: ${data.error_msg}`);
    }
    if (!data.payment_url) {
      throw new Error(`AllPay: no payment_url in response: ${JSON.stringify(data)}`);
    }

    return { redirectUrl: data.payment_url };
  }

  parseCallback(query: Record<string, string>): CallbackResult {
    // AllPay redirects to success_url — no status params in redirect, just order_id
    // The real confirmation comes from the webhook
    const token = query.order_id || query.add_field_1;
    // Treat redirect to success_url as tentative success; webhook is authoritative
    return { token, isSuccess: true, transactionId: query.order_id };
  }

  parseWebhook(body: Record<string, string>): WebhookResult {
    // Our token is in add_field_1 (set during initiate)
    const token = body.add_field_1 || body.order_id;
    const isSuccess = String(body.status) === '1';
    const transactionId = body.order_id;
    return { token, isSuccess, transactionId };
  }

  async captureJ5(orderId: string, amountILS: number): Promise<void> {
    const amount = amountILS.toFixed(2);
    const body: Record<string, any> = {
      login:    this.login,
      order_id: orderId,
      amount,
    };
    body.sign = buildAllPaySign(body, this.apiKey);

    const response = await fetch('https://allpay.to/app/?show=runauthorizedpayment&mode=api12', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`AllPay captureJ5 HTTP ${response.status}`);
    }

    const data = await response.json();
    if (String(data.status) !== '1') {
      const msg = data.error_msg || data.err || JSON.stringify(data);
      throw new Error(`AllPay captureJ5 failed: ${msg}`);
    }
  }

  async voidJ5(orderId: string, amountILS: number): Promise<void> {
    // Refund without "items" field = void J5 reservation (releases frozen funds)
    const amount = amountILS.toFixed(2);
    const body: Record<string, any> = {
      login:    this.login,
      order_id: orderId,
      amount,
    };
    body.sign = buildAllPaySign(body, this.apiKey);

    const response = await fetch('https://allpay.to/app/?show=refund&mode=api12', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`AllPay voidJ5 HTTP ${response.status}`);
    }

    const data = await response.json();
    // status 3 = fully refunded, status 4 = partially refunded
    if (String(data.status) !== '3' && String(data.status) !== '4') {
      console.warn(`[AllPay] voidJ5 unexpected response for order ${orderId}:`, data);
    }
  }
}

// ─── PayMe (payme.io) Provider ────────────────────────────────────────────────
// Docs: https://payme.stoplight.io/docs/payments/86407fa137745-hosted-payment-page
// Auth: seller_payme_id (MPL key)

const PAYME_SANDBOX_BASE = "https://sandbox.payme.io/api";
const PAYME_PROD_BASE    = "https://live.payme.io/api";

export class PaymeProvider implements IPaymentProvider {
  readonly name = 'payme';

  constructor(
    private readonly sellerPaymeId: string,
    private readonly testMode: boolean = true,
    private readonly j5Enabled: boolean = false,
    private readonly j5BufferPercent: number = 0,
  ) {}

  private get base() {
    return this.testMode ? PAYME_SANDBOX_BASE : PAYME_PROD_BASE;
  }

  async initiate(params: InitiateParams): Promise<InitiateResult> {
    const bufferedAgorot = this.j5Enabled && this.j5BufferPercent > 0
      ? Math.round(params.amountInAgorot * (1 + this.j5BufferPercent / 100))
      : params.amountInAgorot;

    // Embed token in return URL so callback can identify the payment even without Payme echo
    const returnUrl = `${params.successUrl}?transaction_id=${encodeURIComponent(params.token)}`;

    const body: Record<string, any> = {
      seller_payme_id:     this.sellerPaymeId,
      sale_price:          bufferedAgorot,
      currency:            'ILS',
      product_name:        'Order',
      transaction_id:      params.token,
      installments:        '1',
      sale_type:           this.j5Enabled ? 'authorize' : 'sale',
      sale_return_url:     returnUrl,
      sale_payment_method: 'multi',
      language:            (params.language === 'he' || params.language === 'ar') ? 'he' : 'en',
    };

    if (params.notifyUrl)     body.sale_callback_url = params.notifyUrl;
    if (params.customerName)  body.sale_name         = params.customerName;
    if (params.customerEmail) body.sale_email        = params.customerEmail;
    if (params.customerPhone) body.sale_mobile       = params.customerPhone;

    const response = await fetch(`${this.base}/generate-sale`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Payme HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.sale_url) {
      return { redirectUrl: data.sale_url };
    }
    const errMsg = data.status_error_details || data.status_error_code || JSON.stringify(data);
    throw new Error(`Payme error: ${errMsg}`);
  }

  parseCallback(query: Record<string, string>): CallbackResult {
    // Payme redirects to sale_return_url (we embedded token there as transaction_id)
    const token = query.transaction_id;
    const paymeSaleId = query.payme_sale_id;
    // Treat browser redirect as tentative success; webhook is authoritative
    return { token, isSuccess: true, transactionId: paymeSaleId || token };
  }

  parseWebhook(body: Record<string, string>): WebhookResult {
    const token = body.transaction_id;           // our token
    const paymeSaleId = body.payme_sale_id;      // Payme's ID (used for capture/void)
    const notifyType = body.notify_type;
    // 'sale-complete' = J4 success; 'sale-authorized' = J5 authorization success
    const isSuccess = (notifyType === 'sale-complete' || notifyType === 'sale-authorized')
      && String(body.status_code) === '0';
    return { token, isSuccess, transactionId: paymeSaleId };
  }

  async captureJ5(paymeSaleId: string, amountILS: number): Promise<void> {
    const body = {
      seller_payme_id: this.sellerPaymeId,
      payme_sale_id:   paymeSaleId,
      sale_price:      Math.round(amountILS * 100),
      currency:        'ILS',
      installments:    1,
    };

    const response = await fetch(`${this.base}/capture-sale`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Payme captureJ5 HTTP ${response.status}`);
    }

    const data = await response.json();
    if (String(data.status_code) !== '0') {
      const errMsg = data.status_error_details || data.status_error_code || JSON.stringify(data);
      throw new Error(`Payme captureJ5 failed: ${errMsg}`);
    }
  }

  async voidJ5(paymeSaleId: string, _amountILS: number): Promise<void> {
    const body = {
      seller_payme_id: this.sellerPaymeId,
      payme_sale_id:   paymeSaleId,
    };

    const response = await fetch(`${this.base}/refund-sale`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Payme voidJ5 HTTP ${response.status}`);
    }

    const data = await response.json();
    if (String(data.status_code) !== '0') {
      console.warn(`[Payme] voidJ5 unexpected response for ${paymeSaleId}:`, data);
    }
  }
}

// ─── Provider Factory ──────────────────────────────────────────────────────────

/**
 * Resolves the active payment provider from paymentProviderConfig.
 */
export function getProvider(settings: {
  paymentProviderConfig?: any;
}): IPaymentProvider | null {
  const config = settings.paymentProviderConfig as PaymentProviderConfig | null | undefined;

  if (config && config.active && config.active !== 'none') {
    if (config.active === 'hyp' && config.hyp?.masof && config.hyp?.passP && config.hyp?.key) {
      return new HypProvider(
        config.hyp.masof,
        config.hyp.passP,
        config.hyp.key,
        config.hyp.j5Enabled ?? false,
        config.hyp.j5BufferPercent ?? 0,
        config.hyp.sendEmail ?? false,
      );
    }
    if (config.active === 'grow' && config.grow?.userId && config.grow?.apiKey && config.grow?.pageCode) {
      return new GrowProvider(
        config.grow.userId,
        config.grow.apiKey,
        config.grow.pageCode,
        config.grow.testMode ?? false,
        config.grow.j5Enabled ?? false,
        config.grow.j5BufferPercent ?? 0,
        config.grow.maxInstallments ?? 1,
        config.grow.createInvoice ?? false,
      );
    }
    if (config.active === 'allpay' && config.allpay?.login && config.allpay?.apiKey) {
      return new AllPayProvider(
        config.allpay.login,
        config.allpay.apiKey,
        config.allpay.j5Enabled ?? false,
        config.allpay.j5BufferPercent ?? 0,
        config.allpay.maxInstallments ?? 1,
        config.allpay.createInvoice ?? false,
      );
    }
    if (config.active === 'payme' && config.payme?.sellerPaymeId) {
      return new PaymeProvider(
        config.payme.sellerPaymeId,
        config.payme.testMode ?? true,
        config.payme.j5Enabled ?? false,
        config.payme.j5BufferPercent ?? 0,
      );
    }
  }

  return null;
}

/**
 * Returns the active provider name from paymentProviderConfig.
 */
export function getActiveProviderName(settings: {
  paymentProviderConfig?: any;
}): string {
  const config = settings.paymentProviderConfig as PaymentProviderConfig | null | undefined;
  return config?.active || 'none';
}

/**
 * Builds a PaymentProviderConfig object from admin form data.
 * The form uses convenience field names (providerName, masof, passP, key, testMode).
 */
export function buildProviderConfig(data: {
  providerName?: string;
  masof?: string | null;
  passP?: string | null;
  key?: string | null;
  testMode?: boolean;
}): PaymentProviderConfig {
  const active = (data.providerName || 'none') as PaymentProviderConfig['active'];
  const result: PaymentProviderConfig = { active };

  if (active === 'hyp') {
    result.hyp = {
      masof: data.masof || '',
      passP: data.passP || '',
      key: data.key || '',
      testMode: data.testMode !== false,
    };
  }

  return result;
}
