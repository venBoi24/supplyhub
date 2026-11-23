export const MAX_UNIT_STOCK = 100_000;

export type StockAdjustment = { mode: "add"; quantity: number } | { mode: "set"; quantity: number };

/**
 * `applyStockAdjustment` is a pure domain helper that also runs outside a request
 * (tests, scheduled stock jobs), so it cannot read a locale cookie. It returns a
 * stable English `error` for non-request callers plus a dictionary-relative
 * `errorKey` under `studio.errors.stock.*`, which the server actions translate
 * at the request boundary.
 */
export const STOCK_ERROR_KEYS = {
  range: "range",
  wholeUnits: "wholeUnits",
  max: "max",
  addAtLeastOne: "addAtLeastOne",
  unchanged: "unchanged",
} as const;

export type StockErrorKey = (typeof STOCK_ERROR_KEYS)[keyof typeof STOCK_ERROR_KEYS];

export type StockAdjustmentResult =
  | { ok: true; previousStock: number; nextStock: number; delta: number }
  | { ok: false; error: string; errorKey: StockErrorKey };

export function applyStockAdjustment(
  currentStock: number,
  adjustment: StockAdjustment,
): StockAdjustmentResult {
  if (!Number.isInteger(currentStock) || currentStock < 0 || currentStock > MAX_UNIT_STOCK) {
    return {
      ok: false,
      errorKey: STOCK_ERROR_KEYS.range,
      error: "The current stock level is outside the supported range.",
    };
  }

  if (!Number.isInteger(adjustment.quantity) || adjustment.quantity < 0) {
    return {
      ok: false,
      errorKey: STOCK_ERROR_KEYS.wholeUnits,
      error: "Enter a whole number of units.",
    };
  }

  const nextStock =
    adjustment.mode === "add" ? currentStock + adjustment.quantity : adjustment.quantity;

  if (nextStock > MAX_UNIT_STOCK) {
    return {
      ok: false,
      errorKey: STOCK_ERROR_KEYS.max,
      error: `Stock cannot exceed ${MAX_UNIT_STOCK.toLocaleString()} units.`,
    };
  }

  if (adjustment.mode === "add" && adjustment.quantity === 0) {
    return { ok: false, errorKey: STOCK_ERROR_KEYS.addAtLeastOne, error: "Add at least one unit." };
  }

  const delta = nextStock - currentStock;

  if (delta === 0) {
    return {
      ok: false,
      errorKey: STOCK_ERROR_KEYS.unchanged,
      error: "The stock level is already what you entered.",
    };
  }

  return { ok: true, previousStock: currentStock, nextStock, delta };
}
