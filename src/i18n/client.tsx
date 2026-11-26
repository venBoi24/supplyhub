"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_META,
  localeDir,
  matchLocale,
  type Locale,
  type LocaleMeta,
} from "./config";
import {
  fallbackDictionary,
  loadDictionary,
  translatorFor,
  type Messages,
  type Translator,
} from "./dictionary";
import {
  formatCurrency as fmtCurrency,
  formatDate as fmtDate,
  formatNumber as fmtNumber,
  formatTime as fmtTime,
} from "./formatters";

const STORAGE_KEY = "supplyhub_locale";

export interface I18nContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  locales: LocaleMeta[];
  t: Translator;
  setLocale: (locale: Locale) => void;
  formatDate: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (cents: number, currency?: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readCookieLocale(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`));
  const value = match?.[1];
  return isLocale(value) ? value : null;
}

function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

function persistLocale(locale: Locale) {
  if (typeof document !== "undefined") {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* storage unavailable (private mode) — cookie still carries the preference */
  }
}

function applyDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.documentElement.dir = localeDir(locale);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  // Start at the default so server HTML and the first client render match; the
  // persisted preference is applied right after mount (no hydration mismatch).
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [dict, setDict] = useState<Messages>(fallbackDictionary);

  const loadAndSet = useCallback((next: Locale) => {
    setLocaleState(next);
    applyDocumentLocale(next);
    void loadDictionary(next).then(setDict);
  }, []);

  const setLocale = useCallback(
    (next: Locale) => {
      if (!isLocale(next)) return;
      persistLocale(next);
      loadAndSet(next);
      // Re-render Server Components (chrome, headings) with the new cookie so the
      // whole interface switches without a manual page refresh.
      router.refresh();
    },
    [loadAndSet, router],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = readCookieLocale() ?? readStoredLocale();
      if (stored) {
        loadAndSet(stored);
        return;
      }
      // First visit: honour the browser language when we support it.
      const detected = matchLocale(typeof navigator !== "undefined" ? navigator.language : null);
      if (detected && detected !== DEFAULT_LOCALE) {
        persistLocale(detected);
        loadAndSet(detected);
        router.refresh();
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAndSet, router]);

  // Keep multiple open tabs in sync with the persisted preference.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      if (isLocale(event.newValue)) loadAndSet(event.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [loadAndSet]);

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    const t = translatorFor(locale, dict);
    return {
      locale,
      dir: localeDir(locale),
      locales: Object.values(LOCALE_META),
      t,
      setLocale,
      formatDate: (v, o) => fmtDate(v, locale, o),
      formatTime: (v, o) => fmtTime(v, locale, o),
      formatNumber: (v, o) => fmtNumber(v, locale, o),
      formatCurrency: (cents, currency = "TZS") => fmtCurrency(cents, currency, locale),
    };
  }, [locale, dict, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}

export function useT(): Translator {
  return useI18n().t;
}
