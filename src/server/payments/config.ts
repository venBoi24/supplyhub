import "server-only";

import { getServerEnv } from "@/lib/config/env";

/**
 * These are the public sandbox credentials published by LynxPay for integration testing.
 * They only reach the provider's simulation environment and are never used in production.
 */
const SANDBOX_DEMO_API_KEY = "lynx_test_sk_demo_public_key_for_testing_only";
const SANDBOX_DEMO_SIGNING_SECRET = "lynx_demo_signing_secret_public";
const DEFAULT_BASE_URL = "https://api.lynxpay.africa";

export class PaymentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentConfigurationError";
  }
}

export interface LynxPayConfig {
  apiKey: string;
  signingSecret: string;
  webhookSecret: string | null;
  webhookSecretPrevious: string | null;
  baseUrl: string;
}

export function getLynxPayConfig(): LynxPayConfig {
  const env = getServerEnv();
  const isProduction = env.NODE_ENV === "production";
  const apiKey =
    env.LYNXPAY_API_KEY ?? env.lynpay_api_key ?? (isProduction ? undefined : SANDBOX_DEMO_API_KEY);
  const signingSecret =
    env.LYNXPAY_SIGNING_SECRET ?? (isProduction ? undefined : SANDBOX_DEMO_SIGNING_SECRET);

  if (!apiKey || !signingSecret) {
    throw new PaymentConfigurationError(
      "LynxPay is not configured. Set LYNXPAY_API_KEY and LYNXPAY_SIGNING_SECRET.",
    );
  }

  return {
    apiKey,
    signingSecret,
    webhookSecret: env.LYNXPAY_WEBHOOK_SECRET ?? env.lynxpay_webhook_api_key ?? null,
    webhookSecretPrevious: env.LYNXPAY_WEBHOOK_SECRET_PREVIOUS ?? null,
    baseUrl: (env.LYNXPAY_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, ""),
  };
}

export function isLynxPayWebhookConfigured(): boolean {
  return getLynxPayConfig().webhookSecret !== null;
}
