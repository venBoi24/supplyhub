import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { hmacSha256Hex } from "@/server/payments/lynxpay/signatures";
import {
  WEBHOOK_TOLERANCE_SECONDS,
  verifyLynxPayWebhook,
  webhookDeliveryId,
} from "@/server/payments/lynxpay/webhook";

const secret = "lynx_demo_signing_secret_public";
const previousSecret = "lynx_previous_signing_secret";
const rawBody = JSON.stringify({
  id: "pay_123",
  external_id: "SH-20261101-ABCDEF",
  amount: 5110,
  fee_amount: 110,
  net_amount: 5000,
  currency: "TZS",
  status: "completed",
});
const nowSeconds = 1_800_000_000;
const timestamp = String(nowSeconds);
const signature = hmacSha256Hex(secret, `${timestamp}.${rawBody}`);

describe("verifyLynxPayWebhook", () => {
  it("accepts a correctly signed delivery within the tolerance", () => {
    expect(
      verifyLynxPayWebhook({
        rawBody,
        timestamp,
        signature,
        secret,
        nowSeconds,
      }),
    ).toBe(true);
  });

  it("rejects a signature made for a different body", () => {
    expect(
      verifyLynxPayWebhook({
        rawBody: rawBody.replace("completed", "failed"),
        timestamp,
        signature,
        secret,
        nowSeconds,
      }),
    ).toBe(false);
  });

  it("rejects timestamps outside the tolerance window", () => {
    const stale = String(nowSeconds - WEBHOOK_TOLERANCE_SECONDS - 1);

    expect(
      verifyLynxPayWebhook({
        rawBody,
        timestamp: stale,
        signature: hmacSha256Hex(secret, `${stale}.${rawBody}`),
        secret,
        nowSeconds,
      }),
    ).toBe(false);
  });

  it("rejects missing or malformed signatures", () => {
    expect(verifyLynxPayWebhook({ rawBody, timestamp, signature: null, secret, nowSeconds })).toBe(
      false,
    );
    expect(
      verifyLynxPayWebhook({ rawBody, timestamp, signature: "not-hex", secret, nowSeconds }),
    ).toBe(false);
  });

  it("accepts a delivery signed with the previous secret during rotation", () => {
    expect(
      verifyLynxPayWebhook({
        rawBody,
        timestamp,
        signature: hmacSha256Hex(secret, `${timestamp}.${rawBody}`),
        previousSignature: hmacSha256Hex(previousSecret, `${timestamp}.${rawBody}`),
        secret: "a-different-current-secret",
        previousSecret,
        nowSeconds,
      }),
    ).toBe(true);
  });

  it("does not accept a previous signature without the previous secret", () => {
    expect(
      verifyLynxPayWebhook({
        rawBody,
        timestamp,
        signature: "0".repeat(64),
        previousSignature: hmacSha256Hex(previousSecret, `${timestamp}.${rawBody}`),
        secret,
        nowSeconds,
      }),
    ).toBe(false);
  });
});

describe("webhookDeliveryId", () => {
  it("uses the provider delivery header, trimmed and bounded", () => {
    expect(webhookDeliveryId("  delivery_01  ", rawBody)).toBe("delivery_01");
    expect(webhookDeliveryId("d".repeat(200), rawBody)).toHaveLength(128);
  });

  it("falls back to a deterministic body hash so retries still deduplicate", () => {
    const expected = `body-${createHash("sha256").update(rawBody).digest("hex")}`;

    expect(webhookDeliveryId(null, rawBody)).toBe(expected);
    expect(webhookDeliveryId("   ", rawBody)).toBe(expected);
    expect(webhookDeliveryId(null, rawBody)).toBe(webhookDeliveryId(null, rawBody));
  });
});
