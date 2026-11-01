import { describe, expect, it } from "vitest";

import { MAX_CART_QUANTITY } from "@/features/cart/constants";
import { createCartToken, hashCartToken, isCartToken } from "@/features/cart/guest-token";
import { summarizeCart } from "@/features/cart/pricing";
import type { CartLineDraft } from "@/features/cart/types";
import { cartMutationSchema, cartQuantitySchema } from "@/features/cart/validation";

function draft(overrides: Partial<CartLineDraft> = {}): CartLineDraft {
  return {
    productId: "40000000-0000-4000-8000-000000000001",
    slug: "ridge-carafe",
    name: "Ridge Carafe",
    sku: "AN-CARAFE-1",
    vendorName: "Atelier Nord",
    vendorSlug: "atelier-nord",
    image: null,
    unitPriceCents: 6800,
    currency: "USD",
    quantity: 1,
    stock: 10,
    purchasable: true,
    ...overrides,
  };
}

describe("cart guest tokens", () => {
  it("creates an opaque token that satisfies the cookie pattern", () => {
    const token = createCartToken();

    expect(token).toHaveLength(43);
    expect(isCartToken(token)).toBe(true);
    expect(createCartToken()).not.toBe(token);
  });

  it("hashes tokens deterministically without keeping the raw value", () => {
    const token = createCartToken();
    const hash = hashCartToken(token);

    expect(hash).toBe(hashCartToken(token));
    expect(hash).not.toContain(token);
  });

  it("rejects malformed or missing tokens", () => {
    expect(isCartToken("short")).toBe(false);
    expect(isCartToken(`${"a".repeat(42)}!`)).toBe(false);
    expect(isCartToken(null)).toBe(false);
    expect(isCartToken(undefined)).toBe(false);
  });
});

describe("summarizeCart", () => {
  it("totals a mixed-vendor cart from server prices", () => {
    const view = summarizeCart([
      draft(),
      draft({
        productId: "40000000-0000-4000-8000-000000000005",
        slug: "linen-throw",
        name: "Linen Throw",
        sku: "LH-THROW-1",
        vendorName: "Loom House",
        vendorSlug: "loom-house",
        unitPriceCents: 12000,
        quantity: 2,
      }),
    ]);

    expect(view.lines).toHaveLength(2);
    expect(view.itemCount).toBe(3);
    expect(view.subtotalCents).toBe(6800 + 12000 * 2);
    expect(view.currency).toBe("USD");
    expect(view.hasIssues).toBe(false);
    expect(view.canCheckout).toBe(true);
    expect(view.lines[1]?.lineTotalCents).toBe(24000);
  });

  it("returns a checkout-blocking cart when nothing is selected", () => {
    const view = summarizeCart([]);

    expect(view.lines).toEqual([]);
    expect(view.itemCount).toBe(0);
    expect(view.subtotalCents).toBe(0);
    expect(view.canCheckout).toBe(false);
  });

  it("clamps quantities to the supported range", () => {
    const view = summarizeCart([
      draft({ quantity: 0, stock: 30 }),
      draft({ quantity: 30, stock: 30 }),
    ]);

    expect(view.lines[0]?.quantity).toBe(1);
    expect(view.lines[0]?.problem).toBeNull();
    expect(view.lines[1]?.quantity).toBe(MAX_CART_QUANTITY);
    expect(view.lines[1]?.lineTotalCents).toBe(6800 * MAX_CART_QUANTITY);
    expect(view.lines[1]?.problem).toBeNull();
  });

  it("flags sold-out, over-quantity, unavailable, and mismatched-currency lines", () => {
    const view = summarizeCart([
      draft({ quantity: 2, stock: 0 }),
      draft({
        productId: "40000000-0000-4000-8000-000000000003",
        quantity: 3,
        stock: 2,
      }),
      draft({
        productId: "40000000-0000-4000-8000-000000000004",
        purchasable: false,
      }),
      draft({
        productId: "40000000-0000-4000-8000-000000000005",
        currency: "EUR",
      }),
    ]);

    expect(view.lines.map((line) => line.problem)).toEqual([
      "insufficient-stock",
      "insufficient-stock",
      "unavailable",
      "currency-mismatch",
    ]);
    expect(view.lines[0]?.availableQuantity).toBe(0);
    expect(view.hasIssues).toBe(true);
    expect(view.canCheckout).toBe(false);
    expect(view.subtotalCents).toBe(0);
  });

  it("excludes problem lines from the subtotal but keeps good lines payable", () => {
    const view = summarizeCart([draft(), draft({ stock: 0, quantity: 1 })]);

    expect(view.hasIssues).toBe(true);
    expect(view.canCheckout).toBe(false);
    expect(view.subtotalCents).toBe(6800);
    expect(view.itemCount).toBe(2);
  });
});

describe("cart input validation", () => {
  it("coerces form quantities and rejects out-of-range values", () => {
    expect(cartQuantitySchema.parse("3")).toBe(3);
    expect(cartQuantitySchema.safeParse("0").success).toBe(false);
    expect(cartQuantitySchema.safeParse(String(MAX_CART_QUANTITY + 1)).success).toBe(false);
    expect(cartQuantitySchema.safeParse("1.5").success).toBe(false);
  });

  it("requires a UUID product reference", () => {
    const base = { productId: "40000000-0000-4000-8000-000000000001", quantity: "1" };

    expect(cartMutationSchema.safeParse(base).success).toBe(true);
    expect(cartMutationSchema.safeParse({ ...base, productId: "../admin" }).success).toBe(false);
  });
});
