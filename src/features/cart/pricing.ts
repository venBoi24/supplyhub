import { DEFAULT_CURRENCY } from "@/features/catalog/constants";

import { MAX_CART_QUANTITY } from "./constants";
import type { CartLine, CartLineDraft, CartView } from "./types";

/**
 * Authoritative cart summary. Prices and stock come from the database rows in each draft;
 * nothing supplied by the browser is trusted. Lines with a problem stay visible but are
 * excluded from the subtotal and block checkout.
 */
export function summarizeCart(drafts: readonly CartLineDraft[]): CartView {
  const currency = drafts[0]?.currency ?? DEFAULT_CURRENCY;
  const lines: CartLine[] = drafts.map((draft) => {
    const quantity = Math.min(Math.max(draft.quantity, 1), MAX_CART_QUANTITY);
    const availableQuantity = Math.max(0, Math.min(draft.stock, MAX_CART_QUANTITY));
    const problem = !draft.purchasable
      ? "unavailable"
      : draft.currency !== currency
        ? "currency-mismatch"
        : draft.quantity > draft.stock
          ? "insufficient-stock"
          : null;

    return {
      ...draft,
      quantity,
      availableQuantity,
      lineTotalCents: draft.unitPriceCents * quantity,
      problem,
    };
  });

  const payable = lines.filter((line) => line.problem === null);
  const itemCount = lines.reduce((total, line) => total + line.quantity, 0);
  const subtotalCents = payable.reduce((total, line) => total + line.lineTotalCents, 0);
  const hasIssues = lines.length > 0 && payable.length !== lines.length;

  return {
    lines,
    itemCount,
    subtotalCents,
    currency,
    hasIssues,
    canCheckout: lines.length > 0 && !hasIssues,
  };
}
