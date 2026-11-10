/**
 * Central internationalization configuration for the whole platform.
 *
 * The locale is persisted in a first-party cookie (readable by Server Components
 * for SSR-correct chrome) and mirrored to localStorage for client convenience.
 * No URL/locale routing is used, so every existing typed route, canonical URL and
 * link keeps working unchanged.
 */
export const LOCALES = ["en", "sw", "ar", "zh", "fr"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "supplyhub_locale";

export interface LocaleMeta {
  code: Locale;
  /** Native endonym shown in the switcher (never translated). */
  name: string;
  /** English name for aria/screen-reader clarity. */
  english: string;
  flag: string;
  dir: "ltr" | "rtl";
  /** BCP-47 tag used by Intl formatters. */
  intl: string;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { code: "en", name: "English", english: "English", flag: "🇬🇧", dir: "ltr", intl: "en" },
  sw: { code: "sw", name: "Kiswahili", english: "Swahili", flag: "🇹🇿", dir: "ltr", intl: "sw" },
  ar: { code: "ar", name: "العربية", english: "Arabic", flag: "🇸🇦", dir: "rtl", intl: "ar" },
  zh: { code: "zh", name: "中文", english: "Chinese", flag: "🇨🇳", dir: "ltr", intl: "zh" },
  fr: { code: "fr", name: "Français", english: "French", flag: "🇫🇷", dir: "ltr", intl: "fr" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function localeDir(locale: Locale): "ltr" | "rtl" {
  return LOCALE_META[locale].dir;
}

/** Map a browser navigator.language / Accept-Language tag onto a supported locale. */
export function matchLocale(tag: string | null | undefined): Locale | null {
  if (!tag) return null;
  const lower = tag.toLowerCase();
  const exact = LOCALES.find((l) => l === lower);
  if (exact) return exact;
  const base = lower.split("-")[0]!;
  const partial = LOCALES.find((l) => l === base);
  return partial ?? null;
}
