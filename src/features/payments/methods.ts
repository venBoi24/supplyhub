import { LYNXPAY_PAYMENT_METHODS, type LynxPayPaymentMethod } from "@/server/payments/types";

export const PAYMENT_METHOD_OPTIONS: ReadonlyArray<{
  value: LynxPayPaymentMethod;
  label: string;
  description: string;
}> = [
  {
    value: "mpesa",
    label: "M-Pesa",
    description: "Approve the prompt on your Vodacom line.",
  },
  {
    value: "tigopesa",
    label: "Mixx by Yas",
    description: "Approve the prompt on your Mixx line.",
  },
  {
    value: "airtel",
    label: "Airtel Money",
    description: "Approve the prompt on your Airtel line.",
  },
  {
    value: "halopesa",
    label: "HaloPesa",
    description: "Approve the prompt on your HaloPesa line.",
  },
  {
    value: "card",
    label: "Card",
    description: "Pay on LynxPay's secure card page.",
  },
];

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) {
    return "LynxPay";
  }

  return (
    PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label ??
    method.replaceAll("_", " ")
  );
}

export function isLynxPayMethod(value: string): value is LynxPayPaymentMethod {
  return (LYNXPAY_PAYMENT_METHODS as readonly string[]).includes(value);
}
