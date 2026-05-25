// ─── Payment Provider Abstraction ─────────────────────────────────────────────
// Defines a common interface for online payment gateways.
// Adding a new provider requires only a new class implementing IPaymentProvider.

export interface PaymentProviderConfig {
  active: 'none' | 'hyp' | 'payme';
  hyp?: {
    masof: string;
    passP: string;
    key: string;
    testMode?: boolean;
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
}

// ─── HYP Provider ─────────────────────────────────────────────────────────────

const HYP_BASE = "https://pay.hyp.co.il/p/";

export class HypProvider implements IPaymentProvider {
  readonly name = 'hyp';

  constructor(
    private readonly masof: string,
    private readonly passP: string,
    private readonly key: string,
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
      J5: "False",
      sendemail: "False",
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

// ─── Provider Factory ──────────────────────────────────────────────────────────

/**
 * Resolves the active payment provider from settings.
 * Reads paymentProviderConfig first; falls back to legacy flat fields.
 */
export function getProvider(settings: {
  paymentProviderConfig?: any;
  paymentProvider?: string | null;
  hypMasof?: string | null;
  hypPassP?: string | null;
  hypKey?: string | null;
}): IPaymentProvider | null {
  const config = settings.paymentProviderConfig as PaymentProviderConfig | null | undefined;

  // New config takes priority
  if (config && config.active && config.active !== 'none') {
    if (config.active === 'hyp' && config.hyp?.masof && config.hyp?.passP && config.hyp?.key) {
      return new HypProvider(config.hyp.masof, config.hyp.passP, config.hyp.key);
    }
    // Future providers: add cases here
  }

  // Legacy flat fields fallback
  if (settings.paymentProvider === 'hyp' && settings.hypMasof && settings.hypPassP && settings.hypKey) {
    return new HypProvider(settings.hypMasof, settings.hypPassP, settings.hypKey);
  }

  return null;
}

/**
 * Extracts the active provider name from settings (new config or legacy field).
 */
export function getActiveProviderName(settings: {
  paymentProviderConfig?: any;
  paymentProvider?: string | null;
}): string {
  const config = settings.paymentProviderConfig as PaymentProviderConfig | null | undefined;
  if (config?.active && config.active !== 'none') return config.active;
  return settings.paymentProvider || 'none';
}

/**
 * Builds a PaymentProviderConfig object from admin form data.
 * Used when saving settings to merge into paymentProviderConfig jsonb.
 */
export function buildProviderConfig(data: {
  paymentProvider?: string;
  hypMasof?: string | null;
  hypPassP?: string | null;
  hypKey?: string | null;
  hypTestMode?: boolean;
}): PaymentProviderConfig {
  const active = (data.paymentProvider || 'none') as PaymentProviderConfig['active'];
  const result: PaymentProviderConfig = { active };

  if (active === 'hyp') {
    result.hyp = {
      masof: data.hypMasof || '',
      passP: data.hypPassP || '',
      key: data.hypKey || '',
      testMode: data.hypTestMode !== false,
    };
  }

  return result;
}
