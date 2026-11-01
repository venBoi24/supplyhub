import { describe, expect, it } from "vitest";

import { checkoutAddressSchema } from "@/features/checkout/validation";
import { createOrderNumber, ORDER_NUMBER_PATTERN } from "@/features/checkout/order-number";

describe("checkout address validation", () => {
  const valid = {
    recipientName: "  Mara Ellison ",
    contactEmail: " Mara@Example.com ",
    contactPhone: "",
    addressLine1: " 14 Alder Lane ",
    addressLine2: "",
    city: " Portland ",
    region: "Oregon",
    postalCode: "97205",
    countryCode: "us",
  };

  it("trims fields, drops empty optional values, and uppercases the country", () => {
    const parsed = checkoutAddressSchema.parse(valid);

    expect(parsed.recipientName).toBe("Mara Ellison");
    expect(parsed.contactEmail).toBe("mara@example.com");
    expect(parsed.contactPhone).toBeUndefined();
    expect(parsed.addressLine1).toBe("14 Alder Lane");
    expect(parsed.addressLine2).toBeUndefined();
    expect(parsed.countryCode).toBe("US");
  });

  it("accepts a formatted phone number", () => {
    const parsed = checkoutAddressSchema.parse({ ...valid, contactPhone: "+1 (503) 555-0117" });

    expect(parsed.contactPhone).toBe("+1 (503) 555-0117");
  });

  it("rejects malformed contact and address fields", () => {
    expect(checkoutAddressSchema.safeParse({ ...valid, recipientName: "M" }).success).toBe(false);
    expect(
      checkoutAddressSchema.safeParse({ ...valid, contactEmail: "not-an-email" }).success,
    ).toBe(false);
    expect(checkoutAddressSchema.safeParse({ ...valid, contactPhone: "call me" }).success).toBe(
      false,
    );
    expect(checkoutAddressSchema.safeParse({ ...valid, addressLine1: "" }).success).toBe(false);
    expect(checkoutAddressSchema.safeParse({ ...valid, postalCode: "!!" }).success).toBe(false);
    expect(checkoutAddressSchema.safeParse({ ...valid, countryCode: "USA" }).success).toBe(false);
  });
});

describe("order numbers", () => {
  it("uses the documented prefix, UTC date, and unambiguous alphabet", () => {
    const now = new Date("2026-11-01T23:59:00.000Z");
    const orderNumber = createOrderNumber(now);

    expect(ORDER_NUMBER_PATTERN.test(orderNumber)).toBe(true);
    expect(orderNumber.startsWith("SH-20261101-")).toBe(true);
    expect(orderNumber.slice(12)).toHaveLength(6);
    expect(orderNumber.slice(12)).not.toMatch(/[01IO]/);
  });

  it("does not repeat consecutive numbers", () => {
    const now = new Date("2026-11-01T12:00:00.000Z");
    const numbers = new Set(Array.from({ length: 200 }, () => createOrderNumber(now)));

    expect(numbers.size).toBeGreaterThan(190);
  });

  it("rejects values outside the documented shape", () => {
    expect(ORDER_NUMBER_PATTERN.test("SH-20261101-ABCDE")).toBe(false);
    expect(ORDER_NUMBER_PATTERN.test("SH-20261101-ABCDE0")).toBe(false);
    expect(ORDER_NUMBER_PATTERN.test("../SH-20261101-ABCDEF")).toBe(false);
  });
});
