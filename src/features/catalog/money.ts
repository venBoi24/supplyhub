export const MAX_PRICE_CENTS = 99_999_999;

/**
 * Parses a user-entered major-unit amount ("68", "68.5", "68.50") into integer cents without
 * floating-point arithmetic.
 */
export function parseMoneyToCents(value: string): number | null {
  const trimmed = value.trim();

  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }

  const [whole = "0", fraction = ""] = trimmed.split(".");
  const cents = Number(whole) * 100 + Number(`${fraction}00`.slice(0, 2));

  return Number.isSafeInteger(cents) && cents <= MAX_PRICE_CENTS ? cents : null;
}

export function centsToDecimalString(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error("Money must be expressed as a non-negative integer number of cents.");
  }

  const whole = Math.floor(cents / 100);
  const fraction = cents % 100;

  return `${whole}.${String(fraction).padStart(2, "0")}`;
}

export function decimalToCents(value: { toString(): string }): number {
  const [whole = "0", fraction = ""] = value.toString().split(".");
  const sign = whole.startsWith("-") ? -1 : 1;
  const digits = whole.replace("-", "");

  return sign * (Number(digits) * 100 + Number(`${fraction}00`.slice(0, 2)));
}

export function formatMoney(
  amountCents: number,
  currency: string = "USD",
  locale: string = "en-US",
): string {
  const hasFraction = amountCents % 100 !== 0;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}
