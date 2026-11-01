"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { firstFieldErrors, formValue, type FormState } from "@/features/identity/form-state";
import { getServerEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging/logger";
import { canCheckout } from "@/server/auth/policies";
import { getSessionActor } from "@/server/auth/session";
import { getDatabase } from "@/server/db/client";
import { AUTH_RATE_LIMITS } from "@/server/security/auth-rate-limits";
import { consumeRateLimit } from "@/server/security/rate-limit";

import { CheckoutError, placeOrder, releaseExpiredReservations } from "./service";
import { checkoutAddressSchema } from "./validation";

export async function placeOrderAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await getSessionActor();

  if (!actor) {
    redirect("/sign-in?next=%2Fcheckout");
  }

  if (!canCheckout(actor)) {
    return {
      status: "error",
      message: "Only customer accounts can place orders. Sign in with a customer account.",
    };
  }

  if (!consumeRateLimit(`checkout:user:${actor.id}`, AUTH_RATE_LIMITS.checkoutByUser)) {
    return {
      status: "error",
      message: "Too many checkout attempts. Wait a few minutes and try again.",
    };
  }

  const parsed = checkoutAddressSchema.safeParse({
    recipientName: formValue(formData, "recipientName"),
    contactEmail: formValue(formData, "contactEmail"),
    contactPhone: formValue(formData, "contactPhone"),
    addressLine1: formValue(formData, "addressLine1"),
    addressLine2: formValue(formData, "addressLine2"),
    city: formValue(formData, "city"),
    region: formValue(formData, "region"),
    postalCode: formValue(formData, "postalCode"),
    countryCode: formValue(formData, "countryCode"),
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
    return { status: "error", message: "Your cart is empty. Add an object before checking out." };
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
          error.details.length > 0
            ? `${error.message} ${error.details.join(" ")}`
            : error.message,
      };
    }

    throw error;
  }
}
