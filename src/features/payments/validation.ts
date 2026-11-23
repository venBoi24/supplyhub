import { z } from "zod";

import { ORDER_NUMBER_PATTERN } from "@/features/checkout/order-number";
import { parseMoneyToCents } from "@/features/catalog/money";
import { defaultTranslator, type Translator } from "@/i18n/dictionary";
import { MOBILE_MONEY_METHODS, LYNXPAY_PAYMENT_METHODS } from "@/server/payments/types";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

/**
 * Schema factories take a translator so server actions can emit field errors in
 * the visitor's selected locale. The module-level `*Schema` consts below are the
 * same factories bound to English for non-request callers and tests.
 */

/**
 * LynxPay expects Tanzanian mobile numbers in international form without a plus sign.
 * Local input such as 0754 123 456 is normalised before it reaches the provider.
 */
export function normalizeTanzanianPhone(input: string): string | null {
  const compact = input.replace(/[\s()+.-]/g, "");
  const national = compact.startsWith("0") ? `255${compact.slice(1)}` : compact;

  return /^255[67]\d{8}$/.test(national) ? national : null;
}

const createPhoneField = (t: Translator) =>
  z
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
          message: t("validation.tanzanianMobileExample"),
        });
        return z.NEVER;
      }

      return normalized;
    });

export const createStartPaymentSchema = (t: Translator) =>
  z
    .object({
      orderNumber: z.string().regex(ORDER_NUMBER_PATTERN, {
        error: t("validation.orderReferenceInvalid"),
      }),
      method: z.enum(LYNXPAY_PAYMENT_METHODS),
      phone: createPhoneField(t),
    })
    .superRefine((value, context) => {
      if (MOBILE_MONEY_METHODS.includes(value.method) && !value.phone) {
        context.addIssue({
          code: "custom",
          path: ["phone"],
          message: t("validation.mobileNumberRequiredForMoMo"),
        });
      }
    });

export const startPaymentSchema = createStartPaymentSchema(defaultTranslator);

export type StartPaymentInput = z.infer<typeof startPaymentSchema>;

const createMoneyField = (t: Translator) =>
  z
    .string()
    .trim()
    .superRefine((value, context) => {
      const cents = parseMoneyToCents(value);

      if (cents === null || cents <= 0) {
        context.addIssue({
          code: "custom",
          message: t("validation.positiveAmountTwoDecimals"),
        });
      }
    })
    .transform((value) => parseMoneyToCents(value) ?? 0);

export const createRefundSchema = (t: Translator) =>
  z.object({
    orderNumber: z.string().regex(ORDER_NUMBER_PATTERN, {
      error: t("validation.orderReferenceInvalid"),
    }),
    paymentId: z.uuid({ error: t("validation.paymentReferenceInvalid") }),
    amountCents: createMoneyField(t),
    reason: z
      .string()
      .trim()
      .min(3, { error: t("validation.refundReasonRequired") })
      .max(200, { error: t("validation.refundReasonMax", { max: 200 }) }),
  });

export const refundSchema = createRefundSchema(defaultTranslator);

export type RefundInput = z.infer<typeof refundSchema>;

const createIsoDate = (t: Translator) =>
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: t("validation.dateFormatIso") })
    .transform((value, context) => {
      const date = new Date(`${value}T00:00:00.000Z`);

      if (Number.isNaN(date.getTime())) {
        context.addIssue({ code: "custom", message: t("validation.dateInvalid") });
        return z.NEVER;
      }

      return date;
    });

export const createPayoutSchema = (t: Translator) =>
  z
    .object({
      vendorId: z.uuid({ error: t("validation.chooseStudio") }),
      amountCents: createMoneyField(t),
      periodStart: createIsoDate(t),
      periodEnd: createIsoDate(t),
      note: z.preprocess(
        emptyToUndefined,
        z
          .string()
          .trim()
          .max(200, { error: t("validation.payoutNoteMax", { max: 200 }) })
          .optional(),
      ),
    })
    .superRefine((value, context) => {
      if (value.periodStart > value.periodEnd) {
        context.addIssue({
          code: "custom",
          path: ["periodEnd"],
          message: t("validation.periodEndBeforeStart"),
        });
      }

      if (value.periodEnd.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
        context.addIssue({
          code: "custom",
          path: ["periodEnd"],
          message: t("validation.periodEndFuture"),
        });
      }
    });

export const payoutSchema = createPayoutSchema(defaultTranslator);

export type PayoutInput = z.infer<typeof payoutSchema>;

export const createPayoutActionSchema = (t: Translator) =>
  z.object({
    payoutId: z.uuid({ error: t("validation.payoutReferenceInvalid") }),
  });

export const payoutActionSchema = createPayoutActionSchema(defaultTranslator);
