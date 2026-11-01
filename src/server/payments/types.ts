import type { PaymentProvider } from "@/generated/prisma/enums";

export const LYNXPAY_PAYMENT_METHODS = ["mpesa", "tigopesa", "airtel", "halopesa", "card"] as const;

export type LynxPayPaymentMethod = (typeof LYNXPAY_PAYMENT_METHODS)[number];

export const MOBILE_MONEY_METHODS: readonly LynxPayPaymentMethod[] = [
  "mpesa",
  "tigopesa",
  "airtel",
  "halopesa",
];

export type ProviderPaymentStatus =
  | "processing"
  | "completed"
  | "failed"
  | "expired"
  | "refunded"
  | "partially_refunded"
  | "disputed";

export interface GatewayPayment {
  providerPaymentId: string;
  externalId: string | null;
  amountMinor: number;
  feeMinor: number;
  netMinor: number;
  currency: string;
  status: ProviderPaymentStatus;
  paymentMethod: string | null;
  customerPhone: string | null;
  providerReference: string | null;
  checkoutUrl: string | null;
  failureReason: string | null;
  completedAt: Date | null;
}

export interface GatewayRefund {
  providerRefundId: string | null;
  status: string | null;
}

export interface CreatePaymentRequest {
  /** The amount the merchant should receive, expressed in our two-decimal minor units. */
  amountMinor: number;
  currency: string;
  phone?: string;
  method: LynxPayPaymentMethod;
  externalId: string;
  description: string;
  callbackUrl?: string;
  metadata?: Record<string, string>;
  idempotencyKey: string;
}

export interface PaymentGateway {
  readonly provider: PaymentProvider;
  createPayment(request: CreatePaymentRequest): Promise<GatewayPayment>;
  getPayment(providerPaymentId: string): Promise<GatewayPayment>;
  refundPayment(
    providerPaymentId: string,
    amountMinor: number,
    reason: string,
  ): Promise<GatewayRefund>;
}
