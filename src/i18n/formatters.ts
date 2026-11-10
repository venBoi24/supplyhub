import { LOCALE_META, type Locale } from "./config";

function tag(locale: Locale): string {
  return LOCALE_META[locale].intl;
}

export function formatDate(
  value: Date | number | string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(tag(locale), options).format(date);
}

export function formatTime(
  value: Date | number | string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" },
): string {
  return formatDate(value, locale, options);
}

export function formatNumber(
  value: number,
  locale: Locale,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(tag(locale), options).format(value);
}

/** Money is stored as integer cents; render it locale-aware without float drift. */
export function formatCurrency(cents: number, currency: string, locale: Locale): string {
  const whole = Math.trunc(cents / 100);
  const fraction = Math.abs(cents % 100);
  const needsFraction = fraction !== 0;
  return new Intl.NumberFormat(tag(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: needsFraction ? 2 : 0,
    maximumFractionDigits: needsFraction ? 2 : 0,
  }).format(needsFraction ? cents / 100 : whole);
}
