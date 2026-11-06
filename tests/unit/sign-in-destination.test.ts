import { describe, expect, it } from "vitest";

import { getPostSignInDestination } from "@/features/identity/sign-in-destination";

describe("getPostSignInDestination", () => {
  it("takes rejected applicants to the appeal form after ordinary sign-in", () => {
    expect(getPostSignInDestination(undefined, "REJECTED")).toBe("/vendor?appeal=1#appeal");
  });

  it("preserves an intentional destination", () => {
    expect(getPostSignInDestination("/cart", "REJECTED")).toBe("/cart");
  });

  it("sends approved and pending studios straight to their workspace", () => {
    expect(getPostSignInDestination(undefined, "PENDING")).toBe("/vendor");
    expect(getPostSignInDestination(undefined, "APPROVED")).toBe("/vendor");
  });

  it("sends buyers to their account page", () => {
    expect(getPostSignInDestination(undefined, null)).toBe("/account");
  });
});
