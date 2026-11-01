import { randomBytes } from "node:crypto";

export const ORDER_NUMBER_PATTERN = /^SH-\d{8}-[2-9A-HJ-NP-Z]{6}$/;

// 32 unambiguous characters (no 0, 1, I, L, O, U).
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function createOrderNumber(now = new Date()): string {
  const date = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("");

  let code = "";

  for (const byte of randomBytes(6)) {
    code += ALPHABET[byte % ALPHABET.length];
  }

  return `SH-${date}-${code}`;
}
