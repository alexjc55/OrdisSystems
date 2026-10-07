import type { StoreSettings } from "@shared/schema";

// Never construct credential links from Host, Origin or forwarded headers.
// These are operator-controlled settings already used by the store deployment.
export function passwordResetOrigin(env: NodeJS.ProcessEnv = process.env): string {
  if (/[\r\n]/.test(env.REPLIT_APP_URL || "")) {
    throw new Error("Invalid trusted store origin");
  }
  const configured = env.REPLIT_APP_URL?.trim();
  const candidates = configured
    ? [configured]
    : (env.ALLOWED_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean);
  if (!configured && env.NODE_ENV === "development" && env.REPLIT_DEV_DOMAIN) {
    candidates.push(`https://${env.REPLIT_DEV_DOMAIN}`);
  }
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" && !url.username && !url.password &&
          url.pathname === "/" && !url.search && !url.hash &&
          !/[\r\n]/.test(candidate)) {
        return url.origin;
      }
    } catch {
      // Reject malformed origins without printing their values.
    }
  }
  throw new Error("A trusted HTTPS store origin is required for password recovery");
}

const translations = {
  ru: {
    subject: "Восстановление пароля",
    body: "Чтобы задать новый пароль, перейдите по ссылке:",
    action: "Изменить пароль",
    expiry: "Ссылка действует 24 часа и может быть использована только один раз.",
    ignore: "Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.",
  },
  en: {
    subject: "Password recovery",
    body: "To set a new password, follow this link:",
    action: "Reset password",
    expiry: "This link is valid for 24 hours and can only be used once.",
    ignore: "If you did not request a password reset, ignore this email.",
  },
  he: {
    subject: "שחזור סיסמה",
    body: "כדי להגדיר סיסמה חדשה, פתחו את הקישור:",
    action: "איפוס סיסמה",
    expiry: "הקישור תקף ל-24 שעות וניתן להשתמש בו פעם אחת בלבד.",
    ignore: "אם לא ביקשתם לאפס את הסיסמה, התעלמו מהודעה זו.",
  },
  ar: {
    subject: "استعادة كلمة المرور",
    body: "لتعيين كلمة مرور جديدة، افتح هذا الرابط:",
    action: "إعادة تعيين كلمة المرور",
    expiry: "هذا الرابط صالح لمدة 24 ساعة ويمكن استخدامه مرة واحدة فقط.",
    ignore: "إذا لم تطلب إعادة تعيين كلمة المرور، فتجاهل هذه الرسالة.",
  },
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character]!));
}

export function passwordResetEmail(
  settings: StoreSettings, email: string, token: string, origin: string,
) {
  const language = settings.defaultLanguage && settings.defaultLanguage in translations
    ? settings.defaultLanguage as keyof typeof translations : "ru";
  const t = translations[language];
  const url = new URL("/reset-password", origin);
  url.searchParams.set("token", token);
  url.searchParams.set("lang", language);
  const storeName = settings.storeName || "";
  const dir = language === "he" || language === "ar" ? "rtl" : "ltr";
  return {
    to: email,
    // Use the store's configured sender, never a different shop's fallback.
    from: settings.orderNotificationFromEmail!.trim(),
    fromName: settings.orderNotificationFromName || storeName,
    subject: t.subject,
    text: `${storeName}\n\n${t.body}\n${url.href}\n\n${t.expiry}\n${t.ignore}`,
    html: `<html lang="${language}" dir="${dir}"><body>
      <h1>${escapeHtml(t.subject)}</h1><p>${escapeHtml(storeName)}</p>
      <p>${escapeHtml(t.body)}</p>
      <p><a href="${escapeHtml(url.href)}">${escapeHtml(t.action)}</a></p>
      <p>${escapeHtml(t.expiry)}</p><p>${escapeHtml(t.ignore)}</p>
      </body></html>`,
    sensitive: true,
  };
}
