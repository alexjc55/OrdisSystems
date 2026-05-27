export const LANG_CODES = ['ru', 'en', 'he', 'ar'] as const;
export type LangCode = typeof LANG_CODES[number];

export function getLangFromPath(path: string): LangCode | null {
  const match = path.match(/^\/(ru|en|he|ar)(\/|$)/);
  return match ? (match[1] as LangCode) : null;
}

export function getLangPrefix(path: string): string {
  const lang = getLangFromPath(path);
  return lang ? `/${lang}` : '';
}

export function stripLangPrefix(path: string): string {
  const match = path.match(/^\/(ru|en|he|ar)(\/.*)?$/);
  return match ? (match[2] || '/') : path;
}

export function buildLangUrl(innerPath: string, lang: string, defaultLang: string): string {
  const isDefault = !lang || lang === defaultLang;
  if (isDefault) return innerPath || '/';
  if (innerPath === '/') return `/${lang}`;
  return `/${lang}${innerPath}`;
}
