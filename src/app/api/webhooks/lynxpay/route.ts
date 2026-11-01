import { NextResponse } from "next/server";

import { recordAndApplyPaymentEvent } from "@/features/payments/events";
import { logger } from "@/lib/logging/logger";
import { getDatabase } from "@/server/db/client";
import { getLynxPayConfig } from "@/server/payments/config";
import { lynxPayPaymentSchema, toGatewayPayment } from "@/server/payments/lynxpay/schema";
import { verifyLynxPayWebhook, webhookDeliveryId } from "@/server/payments/lynxpay/webhook";

const MAX_BODY_BYTES = 64 * 1024;

function tooLarge(request: Request): boolean {
  const declared = Number(request.headers.get("content-length") ?? "0");
  return Number.isFinite(declared) && declared > MAX_BODY_BYTES;
}

export async function POST(request: Request) {
  const config = getLynxPayConfig();

  if (!config.webhookSecret) {
    logger.warn("payment.webhook_not_configured");
    return NextResponse.json({ error: "Webhook verification is not configured." }, { status: 503 });
  }

  if (tooLarge(request)) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  const rawBody = await request.text();

  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  const verified = verifyLynxPayWebhook({
    rawBody,
    timestamp: request.headers.get("x-lynx-timestamp"),
    signature: request.headers.get("x-lynx-signature"),
    previousSignature: request.headers.get("x-lynx-signature-previous"),
    secret: config.webhookSecret,
    previousSecret: config.webhookSecretPrevious,
  });

  if (!verified) {
    logger.warn("payment.webhook_signature_invalid");
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = lynxPayPaymentSchema.safeParse(body);

  if (!parsed.success) {
    logger.warn("payment.webhook_payload_invalid");
    return NextResponse.json({ error: "Invalid payment payload." }, { status: 400 });
  }

  const payment = toGatewayPayment(parsed.data);
  const eventType = request.headers.get("x-lynx-event") ?? "payment.updated";
  const deliveryId = webhookDeliveryId(request.headers.get("x-lynx-delivery"), rawBody);

  try {
    const result = await recordAndApplyPaymentEvent(getDatabase(), {
      payment,
      eventType,
      deliveryId,
    });

    logger.info("payment.webhook_processed", {
      deliveryId,
      eventType,
      outcome: result.outcome,
      paymentId: result.paymentId,
    });

    return NextResponse.json({ received: true, outcome: result.outcome }, { status: 200 });
  } catch (error) {
    logger.error("payment.webhook_failed", { deliveryId, eventType, error });
    return NextResponse.json({ error: "Could not process the event." }, { status: 500 });
  }
}
