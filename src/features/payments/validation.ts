import { z } from "zod";

import { ORDER_NUMBER_PATTERN } from "@/features/checkout/order-number";
import { parseMoneyToCents } from "@/features/catalog/money";
import { MOBILE_MONEY_METHODS, LYNXPAY_PAYMENT_METHODS } from "@/server/payments/types";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

/**
 * LynxPay expects Tanzanian mobile numbers in international form without a plus sign.
 * Local input such as 0754 123 456 is normalised before it reaches the provider.
 */
export function normalizeTanzanianPhone(input: string): string | null {
  const compact = input.replace(/[\s()+.-]/g, "");
  const national = compact.startsWith("0") ? `255${compact.slice(1)}` : compact;

  return /^255[67]\d{8}$/.test(national) ? national : null;
}

const phoneField = z
  .string()
  .trim()
  .optional()
  .default("")
  .transform((value, context) => {
    if (!value) {
      return "";
    }

    const normalized = normalizeTanzanianPhone(value);

    if (!normalized) {
      context.addIssue({
        code: "custom",
        message: "Enter a Tanzanian mobile number, for example 0754 123 456.",
      });
      return z.NEVER;
    }

    return normalized;
  });

export const startPaymentSchema = z
  .object({
    orderNumber: z.string().regex(ORDER_NUMBER_PATTERN, "That order reference is invalid."),
    method: z.enum(LYNXPAY_PAYMENT_METHODS),
    phone: phoneField,
  })
  .superRefine((value, context) => {
    if (MOBILE_MONEY_METHODS.includes(value.method) && !value.phone) {
      context.addIssue({
        code: "custom",
        path: ["phone"],
        message: "A mobile number is required for mobile money.",
      });
    }
  });

export type StartPaymentInput = z.infer<typeof startPaymentSchema>;

const moneyField = z
  .string()
  .trim()
  .superRefine((value, context) => {
    const cents = parseMoneyToCents(value);

    if (cents === null || cents <= 0) {
      context.addIssue({
        code: "custom",
        message: "Enter a positive amount with up to two decimal places.",
      });
    }
  })
  .transform((value) => parseMoneyToCents(value) ?? 0);

export const refundSchema = z.object({
  orderNumber: z.string().regex(ORDER_NUMBER_PATTERN, "That order reference is invalid."),
  paymentId: z.uuid("That payment reference is invalid."),
  amountCents: moneyField,
  reason: z
    .string()
    .trim()
    .min(3, "Give a short reason for the refund.")
    .max(200, "Keep the reason under 200 characters."),
});

export type RefundInput = z.infer<typeof refundSchema>;

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date in YYYY-MM-DD form.")
  .transform((value, context) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime())) {
      context.addIssue({ code: "custom", message: "That date is invalid." });
      return z.NEVER;
    }

    return date;
  });

export const payoutSchema = z
  .object({
    vendorId: z.uuid("Choose a studio."),
    amountCents: moneyField,
    periodStart: isoDate,
    periodEnd: isoDate,
    note: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(200, "Keep the note under 200 characters.").optional(),
    ),
  })
  .superRefine((value, context) => {
    if (value.periodStart > value.periodEnd) {
      context.addIssue({
        code: "custom",
        path: ["periodEnd"],
        message: "The period end must not be before the start.",
      });
    }

    if (value.periodEnd.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
      context.addIssue({
        code: "custom",
        path: ["periodEnd"],
        message: "The period end cannot be in the future.",
      });
    }
  });

export type PayoutInput = z.infer<typeof payoutSchema>;

export const payoutActionSchema = z.object({
  payoutId: z.uuid("That payout reference is invalid."),
});
