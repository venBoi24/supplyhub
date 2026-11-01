const SUPPORTED_CURRENCIES = new Set(["TZS"]);

export class LynxPayAmountError extends Error {
  constructor(
    readonly code: "UNSUPPORTED_CURRENCY" | "INVALID_AMOUNT",
    message: string,
  ) {
    super(message);
    this.name = "LynxPayAmountError";
  }
}

export function toProviderWholeUnits(amountMinor: number, currency: string): number {
  if (!SUPPORTED_CURRENCIES.has(currency)) {
    throw new LynxPayAmountError(
      "UNSUPPORTED_CURRENCY",
      `LynxPay does not settle ${currency} yet.`,
    );
  }

  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0 || amountMinor % 100 !== 0) {
    throw new LynxPayAmountError("INVALID_AMOUNT", "LynxPay amounts must be whole currency units.");
  }

  return amountMinor / 100;
}

export function fromProviderWholeUnits(amount: number): number {
  return amount * 100;
}
