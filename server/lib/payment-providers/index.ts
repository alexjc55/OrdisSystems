// ─── Payment Provider Abstraction ─────────────────────────────────────────────
// Defines a common interface for online payment gateways.
// Adding a new provider requires only a new class implementing IPaymentProvider.

import crypto from 'crypto';

export interface PaymentProviderConfig {
  active: 'none' | 'hyp' | 'grow' | 'allpay';
  hyp?: {
    masof: string;
    passP: string;
    key: string;
    testMode?: boolean;
    j5Enabled?: boolean;   // Deferred transaction: reserves funds without charging
    sendEmail?: boolean;   // Auto-send payment receipt to customer email
  };
  grow?: {
    userId: string;
    apiKey: string;
    pageCode: string;
    testMode?: boolean;
    j5Enabled?: boolean;       // Deferred transaction: reserves funds without charging
    maxInstallments?: number;  // 1 = single payment, 2–12 = installments
    createInvoice?: boolean;   // Auto-send invoice to customer after payment
  };
  allpay?: {
    login: string;             // API login from AllPay Settings → Integrations
    apiKey: string;            // Private API key used to sign requests
    j5Enabled?: boolean;       // Pre-authorization: reserves funds without charging (7 days)
    maxInstallments?: number;  // 1 = single payment, 2–12 = installments
    createInvoice?: boolean;   // Auto-issue receipt/invoice after payment (doc_type 400)
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
    private readonly sendEmail: boolean = false,
  ) {}

  async initiate(params: InitiateParams): Promise<InitiateResult> {
    const apiSignParams = new URLSearchParams({
      action: "APISign",
      What: "SIGN",
      Sign: "True",
      KEY: this.key,
      PassP: this.passP,
      Masof: this.masof,
      Amount: String(params.amountInAgorot),
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
    private readonly maxInstallments: number = 1,
    private readonly createInvoice: boolean = false,
  ) {}

  private get base() {
    return this.testMode ? GROW_SANDBOX_BASE : GROW_PROD_BASE;
  }

  async initiate(params: InitiateParams): Promise<InitiateResult> {
    const sum = (params.amountInAgorot / 100).toFixed(2);

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
    private readonly maxInstallments: number = 1,
    private readonly createInvoice: boolean = false,
  ) {}

  async initiate(params: InitiateParams): Promise<InitiateResult> {
    const amountILS = (params.amountInAgorot / 100).toFixed(2);

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
        config.grow.maxInstallments ?? 1,
        config.grow.createInvoice ?? false,
      );
    }
    if (config.active === 'allpay' && config.allpay?.login && config.allpay?.apiKey) {
      return new AllPayProvider(
        config.allpay.login,
        config.allpay.apiKey,
        config.allpay.j5Enabled ?? false,
        config.allpay.maxInstallments ?? 1,
        config.allpay.createInvoice ?? false,
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
