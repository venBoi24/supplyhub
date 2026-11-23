"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { firstFieldErrors, formValue, type FormState } from "@/features/identity/form-state";
import { getServerI18n } from "@/i18n/server";
import { getServerEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging/logger";
import { canCheckout } from "@/server/auth/policies";
import { getSessionActor } from "@/server/auth/session";
import { getDatabase } from "@/server/db/client";
import { AUTH_RATE_LIMITS } from "@/server/security/auth-rate-limits";
import { consumeRateLimit } from "@/server/security/rate-limit";

import { CheckoutError, placeOrder, releaseExpiredReservations } from "./service";
import { createCheckoutAddressSchema } from "./validation";

export async function placeOrderAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await getSessionActor();
  const { t } = await getServerI18n();

  if (!actor) {
    redirect("/sign-in?next=%2Fcheckout");
  }

  if (!canCheckout(actor)) {
    return {
      status: "error",
      message: t("checkout.errors.customerOnly"),
    };
  }

  if (!consumeRateLimit(`checkout:user:${actor.id}`, AUTH_RATE_LIMITS.checkoutByUser)) {
    return {
      status: "error",
      message: t("checkout.errors.rateLimited"),
    };
  }

  const parsed = createCheckoutAddressSchema(t).safeParse({
    recipientName: formValue(formData, "recipientName"),
    contactEmail: formValue(formData, "contactEmail"),
    contactPhone: formValue(formData, "contactPhone"),
    addressLine1: formValue(formData, "addressLine1"),
    addressLine2: formValue(formData, "addressLine2"),
    city: formValue(formData, "city"),
    region: formValue(formData, "region"),
    postalCode: formValue(formData, "postalCode"),
    countryCode: formValue(formData, "countryCode"),
    deliveryMethod: formValue(formData, "deliveryMethod"),
    customerLatitude: formValue(formData, "customerLatitude"),
    customerLongitude: formValue(formData, "customerLongitude"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }

  const database = getDatabase();
  const cart = await database.cart.findUnique({
    where: { userId: actor.id },
    select: { id: true },
  });

  if (!cart) {
    return { status: "error", message: t("checkout.errors.cartEmpty") };
  }

  try {
    await releaseExpiredReservations(database);

    const placed = await placeOrder(database, {
      customerId: actor.id,
      cartId: cart.id,
      address: parsed.data,
      reservationMinutes: getServerEnv().CHECKOUT_RESERVATION_MINUTES,
    });

    logger.info("checkout.completed", {
      actorId: actor.id,
      orderNumber: placed.orderNumber,
      vendorCount: placed.vendorCount,
    });
    revalidatePath("/", "layout");
    redirect(`/orders/${placed.orderNumber}?placed=1`);
  } catch (error) {
    if (error instanceof CheckoutError) {
      revalidatePath("/cart");
      return {
        status: "error",
        message:
          error.details.length > 0 ? `${error.message} ${error.details.join(" ")}` : error.message,
      };
    }

    throw error;
  }
}
