import { describe, expect, it } from "vitest";

import { safeNextPath } from "@/lib/security/safe-redirect";

describe("safeNextPath", () => {
  it("keeps internal paths with search and hash", () => {
    expect(safeNextPath("/account")).toBe("/account");
    expect(safeNextPath("/vendor?submitted=1#studio")).toBe("/vendor?submitted=1#studio");
    expect(safeNextPath("/sign-in?next=%2Fvendor")).toBe("/sign-in?next=%2Fvendor");
  });

  it("falls back for absolute and protocol-relative URLs", () => {
    expect(safeNextPath("https://evil.example/steal")).toBe("/account");
    expect(safeNextPath("http://evil.example")).toBe("/account");
    expect(safeNextPath("//evil.example/steal")).toBe("/account");
    expect(safeNextPath("///evil.example")).toBe("/account");
  });

  it("falls back for script and data schemes", () => {
    expect(safeNextPath("javascript:alert(1)")).toBe("/account");
    expect(safeNextPath("data:text/html,hello")).toBe("/account");
    expect(safeNextPath("mailto:someone@example.com")).toBe("/account");
  });

  it("falls back for relative paths and backslash tricks", () => {
    expect(safeNextPath("account")).toBe("/account");
    expect(safeNextPath("/\\evil.example")).toBe("/account");
    expect(safeNextPath("/account\\..\\admin")).toBe("/account");
  });

  it("falls back for control characters", () => {
    expect(safeNextPath("/account\nLocation: https://evil.example")).toBe("/account");
    expect(safeNextPath("/account\u0000")).toBe("/account");
    expect(safeNextPath("/account\u007f")).toBe("/account");
  });

  it("falls back for empty input", () => {
    expect(safeNextPath(undefined)).toBe("/account");
    expect(safeNextPath(null)).toBe("/account");
    expect(safeNextPath("")).toBe("/account");
  });

  it("honors a custom fallback", () => {
    expect(safeNextPath("https://evil.example", "/sign-in")).toBe("/sign-in");
    expect(safeNextPath(null, "/vendor")).toBe("/vendor");
  });
});
