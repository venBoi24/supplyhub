import "server-only";

import { createHash, randomBytes } from "node:crypto";

export const CART_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createCartToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashCartToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

export function isCartToken(value: string | null | undefined): value is string {
  return typeof value === "string" && CART_TOKEN_PATTERN.test(value);
}
