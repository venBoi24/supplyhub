import { z } from "zod";

import { MAX_CART_QUANTITY } from "./constants";

export const cartProductIdSchema = z.uuid("That object reference is invalid.");

export const cartQuantitySchema = z.coerce
  .number("Choose a quantity.")
  .int("Quantity must be a whole number.")
  .min(1, "Quantity must be at least 1.")
  .max(MAX_CART_QUANTITY, `Quantity cannot exceed ${MAX_CART_QUANTITY}.`);

export const cartMutationSchema = z.object({
  productId: cartProductIdSchema,
  quantity: cartQuantitySchema,
});
