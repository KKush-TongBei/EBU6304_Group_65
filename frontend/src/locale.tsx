import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getStoredLocale, LOCALE_STORAGE_KEY, translate, type Locale } from "./locales";
import { translateApiMessage } from "./translateApiMessage";

const LocaleCtx = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  te: (message: string) => string;
} | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getStoredLocale());

  useEffect(() => {
    document.documentElement.lang = locale === "en" ? "en" : "zh-CN";
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);
  const toggleLocale = useCallback(
    () => setLocaleState((l) => (l === "zh" ? "en" : "zh")),
    []
  );

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale]
  );

  const te = useCallback(
    (message: string) => translateApiMessage(message, locale),
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, toggleLocale, t, te }),
    [locale, setLocale, toggleLocale, t, te]
  );

  return <LocaleCtx.Provider value={value}>{children}</LocaleCtx.Provider>;
}

export function useLocale() {
  const v = useContext(LocaleCtx);
  if (!v) throw new Error("useLocale outside LocaleProvider");
  return v;
}
