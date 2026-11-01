import { createHash, randomBytes } from "node:crypto";

import type { AccountTokenPurpose } from "@/generated/prisma/enums";

const TOKEN_BYTES = 32;

export function createAccountToken(): { token: string; tokenHash: string } {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  return { token, tokenHash: hashAccountToken(token) };
}

export function hashAccountToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function accountTokenExpiry(purpose: AccountTokenPurpose, now = new Date()): Date {
  const lifetimeMs = purpose === "EMAIL_VERIFICATION" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;

  return new Date(now.getTime() + lifetimeMs);
}
