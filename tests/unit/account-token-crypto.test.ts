import { describe, expect, it } from "vitest";

import {
  accountTokenExpiry,
  createAccountToken,
  hashAccountToken,
} from "@/server/auth/account-token-crypto";
import { ACCOUNT_TOKEN_PATTERN } from "@/lib/security/token-format";

describe("createAccountToken", () => {
  it("creates an opaque 32-byte base64url token and its hash", () => {
    const { token, tokenHash } = createAccountToken();

    expect(token).toMatch(ACCOUNT_TOKEN_PATTERN);
    expect(token).toHaveLength(43);
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(tokenHash).toBe(hashAccountToken(token));
  });

  it("does not reuse tokens", () => {
    const first = createAccountToken();
    const second = createAccountToken();

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });
});

describe("hashAccountToken", () => {
  it("hashes deterministically without exposing the token", () => {
    const token = "a".repeat(43);

    expect(hashAccountToken(token)).toBe(hashAccountToken(token));
    expect(hashAccountToken(token)).not.toBe(token);
    expect(hashAccountToken(token)).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("accountTokenExpiry", () => {
  it("gives verification links 24 hours", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");

    expect(accountTokenExpiry("EMAIL_VERIFICATION", now).toISOString()).toBe(
      "2026-01-02T00:00:00.000Z",
    );
  });

  it("gives password reset links one hour", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");

    expect(accountTokenExpiry("PASSWORD_RESET", now).toISOString()).toBe(
      "2026-01-01T01:00:00.000Z",
    );
  });
});
