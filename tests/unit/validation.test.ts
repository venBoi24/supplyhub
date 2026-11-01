import { describe, expect, it } from "vitest";

import {
  emailField,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  vendorApplicationSchema,
  vendorAppealReviewSchema,
  vendorAppealSchema,
  vendorReviewSchema,
} from "@/features/identity/validation";
import { studioProfileSchema } from "@/features/catalog/validation";

describe("studioProfileSchema", () => {
  const location = {
    city: "Dar es Salaam",
    street: "Samora Avenue",
    address: "Plot 12, Mlimani Tower",
    latitude: "-6.8161",
    longitude: "39.2803",
    discipline: "Ceramics",
    story: "A small studio making thoughtful objects by hand.",
    monogram: "SM",
  };

  it("accepts a complete address and optional device coordinates", () => {
    expect(studioProfileSchema.parse(location)).toMatchObject({
      city: "Dar es Salaam",
      latitude: -6.8161,
      longitude: 39.2803,
    });
  });

  it("requires city, street, address, and paired valid coordinates", () => {
    expect(studioProfileSchema.safeParse({ ...location, street: "" }).success).toBe(false);
    expect(
      studioProfileSchema.safeParse({ ...location, latitude: "", longitude: "39.2" }).success,
    ).toBe(false);
    expect(studioProfileSchema.safeParse({ ...location, latitude: "91" }).success).toBe(false);
  });
});

describe("emailField", () => {
  it("trims and lowercases addresses", () => {
    expect(emailField.parse("  Maker@Example.COM ")).toBe("maker@example.com");
  });

  it("rejects malformed and overlong addresses", () => {
    expect(emailField.safeParse("not-an-email").success).toBe(false);
    expect(emailField.safeParse(`${"a".repeat(250)}@example.com`).success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("normalizes the email and requires a password", () => {
    expect(
      signInSchema.parse({
        email: " Owner@Example.com ",
        password: "correct horse battery staple",
        next: "/vendor",
      }),
    ).toMatchObject({
      email: "owner@example.com",
      next: "/vendor",
    });

    expect(signInSchema.safeParse({ email: "owner@example.com", password: "" }).success).toBe(
      false,
    );
  });
});

describe("signUpSchema", () => {
  const valid = {
    name: "  Ada Maker ",
    email: "ada@example.com",
    password: "twelve-characters",
    confirmPassword: "twelve-characters",
  };

  it("accepts a valid registration and trims the name", () => {
    expect(signUpSchema.parse(valid)).toMatchObject({ name: "Ada Maker" });
  });

  it("rejects short passwords", () => {
    const result = signUpSchema.safeParse({
      ...valid,
      password: "short",
      confirmPassword: "short",
    });

    expect(result.success).toBe(false);
  });

  it("reports mismatched confirmation on the confirmPassword field", () => {
    const result = signUpSchema.safeParse({ ...valid, confirmPassword: "different-password" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
  });
});

describe("resetPasswordSchema", () => {
  it("requires the 43-character token format", () => {
    const tokens = {
      token: "a".repeat(43),
      password: "long-enough-password",
      confirmPassword: "long-enough-password",
    };

    expect(resetPasswordSchema.safeParse(tokens).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ ...tokens, token: "a".repeat(42) }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ ...tokens, token: "../".repeat(15) }).success).toBe(
      false,
    );
  });
});

describe("vendorApplicationSchema", () => {
  it("normalizes handles and trims copy", () => {
    const parsed = vendorApplicationSchema.parse({
      name: "  Harbor & Loom ",
      slug: "  Harbor-And-Loom  ",
      description: "  Woven textiles from a small coastal workshop.  ",
    });

    expect(parsed).toEqual({
      name: "Harbor & Loom",
      slug: "harbor-and-loom",
      description: "Woven textiles from a small coastal workshop.",
    });
  });

  it("rejects invalid handles", () => {
    for (const slug of ["ab", "harbor_and_loom", "-harbor", "harbor--loom", "harbor loom"]) {
      const result = vendorApplicationSchema.safeParse({
        name: "Harbor & Loom",
        slug,
        description: "Woven textiles from a small coastal workshop.",
      });

      expect(result.success, slug).toBe(false);
    }
  });

  it("requires a substantial description", () => {
    const result = vendorApplicationSchema.safeParse({
      name: "Harbor & Loom",
      slug: "harbor-and-loom",
      description: "Too short.",
    });

    expect(result.success).toBe(false);
  });
});

describe("vendorReviewSchema", () => {
  const vendorId = "6f1e6a0a-8a6e-4a0b-9d2f-2b9f0b8c1d2e";

  it("allows approval without a note", () => {
    expect(vendorReviewSchema.parse({ vendorId, decision: "approve" })).toEqual({
      vendorId,
      decision: "approve",
      note: "",
    });
  });

  it("requires a reason when rejecting", () => {
    const missing = vendorReviewSchema.safeParse({ vendorId, decision: "reject" });

    expect(missing.success).toBe(false);
    expect(missing.error?.issues[0]?.path).toEqual(["note"]);

    const short = vendorReviewSchema.safeParse({ vendorId, decision: "reject", note: "no" });
    expect(short.success).toBe(false);

    const valid = vendorReviewSchema.safeParse({
      vendorId,
      decision: "reject",
      note: "  Studio details are incomplete.  ",
    });
    expect(valid.success).toBe(true);
    expect(valid.data?.note).toBe("Studio details are incomplete.");
  });

  it("rejects malformed vendor references", () => {
    expect(
      vendorReviewSchema.safeParse({ vendorId: "not-a-uuid", decision: "approve" }).success,
    ).toBe(false);
  });
});

describe("vendor appeal schemas", () => {
  const vendorId = "6f1e6a0a-8a6e-4a0b-9d2f-2b9f0b8c1d2e";

  it("requires a substantive appeal reason", () => {
    expect(vendorAppealSchema.safeParse({ reason: "Please reconsider." }).success).toBe(false);
    expect(
      vendorAppealSchema.safeParse({
        reason: "I have added the missing business registration details.",
      }).success,
    ).toBe(true);
  });

  it("requires a note when an administrator declines an appeal", () => {
    expect(vendorAppealReviewSchema.safeParse({ vendorId, decision: "reject" }).success).toBe(
      false,
    );
    expect(
      vendorAppealReviewSchema.safeParse({
        vendorId,
        decision: "reject",
        note: "The original requirements remain unmet.",
      }).success,
    ).toBe(true);
  });
});
