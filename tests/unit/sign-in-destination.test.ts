import { describe, expect, it } from "vitest";

import { getPostSignInDestination } from "@/features/identity/sign-in-destination";

describe("getPostSignInDestination", () => {
  it("takes rejected applicants to the appeal form after ordinary sign-in", () => {
    expect(getPostSignInDestination(undefined, "VENDOR", "REJECTED")).toBe(
      "/vendor?appeal=1#appeal",
    );
  });

  it("preserves an intentional destination", () => {
    expect(getPostSignInDestination("/cart", "VENDOR", "REJECTED")).toBe("/cart");
  });

  it("sends approved and pending studios straight to their workspace", () => {
    expect(getPostSignInDestination(undefined, "VENDOR", "PENDING")).toBe("/vendor");
    expect(getPostSignInDestination(undefined, "VENDOR", "APPROVED")).toBe("/vendor");
  });

  it("sends administrators to the admin dashboard", () => {
    expect(getPostSignInDestination(undefined, "ADMIN", null)).toBe("/admin");
  });

  it("sends buyers to their account page", () => {
    expect(getPostSignInDestination(undefined, "CUSTOMER", null)).toBe("/account");
  });
});
