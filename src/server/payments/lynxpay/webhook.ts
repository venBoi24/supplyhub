import { createHash } from "node:crypto";

import { hmacSha256Hex, safeHexEqual } from "./signatures";

export const WEBHOOK_TOLERANCE_SECONDS = 300;

export interface WebhookVerificationInput {
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
  previousSignature?: string | null;
  secret: string;
  previousSecret?: string | null;
  nowSeconds?: number;
}

export function verifyLynxPayWebhook(input: WebhookVerificationInput): boolean {
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const timestamp = Number(input.timestamp);

  if (
    !input.timestamp ||
    !input.signature ||
    !Number.isInteger(timestamp) ||
    Math.abs(now - timestamp) > WEBHOOK_TOLERANCE_SECONDS
  ) {
    return false;
  }

  const signedPayload = `${input.timestamp}.${input.rawBody}`;
  const expected = hmacSha256Hex(input.secret, signedPayload);

  if (safeHexEqual(expected, input.signature)) {
    return true;
  }

  if (!input.previousSecret || !input.previousSignature) {
    return false;
  }

  return safeHexEqual(hmacSha256Hex(input.previousSecret, signedPayload), input.previousSignature);
}

/**
 * LynxPay sends a delivery id header. Hash the raw body as a fallback so a missing header
 * cannot turn a retry into a second financial mutation.
 */
export function webhookDeliveryId(deliveryHeader: string | null, rawBody: string): string {
  if (deliveryHeader && deliveryHeader.trim().length > 0) {
    return deliveryHeader.trim().slice(0, 128);
  }

  return `body-${createHash("sha256").update(rawBody).digest("hex")}`;
}
