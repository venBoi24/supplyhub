export const MAX_UNIT_STOCK = 100_000;

export type StockAdjustment = { mode: "add"; quantity: number } | { mode: "set"; quantity: number };

export type StockAdjustmentResult =
  | { ok: true; previousStock: number; nextStock: number; delta: number }
  | { ok: false; error: string };

export function applyStockAdjustment(
  currentStock: number,
  adjustment: StockAdjustment,
): StockAdjustmentResult {
  if (!Number.isInteger(currentStock) || currentStock < 0 || currentStock > MAX_UNIT_STOCK) {
    return { ok: false, error: "The current stock level is outside the supported range." };
  }

  if (!Number.isInteger(adjustment.quantity) || adjustment.quantity < 0) {
    return { ok: false, error: "Enter a whole number of units." };
  }

  const nextStock =
    adjustment.mode === "add" ? currentStock + adjustment.quantity : adjustment.quantity;

  if (nextStock > MAX_UNIT_STOCK) {
    return { ok: false, error: `Stock cannot exceed ${MAX_UNIT_STOCK.toLocaleString()} units.` };
  }

  if (adjustment.mode === "add" && adjustment.quantity === 0) {
    return { ok: false, error: "Add at least one unit." };
  }

  const delta = nextStock - currentStock;

  if (delta === 0) {
    return { ok: false, error: "The stock level is already what you entered." };
  }

  return { ok: true, previousStock: currentStock, nextStock, delta };
}
