import "server-only";

import { cookies } from "next/headers";

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, localeDir, type Locale } from "./config";
import { loadDictionary, translatorFor, type Translator } from "./dictionary";
import {
  formatCurrency as fmtCurrency,
  formatDate as fmtDate,
  formatNumber as fmtNumber,
  formatTime as fmtTime,
} from "./formatters";

/**
 * Read the persisted locale from the first-party cookie. This is a request-time
 * API: call it from Server Components rendered inside a <Suspense> boundary (the
 * shared chrome already is) so Cache Components can still prerender the shell.
 */
export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export interface ServerI18n {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: Translator;
  formatDate: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (cents: number, currency?: string) => string;
}

export async function getServerI18n(): Promise<ServerI18n> {
  const locale = await getServerLocale();
  const dict = await loadDictionary(locale);
  const t = translatorFor(locale, dict);
  return {
    locale,
    dir: localeDir(locale),
    t,
    formatDate: (value, options) => fmtDate(value, locale, options),
    formatTime: (value, options) => fmtTime(value, locale, options),
    formatNumber: (value, options) => fmtNumber(value, locale, options),
    formatCurrency: (cents, currency = "TZS") => fmtCurrency(cents, currency, locale),
  };
}
