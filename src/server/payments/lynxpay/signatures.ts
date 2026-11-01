import { createHmac, timingSafeEqual } from "node:crypto";

const HEX_SHA256 = /^[0-9a-f]{64}$/i;

export function hmacSha256Hex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function safeHexEqual(expected: string, received: string): boolean {
  if (!HEX_SHA256.test(expected) || !HEX_SHA256.test(received)) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}
