"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ORDER_NUMBER_PATTERN } from "@/features/checkout/order-number";
import { releaseExpiredReservations } from "@/features/checkout/service";
import { firstFieldErrors, formValue } from "@/features/identity/form-state";
import { logger } from "@/lib/logging/logger";
import { canCheckout, canViewCustomerOrder } from "@/server/auth/policies";
import { getSessionActor } from "@/server/auth/session";
import { getDatabase } from "@/server/db/client";
import { getPaymentGateway } from "@/server/payments/gateway";
import { LynxPayRequestError } from "@/server/payments/lynxpay/client";
import { AUTH_RATE_LIMITS } from "@/server/security/auth-rate-limits";
import { consumeRateLimit } from "@/server/security/rate-limit";

import { PaymentError, startPayment, syncPaymentStatus } from "./service";
import type { PaymentActionState } from "./state";
import { startPaymentSchema } from "./validation";

function safeCheckoutUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      return null;
    }

    if (url.hostname !== "lynxpay.africa" && !url.hostname.endsWith(".lynxpay.africa")) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function startState(
  status: PaymentActionState["status"],
  message: string,
  extra: Partial<PaymentActionState> = {},
): PaymentActionState {
  return { status, message, ...extra };
}

export async function startPaymentAction(
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const actor = await getSessionActor();

  if (!actor) {
    redirect("/sign-in?next=%2Faccount%2Forders");
  }

  if (!canCheckout(actor)) {
    return startState("error", "Only customer accounts can pay for orders.");
  }

  if (!consumeRateLimit(`payment:user:${actor.id}`, AUTH_RATE_LIMITS.paymentByUser)) {
    return startState("error", "Too many payment attempts. Wait a few minutes and try again.");
  }

  const parsed = startPaymentSchema.safeParse({
    orderNumber: formValue(formData, "orderNumber"),
    method: formValue(formData, "method"),
    phone: formValue(formData, "phone"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  const database = getDatabase();

  try {
    await releaseExpiredReservations(database);

    const result = await startPayment(database, getPaymentGateway(), {
      orderNumber: parsed.data.orderNumber,
      customerId: actor.id,
      method: parsed.data.method,
      phone: parsed.data.phone,
    });

    revalidatePath(`/orders/${parsed.data.orderNumber}`);

    if (result.status === "SUCCEEDED") {
      logger.info("payment.succeeded_on_initiation", {
        orderNumber: parsed.data.orderNumber,
        paymentId: result.paymentId,
      });

      return startState("paid", "Payment received. Your order is confirmed.", {
        paymentStatus: result.status,
      });
    }

    if (parsed.data.method === "card" && result.checkoutUrl) {
      const checkoutUrl = safeCheckoutUrl(result.checkoutUrl);

      if (checkoutUrl) {
        return startState("redirect", "Redirecting you to LynxPay's secure card page.", {
          checkoutUrl,
          paymentStatus: result.status,
        });
      }

      logger.warn("payment.checkout_url_rejected", { paymentId: result.paymentId });
      return startState(
        "error",
        "LynxPay returned an unsafe checkout address. Contact support before paying by card.",
        { paymentStatus: result.status },
      );
    }

    return startState(
      "processing",
      parsed.data.method === "card"
        ? "LynxPay is preparing the card page. Try again in a moment."
        : "Approve the LynxPay prompt on your phone. This page checks the status automatically.",
      { paymentStatus: result.status },
    );
  } catch (error) {
    if (error instanceof PaymentError) {
      return startState("error", error.message);
    }

    logger.error("payment.start_failed", {
      orderNumber: parsed.data.orderNumber,
      error,
    });

    return startState("error", "Payment could not be started. Try again in a moment.");
  }
}

export async function refreshPaymentAction(orderNumber: string): Promise<PaymentActionState> {
  const actor = await getSessionActor();

  if (!actor) {
    return startState("error", "Sign in again to check this payment.");
  }

  if (!ORDER_NUMBER_PATTERN.test(orderNumber)) {
    return startState("error", "That order reference is invalid.");
  }

  if (!consumeRateLimit(`payment-poll:user:${actor.id}`, AUTH_RATE_LIMITS.paymentStatusByUser)) {
    return startState("processing", "Still checking. Give it a moment.");
  }

  const database = getDatabase();
  const order = await database.order.findUnique({
    where: { orderNumber },
    select: {
      customerId: true,
      payments: {
        orderBy: { attempt: "desc" },
        take: 1,
        select: { id: true, status: true, providerPaymentId: true, failureMessage: true },
      },
    },
  });

  if (!order || !canViewCustomerOrder(actor, order.customerId)) {
    return startState("error", "That order could not be found.");
  }

  const payment = order.payments[0];

  if (!payment) {
    return startState("processing", "Start a payment to continue.");
  }

  if (payment.status === "SUCCEEDED") {
    revalidatePath(`/orders/${orderNumber}`);
    return startState("paid", "Payment received. Your order is confirmed.", {
      paymentStatus: payment.status,
    });
  }

  if (payment.status === "FAILED" || payment.status === "EXPIRED") {
    return startState("error", payment.failureMessage ?? "The payment did not complete.", {
      paymentStatus: payment.status,
    });
  }

  if (!payment.providerPaymentId) {
    return startState("processing", "Waiting for LynxPay to create this payment.", {
      paymentStatus: payment.status,
    });
  }

  try {
    const status = await syncPaymentStatus(database, getPaymentGateway(), payment.id);

    if (status === "SUCCEEDED") {
      revalidatePath(`/orders/${orderNumber}`);
      return startState("paid", "Payment received. Your order is confirmed.", {
        paymentStatus: status,
      });
    }

    if (status === "FAILED" || status === "EXPIRED") {
      return startState("error", "The payment did not complete. Try again with another method.", {
        paymentStatus: status,
      });
    }

    return startState("processing", "LynxPay is still confirming this payment.", {
      paymentStatus: status ?? payment.status,
    });
  } catch (error) {
    if (error instanceof LynxPayRequestError) {
      return startState(
        "processing",
        "LynxPay is still confirming this payment. Keep this page open.",
        { paymentStatus: payment.status },
      );
    }

    logger.error("payment.status_refresh_failed", { orderNumber, error });
    return startState("error", "The payment status could not be checked. Try again.");
  }
}
