import type { PaymentStatus } from "@/generated/prisma/enums";

export type PaymentActionStatus = "idle" | "error" | "processing" | "redirect" | "paid";

export interface PaymentActionState {
  status: PaymentActionStatus;
  message?: string;
  fieldErrors?: Record<string, string>;
  checkoutUrl?: string;
  paymentStatus?: PaymentStatus;
}

export const initialPaymentActionState: PaymentActionState = { status: "idle" };
