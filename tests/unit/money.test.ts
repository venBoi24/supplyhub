import { describe, expect, it } from "vitest";

import { formatMoney } from "@/features/catalog/money";

describe("formatMoney", () => {
  it("formats whole-dollar amounts without decimals", () => {
    expect(formatMoney(6800)).toBe("$68");
  });

  it("keeps cents when they are present", () => {
    expect(formatMoney(6850)).toBe("$68.50");
    expect(formatMoney(1)).toBe("$0.01");
  });

  it("formats zero", () => {
    expect(formatMoney(0)).toBe("$0");
  });

  it("groups thousands", () => {
    expect(formatMoney(185000)).toBe("$1,850");
  });

  it("honors the requested currency", () => {
    expect(formatMoney(1000, "GBP", "en-GB")).toBe("£10");
  });
});
