"use server";

import { revalidatePath } from "next/cache";

import { formatMoney } from "@/features/catalog/money";
import { firstFieldErrors, formValue, type FormState } from "@/features/identity/form-state";
import { getServerI18n } from "@/i18n/server";
import { logger } from "@/lib/logging/logger";
import { canPerformAdminAction } from "@/server/auth/policies";
import { getSessionActor } from "@/server/auth/session";
import { getDatabase } from "@/server/db/client";
import { getPaymentGateway } from "@/server/payments/gateway";
import { AUTH_RATE_LIMITS } from "@/server/security/auth-rate-limits";
import { consumeRateLimit } from "@/server/security/rate-limit";

import {
  PaymentError,
  createPayout,
  markPayoutPaid,
  reconcilePayout,
  refundPayment,
} from "./service";
import { createPayoutActionSchema, createPayoutSchema, createRefundSchema } from "./validation";

async function requireAdminActor() {
  const actor = await getSessionActor();

  if (!actor || !canPerformAdminAction(actor)) {
    return null;
  }

  return actor;
}

/**
 * `PaymentError` carries a provider or ledger message that is not part of the
 * i18n dictionaries, so it is passed through unchanged. That is a pre-existing
 * information-leak concern for a separate review rather than something to
 * translate here.
 */

export async function refundPaymentAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { t } = await getServerI18n();
  const actor = await requireAdminActor();

  if (!actor) {
    return { status: "error", message: t("admin.errors.accessRequired") };
  }

  if (!consumeRateLimit(`refund:admin:${actor.id}`, AUTH_RATE_LIMITS.refundByAdmin)) {
    return { status: "error", message: t("admin.errors.refundRateLimited") };
  }

  const parsed = createRefundSchema(t).safeParse({
    orderNumber: formValue(formData, "orderNumber"),
    paymentId: formValue(formData, "paymentId"),
    amountCents: formValue(formData, "amount"),
    reason: formValue(formData, "reason"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }

  try {
    const result = await refundPayment(getDatabase(), getPaymentGateway(), {
      orderNumber: parsed.data.orderNumber,
      paymentId: parsed.data.paymentId,
      amountCents: parsed.data.amountCents,
      reason: parsed.data.reason,
      adminId: actor.id,
    });

    revalidatePath("/admin/payments");
    revalidatePath("/admin/payouts");
    revalidatePath(`/orders/${parsed.data.orderNumber}`);

    logger.info("payment.refund_recorded", {
      orderNumber: parsed.data.orderNumber,
      paymentId: parsed.data.paymentId,
      refundId: result.refundId,
      amountCents: parsed.data.amountCents,
    });

    return {
      status: "success",
      message: t("admin.success.refundRecorded", {
        amount: formatMoney(parsed.data.amountCents, "TZS"),
      }),
    };
  } catch (error) {
    if (error instanceof PaymentError) {
      return { status: "error", message: error.message };
    }

    logger.error("payment.refund_action_failed", { error });
    return { status: "error", message: t("admin.errors.refundRecordFailed") };
  }
}

export async function createPayoutAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { t } = await getServerI18n();
  const actor = await requireAdminActor();

  if (!actor) {
    return { status: "error", message: t("admin.errors.accessRequired") };
  }

  if (!consumeRateLimit(`payout:admin:${actor.id}`, AUTH_RATE_LIMITS.payoutByAdmin)) {
    return { status: "error", message: t("admin.errors.payoutRateLimited") };
  }

  const parsed = createPayoutSchema(t).safeParse({
    vendorId: formValue(formData, "vendorId"),
    amountCents: formValue(formData, "amount"),
    periodStart: formValue(formData, "periodStart"),
    periodEnd: formValue(formData, "periodEnd"),
    note: formValue(formData, "note"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }

  try {
    const payout = await createPayout(getDatabase(), {
      vendorId: parsed.data.vendorId,
      amountCents: parsed.data.amountCents,
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
      note: parsed.data.note ?? null,
      adminId: actor.id,
    });

    revalidatePath("/admin/payouts");

    return {
      status: "success",
      message: t("admin.success.payoutRecorded", {
        reference: payout.reference,
        amount: formatMoney(payout.amountCents, payout.currency),
      }),
    };
  } catch (error) {
    if (error instanceof PaymentError) {
      return { status: "error", message: error.message };
    }

    logger.error("payment.payout_action_failed", { error });
    return { status: "error", message: t("admin.errors.payoutRecordFailed") };
  }
}

export async function markPayoutPaidAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { t } = await getServerI18n();
  const actor = await requireAdminActor();

  if (!actor) {
    return { status: "error", message: t("admin.errors.accessRequired") };
  }

  if (!consumeRateLimit(`payout:admin:${actor.id}`, AUTH_RATE_LIMITS.payoutByAdmin)) {
    return { status: "error", message: t("admin.errors.payoutRateLimited") };
  }

  const parsed = createPayoutActionSchema(t).safeParse({
    payoutId: formValue(formData, "payoutId"),
  });

  if (!parsed.success) {
    return { status: "error", message: t("validation.payoutReferenceInvalid") };
  }

  try {
    await markPayoutPaid(getDatabase(), parsed.data.payoutId, actor.id);
    revalidatePath("/admin/payouts");
    return { status: "success", message: t("admin.success.payoutMarkedPaid") };
  } catch (error) {
    if (error instanceof PaymentError) {
      return { status: "error", message: error.message };
    }

    logger.error("payment.payout_paid_action_failed", { error });
    return { status: "error", message: t("admin.errors.payoutUpdateFailed") };
  }
}

export async function reconcilePayoutAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { t } = await getServerI18n();
  const actor = await requireAdminActor();

  if (!actor) {
    return { status: "error", message: t("admin.errors.accessRequired") };
  }

  if (!consumeRateLimit(`payout:admin:${actor.id}`, AUTH_RATE_LIMITS.payoutByAdmin)) {
    return { status: "error", message: t("admin.errors.payoutRateLimited") };
  }

  const parsed = createPayoutActionSchema(t).safeParse({
    payoutId: formValue(formData, "payoutId"),
  });

  if (!parsed.success) {
    return { status: "error", message: t("validation.payoutReferenceInvalid") };
  }

  try {
    await reconcilePayout(getDatabase(), parsed.data.payoutId, actor.id);
    revalidatePath("/admin/payouts");
    return { status: "success", message: t("admin.success.payoutReconciled") };
  } catch (error) {
    if (error instanceof PaymentError) {
      return { status: "error", message: error.message };
    }

    logger.error("payment.payout_reconcile_action_failed", { error });
    return { status: "error", message: t("admin.errors.payoutReconcileFailed") };
  }
}
