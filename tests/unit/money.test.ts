import { describe, expect, it } from "vitest";

import { centsToSignedDecimalString, formatMoney } from "@/features/catalog/money";

describe("formatMoney", () => {
  it("formats whole-shilling amounts without decimals", () => {
    expect(formatMoney(6800)).toBe("TZS 68");
  });

  it("keeps cents when they are present", () => {
    expect(formatMoney(6850)).toBe("TZS 68.50");
    expect(formatMoney(1)).toBe("TZS 0.01");
  });

  it("formats zero", () => {
    expect(formatMoney(0)).toBe("TZS 0");
  });

  it("groups thousands", () => {
    expect(formatMoney(18500000)).toBe("TZS 185,000");
  });

  it("honors the requested currency", () => {
    expect(formatMoney(1000, "GBP", "en-GB")).toBe("£10");
  });
});

describe("centsToSignedDecimalString", () => {
  it("keeps negative ledger reversals exact", () => {
    expect(centsToSignedDecimalString(-40_000)).toBe("-400.00");
    expect(centsToSignedDecimalString(-1)).toBe("-0.01");
  });

  it("writes positive amounts without a sign", () => {
    expect(centsToSignedDecimalString(166_500)).toBe("1665.00");
  });

  it("rejects fractional cents", () => {
    expect(() => centsToSignedDecimalString(10.5)).toThrow();
  });
});
