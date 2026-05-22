import { en } from "./en";
import { zh, type Messages } from "./zh";

export type Locale = "zh" | "en";

export const LOCALE_STORAGE_KEY = "ta_recruit_locale";

const catalogs: Record<Locale, Messages> = { zh, en };

export function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "zh";
  const s = localStorage.getItem(LOCALE_STORAGE_KEY);
  return s === "en" ? "en" : "zh";
}

function getByPath(obj: Record<string, unknown>, path: string): string | undefined {
  let cur: unknown = obj;
  for (const part of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  const raw = getByPath(catalogs[locale] as unknown as Record<string, unknown>, key)
    ?? getByPath(catalogs.zh as unknown as Record<string, unknown>, key)
    ?? key;
  if (!params) return raw;
  return Object.entries(params).reduce(
    (s, [k, v]) => s.replaceAll(`{{${k}}}`, String(v)),
    raw
  );
}

export type MessageKey = string;
