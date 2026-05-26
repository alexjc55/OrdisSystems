import { storage } from "../storage";

export async function getDefaultLang(): Promise<string> {
  try {
    const settings = await storage.getStoreSettings();
    return settings?.defaultLanguage || "ru";
  } catch {
    return "ru";
  }
}

export function getNameFieldForLang(lang: string): string {
  return lang === "ru" ? "name" : `name_${lang}`;
}

export function getBranchNameFieldForLang(lang: string): string {
  if (lang === "ru") return "name";
  const map: Record<string, string> = { en: "nameEn", he: "nameHe", ar: "nameAr" };
  return map[lang] || "name";
}

export function checkRequiredName(
  data: Record<string, any>,
  defaultLang: string,
  useCamelCase = false
): string | null {
  const field = useCamelCase
    ? getBranchNameFieldForLang(defaultLang)
    : getNameFieldForLang(defaultLang);
  const value = data[field];
  if (!value || String(value).trim() === "") {
    return field;
  }
  return null;
}

export function sendNameRequiredError(res: any, field: string, lang: string) {
  res.status(400).json({
    message: `Name in the default language is required`,
    field,
    lang,
  });
}
