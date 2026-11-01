import "server-only";

import { z } from "zod";

import { getLynxPayConfig, type LynxPayConfig } from "@/server/payments/config";
import type {
  CreatePaymentRequest,
  GatewayPayment,
  GatewayRefund,
  PaymentGateway,
} from "@/server/payments/types";

import { toProviderWholeUnits } from "./amounts";
import { lynxPayPaymentSchema, toGatewayPayment } from "./schema";
import { hmacSha256Hex } from "./signatures";

const REQUEST_TIMEOUT_MS = 12_000;

const refundSchema = z
  .object({
    id: z.string().optional(),
    refund_id: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough();

export class LynxPayRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus: number | null = null,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "LynxPayRequestError";
  }
}

function errorFromResponse(status: number, body: unknown): LynxPayRequestError {
  const parsed = z
    .object({
      success: z.literal(false),
      error: z.object({ code: z.string().optional(), message: z.string().optional() }),
    })
    .safeParse(body);

  const code = parsed.success ? (parsed.data.error.code ?? `HTTP_${status}`) : `HTTP_${status}`;
  const message = parsed.success
    ? (parsed.data.error.message ?? "LynxPay rejected the request.")
    : `LynxPay returned HTTP ${status}.`;

  return new LynxPayRequestError(code, message, status, status === 429 || status >= 500);
}

export class LynxPayClient implements PaymentGateway {
  readonly provider = "LYNXPAY" as const;
  private readonly config: LynxPayConfig;

  constructor(config: LynxPayConfig = getLynxPayConfig()) {
    this.config = config;
  }

  async createPayment(request: CreatePaymentRequest): Promise<GatewayPayment> {
    const data = await this.request(
      "/v1/payments",
      "POST",
      {
        amount: toProviderWholeUnits(request.amountMinor, request.currency),
        currency: request.currency,
        payment_method: request.method,
        external_id: request.externalId,
        description: request.description,
        ...(request.phone ? { phone: request.phone } : {}),
        ...(request.callbackUrl ? { callback_url: request.callbackUrl } : {}),
        ...(request.metadata ? { metadata: request.metadata } : {}),
      },
      request.idempotencyKey,
    );

    return toGatewayPayment(lynxPayPaymentSchema.parse(data));
  }

  async getPayment(providerPaymentId: string): Promise<GatewayPayment> {
    const data = await this.request(`/v1/payments/${encodeURIComponent(providerPaymentId)}`, "GET");

    return toGatewayPayment(lynxPayPaymentSchema.parse(data));
  }

  async refundPayment(
    providerPaymentId: string,
    amountMinor: number,
    reason: string,
  ): Promise<GatewayRefund> {
    const data = await this.request(
      `/v1/payments/${encodeURIComponent(providerPaymentId)}/refund`,
      "POST",
      { amount: toProviderWholeUnits(amountMinor, "TZS"), reason },
    );
    const refund = refundSchema.parse(data);

    return {
      providerRefundId: refund.refund_id ?? refund.id ?? null,
      status: refund.status ?? null,
    };
  }

  private async request(
    path: string,
    method: "GET" | "POST",
    body?: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<unknown> {
    const rawBody = body ? JSON.stringify(body) : "";
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const headers: Record<string, string> = {
      "X-Lynx-Key": this.config.apiKey,
      Accept: "application/json",
    };

    if (method === "POST") {
      headers["Content-Type"] = "application/json";
      headers["X-Lynx-Timestamp"] = timestamp;
      headers["X-Lynx-Signature"] = hmacSha256Hex(this.config.signingSecret, rawBody);
    }

    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    let response: Response;

    try {
      response = await fetch(`${this.config.baseUrl}${path}`, {
        method,
        headers,
        body: method === "POST" ? rawBody : undefined,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new LynxPayRequestError(
        "NETWORK_ERROR",
        "LynxPay could not be reached. Try again.",
        null,
        true,
      );
    }

    const text = await response.text();
    let parsed: unknown;

    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      throw new LynxPayRequestError(
        "INVALID_RESPONSE",
        "LynxPay returned an unreadable response.",
        response.status,
        response.status >= 500,
      );
    }

    if (!response.ok) {
      throw errorFromResponse(response.status, parsed);
    }

    const envelope = z.object({ success: z.literal(true), data: z.unknown() }).safeParse(parsed);

    if (!envelope.success) {
      throw new LynxPayRequestError(
        "INVALID_RESPONSE",
        "LynxPay returned an unexpected response.",
        response.status,
      );
    }

    return envelope.data.data;
  }
}
