import { describe, expect, it } from "vitest";

import { allocateCommission, allocateRefund, reverseCommission } from "@/features/payments/ledger";

const shares = [
  { vendorOrderId: "vo-a", vendorId: "vendor-a", subtotalCents: 185_000 },
  { vendorOrderId: "vo-b", vendorId: "vendor-b", subtotalCents: 115_000 },
];

describe("allocateCommission", () => {
  it("splits commission per studio and keeps earnings plus commission equal to the subtotal", () => {
    const allocation = allocateCommission(shares, 1_000);

    expect(allocation).toEqual([
      {
        vendorOrderId: "vo-a",
        vendorId: "vendor-a",
        subtotalCents: 185_000,
        commissionCents: 18_500,
        earningCents: 166_500,
      },
      {
        vendorOrderId: "vo-b",
        vendorId: "vendor-b",
        subtotalCents: 115_000,
        commissionCents: 11_500,
        earningCents: 103_500,
      },
    ]);

    for (const row of allocation) {
      expect(row.earningCents + row.commissionCents).toBe(row.subtotalCents);
    }
  });

  it("rounds half up without crossing the subtotal", () => {
    const [row] = allocateCommission(
      [{ vendorOrderId: "vo", vendorId: "vendor", subtotalCents: 105 }],
      1_000,
    );

    expect(row?.commissionCents).toBe(11);
    expect(row?.earningCents).toBe(94);
  });

  it("rejects basis points outside 0–10000", () => {
    expect(() => allocateCommission(shares, -1)).toThrow();
    expect(() => allocateCommission(shares, 10_001)).toThrow();
  });
});

describe("allocateRefund", () => {
  it("uses largest remainders so the refund sums exactly", () => {
    const allocation = allocateRefund(
      [
        { vendorOrderId: "a", vendorId: "va", subtotalCents: 333 },
        { vendorOrderId: "b", vendorId: "vb", subtotalCents: 333 },
        { vendorOrderId: "c", vendorId: "vc", subtotalCents: 334 },
      ],
      100,
    );

    expect([...allocation.values()].reduce((sum, value) => sum + value, 0)).toBe(100);
    expect(allocation.get("c")).toBe(34);
  });

  it("refuses to allocate more than the original subtotals", () => {
    expect(() => allocateRefund(shares, 300_001)).toThrow();
  });

  it("returns zero for every studio when the refund is zero", () => {
    const allocation = allocateRefund(shares, 0);

    expect(allocation.get("vo-a")).toBe(0);
    expect(allocation.get("vo-b")).toBe(0);
  });
});

describe("reverseCommission", () => {
  it("reverses earnings and commission proportionally to the refund", () => {
    const [allocation] = allocateCommission(
      [{ vendorOrderId: "vo", vendorId: "vendor", subtotalCents: 1_000 }],
      1_000,
    );

    const reversal = reverseCommission(allocation!, 500);

    expect(reversal.earningReversalCents).toBe(450);
    expect(reversal.commissionReversalCents).toBe(50);
    expect(reversal.earningReversalCents + reversal.commissionReversalCents).toBe(500);
  });

  it("handles a full refund exactly", () => {
    const [allocation] = allocateCommission(
      [{ vendorOrderId: "vo", vendorId: "vendor", subtotalCents: 333 }],
      1_000,
    );

    const reversal = reverseCommission(allocation!, 333);

    expect(reversal.earningReversalCents).toBe(allocation!.earningCents);
    expect(reversal.commissionReversalCents).toBe(allocation!.commissionCents);
  });

  it("rejects refunds above the vendor subtotal", () => {
    const [allocation] = allocateCommission(
      [{ vendorOrderId: "vo", vendorId: "vendor", subtotalCents: 1_000 }],
      1_000,
    );

    expect(() => reverseCommission(allocation!, 1_001)).toThrow();
  });
});
