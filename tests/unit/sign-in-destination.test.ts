import { describe, expect, it } from "vitest";

import { getPostSignInDestination } from "@/features/identity/sign-in-destination";

describe("getPostSignInDestination", () => {
  it("takes rejected applicants to the appeal form after ordinary sign-in", () => {
    expect(getPostSignInDestination(undefined, "REJECTED")).toBe("/vendor?appeal=1#appeal");
  });

  it("preserves an intentional destination", () => {
    expect(getPostSignInDestination("/cart", "REJECTED")).toBe("/cart");
  });

  it("sends other accounts to their normal account page", () => {
    expect(getPostSignInDestination(undefined, "PENDING")).toBe("/account");
    expect(getPostSignInDestination(undefined, null)).toBe("/account");
  });
});
