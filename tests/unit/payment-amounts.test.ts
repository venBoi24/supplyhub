import { describe, expect, it } from "vitest";

import {
  LynxPayAmountError,
  fromProviderWholeUnits,
  toProviderWholeUnits,
} from "@/server/payments/lynxpay/amounts";
import { lynxPayPaymentSchema, toGatewayPayment } from "@/server/payments/lynxpay/schema";

describe("LynxPay amount conversion", () => {
  it("sends whole shillings to the provider", () => {
    expect(toProviderWholeUnits(18_500_000, "TZS")).toBe(185_000);
    expect(toProviderWholeUnits(0, "TZS")).toBe(0);
  });

  it("returns minor units from provider whole units", () => {
    expect(fromProviderWholeUnits(5110)).toBe(511_000);
  });

  it("rejects fractional shilling amounts", () => {
    expect(() => toProviderWholeUnits(18_500_050, "TZS")).toThrow(LynxPayAmountError);
    expect(() => toProviderWholeUnits(100.5, "TZS")).toThrow(LynxPayAmountError);
  });

  it("rejects currencies LynxPay does not settle", () => {
    expect(() => toProviderWholeUnits(6_800, "USD")).toThrow(LynxPayAmountError);
  });

  it("rejects negative amounts", () => {
    expect(() => toProviderWholeUnits(-100, "TZS")).toThrow(LynxPayAmountError);
  });
});

describe("LynxPay payload mapping", () => {
  it("treats amount as the customer charge and net_amount as the merchant total", () => {
    const parsed = lynxPayPaymentSchema.parse({
      id: "pay_01",
      external_id: "SH-20261101-ABCDEF",
      amount: 5110,
      fee_amount: 110,
      net_amount: 5000,
      currency: "tzs",
      status: "completed",
      payment_method: "mpesa",
      customer_phone: "255754123456",
      completed_at: "2026-11-01T10:00:00.000Z",
    });
    const payment = toGatewayPayment(parsed);

    expect(payment.amountMinor).toBe(511_000);
    expect(payment.feeMinor).toBe(11_000);
    expect(payment.netMinor).toBe(500_000);
    expect(payment.amountMinor).toBe(payment.netMinor + payment.feeMinor);
    expect(payment.currency).toBe("TZS");
    expect(payment.status).toBe("completed");
    expect(payment.completedAt?.toISOString()).toBe("2026-11-01T10:00:00.000Z");
  });

  it("derives net from gross minus fee when net_amount is absent", () => {
    const parsed = lynxPayPaymentSchema.parse({
      id: "pay_02",
      amount: 5110,
      fee_amount: 110,
      currency: "TZS",
      status: "processing",
    });

    expect(toGatewayPayment(parsed).netMinor).toBe(500_000);
  });

  it("rejects unknown provider statuses instead of guessing", () => {
    const parsed = lynxPayPaymentSchema.parse({
      id: "pay_03",
      amount: 5000,
      currency: "TZS",
      status: "settled_eventually",
    });

    expect(() => toGatewayPayment(parsed)).toThrow();
  });
});
