import { describe, expect, it } from "vitest";

import {
  normalizeTanzanianPhone,
  payoutSchema,
  refundSchema,
  startPaymentSchema,
} from "@/features/payments/validation";

const orderNumber = "SH-20261101-ABCDEF";
const paymentId = "11111111-1111-4111-8111-111111111111";
const vendorId = "22222222-2222-4222-8222-222222222222";

describe("normalizeTanzanianPhone", () => {
  it("accepts local and international Tanzanian mobile numbers", () => {
    expect(normalizeTanzanianPhone("0754 123 456")).toBe("255754123456");
    expect(normalizeTanzanianPhone("+255 754 123 456")).toBe("255754123456");
    expect(normalizeTanzanianPhone("0655-123-456")).toBe("255655123456");
  });

  it("rejects landlines, wrong country codes, and short numbers", () => {
    expect(normalizeTanzanianPhone("022 123 4567")).toBeNull();
    expect(normalizeTanzanianPhone("+254 754 123 456")).toBeNull();
    expect(normalizeTanzanianPhone("0754 123")).toBeNull();
  });
});

describe("startPaymentSchema", () => {
  it("requires a phone number for mobile money", () => {
    const result = startPaymentSchema.safeParse({
      orderNumber,
      method: "mpesa",
      phone: "",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["phone"]);
  });

  it("normalises the phone number before it reaches the provider", () => {
    const result = startPaymentSchema.parse({
      orderNumber,
      method: "tigopesa",
      phone: "0754 123 456",
    });

    expect(result.phone).toBe("255754123456");
  });

  it("allows card payments without a phone number", () => {
    const result = startPaymentSchema.safeParse({
      orderNumber,
      method: "card",
      phone: "",
    });

    expect(result.success).toBe(true);
  });

  it("rejects unsupported methods and malformed order references", () => {
    expect(
      startPaymentSchema.safeParse({ orderNumber, method: "paypal", phone: "0754123456" }).success,
    ).toBe(false);
    expect(
      startPaymentSchema.safeParse({ orderNumber: "SH-1", method: "card", phone: "" }).success,
    ).toBe(false);
  });
});

describe("refundSchema", () => {
  it("parses a positive amount into integer cents", () => {
    const result = refundSchema.parse({
      orderNumber,
      paymentId,
      amountCents: "185000.50",
      reason: "Returned carafe",
    });

    expect(result.amountCents).toBe(18_500_050);
  });

  it("rejects zero, negative, and over-precise amounts", () => {
    for (const amount of ["0", "-5", "12.345", "abc"]) {
      expect(
        refundSchema.safeParse({
          orderNumber,
          paymentId,
          amountCents: amount,
          reason: "Returned carafe",
        }).success,
      ).toBe(false);
    }
  });
});

describe("payoutSchema", () => {
  const valid = {
    vendorId,
    amountCents: "100000",
    periodStart: "2026-10-01",
    periodEnd: "2026-10-31",
    note: "",
  };

  it("accepts a closed period from the past", () => {
    const result = payoutSchema.safeParse(valid);

    expect(result.success).toBe(true);
    expect(result.data?.amountCents).toBe(10_000_000);
    expect(result.data?.note).toBeUndefined();
  });

  it("rejects a period that ends before it starts", () => {
    expect(payoutSchema.safeParse({ ...valid, periodEnd: "2026-09-30" }).success).toBe(false);
  });

  it("rejects a period that ends in the future", () => {
    expect(payoutSchema.safeParse({ ...valid, periodEnd: "2999-12-31" }).success).toBe(false);
  });

  it("rejects non-uuid studios", () => {
    expect(payoutSchema.safeParse({ ...valid, vendorId: "atelier-nord" }).success).toBe(false);
  });
});
