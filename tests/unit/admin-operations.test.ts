import { describe, expect, it } from "vitest";

import { nextVendorOrderStatus } from "@/features/checkout/status";
import { buildCsv } from "@/server/export/csv";

describe("admin exports", () => {
  it("neutralizes spreadsheet formulas and quotes CSV cells", () => {
    expect(buildCsv(["value"], [["=SUM(1,2)"], ['hello, "world"']])).toBe(
      'value\r\n"\'=SUM(1,2)"\r\n"hello, ""world"""',
    );
  });
});

describe("vendor fulfillment transitions", () => {
  it("moves paid orders through the allowed sequence", () => {
    expect(nextVendorOrderStatus("PAID")).toBe("PROCESSING");
    expect(nextVendorOrderStatus("PROCESSING")).toBe("SHIPPED");
    expect(nextVendorOrderStatus("SHIPPED")).toBe("DELIVERED");
  });

  it("does not allow unpaid, cancelled, expired, or delivered orders to advance", () => {
    expect(nextVendorOrderStatus("AWAITING_PAYMENT")).toBeNull();
    expect(nextVendorOrderStatus("CANCELLED")).toBeNull();
    expect(nextVendorOrderStatus("EXPIRED")).toBeNull();
    expect(nextVendorOrderStatus("DELIVERED")).toBeNull();
  });
});
