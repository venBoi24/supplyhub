import { z } from "zod";

import { defaultTranslator, type Translator } from "@/i18n/dictionary";

import { MAX_CART_QUANTITY } from "./constants";

/**
 * Schema factories take a translator so server actions can emit field errors in
 * the visitor's selected locale. The module-level `*Schema` consts are the same
 * factories bound to English for tests and non-request callers.
 */
export const createCartProductIdSchema = (t: Translator) =>
  z.uuid({ error: t("validation.objectReferenceInvalid") });

export const createCartQuantitySchema = (t: Translator) =>
  z.coerce
    .number({ error: t("validation.quantityRequired") })
    .int({ error: t("validation.quantityWholeNumber") })
    .min(1, { error: t("validation.quantityMin", { min: 1 }) })
    .max(MAX_CART_QUANTITY, { error: t("validation.quantityMax", { max: MAX_CART_QUANTITY }) });

export const createCartMutationSchema = (t: Translator) =>
  z.object({
    productId: createCartProductIdSchema(t),
    quantity: createCartQuantitySchema(t),
  });

export const cartProductIdSchema = createCartProductIdSchema(defaultTranslator);
export const cartQuantitySchema = createCartQuantitySchema(defaultTranslator);
export const cartMutationSchema = createCartMutationSchema(defaultTranslator);
