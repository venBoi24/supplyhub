import { describe, expect, it } from "vitest";

import { redact, sanitizeLogString } from "@/lib/logging/logger";

describe("sanitizeLogString", () => {
  it("removes control characters and collapses whitespace", () => {
    expect(sanitizeLogString("first line\nsecond\u0000line")).toBe("first line second line");
  });

  it("truncates long values", () => {
    expect(sanitizeLogString("a".repeat(900))).toHaveLength(500);
  });
});

describe("redact", () => {
  it("redacts sensitive keys recursively", () => {
    expect(
      redact({
        user: { email: "person@example.com", password: "not-logged" },
        items: [{ token: "secret-value", quantity: 2 }],
      }),
    ).toEqual({
      user: { email: "[REDACTED]", password: "[REDACTED]" },
      items: [{ token: "[REDACTED]", quantity: 2 }],
    });
  });

  it("keeps non-sensitive operational data", () => {
    expect(redact({ orderId: "order-123", status: "paid", amount: 42 })).toEqual({
      orderId: "order-123",
      status: "paid",
      amount: 42,
    });
  });

  it("reduces errors to a safe name and message", () => {
    expect(redact(new Error("failed\nunexpectedly"))).toEqual({
      name: "Error",
      message: "failed unexpectedly",
    });
  });

  it("handles circular references", () => {
    const value: Record<string, unknown> = { event: "test" };
    value.self = value;

    expect(redact(value)).toEqual({ event: "test", self: "[CIRCULAR]" });
  });

  it("bounds depth and large arrays", () => {
    const deeplyNested = { a: { b: { c: { d: { e: { f: { g: "too deep" } } } } } } };
    expect(JSON.stringify(redact(deeplyNested))).toContain("[MAX_DEPTH]");

    const largeArray = Array.from({ length: 80 }, (_, index) => index);
    expect(redact(largeArray)).toHaveLength(50);
  });
});
