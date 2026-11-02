"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { Prisma } from "@/generated/prisma/client";
import { mergeGuestCartIntoUserCart } from "@/features/cart/service";
import { logger } from "@/lib/logging/logger";
import { safeNextPath } from "@/lib/security/safe-redirect";
import { getPostSignInDestination } from "@/features/identity/sign-in-destination";
import { consumeAccountToken, issueAccountToken } from "@/server/auth/account-tokens";
import { signIn, signOut } from "@/server/auth/config";
import { hashPassword } from "@/server/auth/password";
import { getSessionActor } from "@/server/auth/session";
import { getDatabase } from "@/server/db/client";
import { deliverAccountEmail } from "@/server/email/account-email";
import { AUTH_RATE_LIMITS } from "@/server/security/auth-rate-limits";
import { consumeRateLimits, getClientAddress } from "@/server/security/rate-limit";

import { firstFieldErrors, formValue, type FormState } from "./form-state";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  verifyEmailSchema,
} from "./validation";

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function signInAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
    next: formValue(formData, "next") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }

  const address = await getClientAddress();
  const allowed = consumeRateLimits([
    { key: `sign-in:email:${parsed.data.email}`, rule: AUTH_RATE_LIMITS.signInByEmail },
    ...(address !== "unknown"
      ? [{ key: `sign-in:address:${address}`, rule: AUTH_RATE_LIMITS.signInByAddress }]
      : []),
  ]);

  if (!allowed) {
    return {
      status: "error",
      message: "Too many sign-in attempts. Wait a few minutes and try again.",
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
      redirectTo: safeNextPath(parsed.data.next, "/account"),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { status: "error", message: "Email or password is incorrect." };
    }

    throw error;
  }

  const account = await getDatabase().user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, vendor: { select: { status: true } } },
  });

  if (account) {
    await mergeGuestCartIntoUserCart(account.id);
  }

  redirect(getPostSignInDestination(parsed.data.next, account?.vendor?.status));
}

export async function signUpAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    name: formValue(formData, "name"),
    email: formValue(formData, "email"),
    phone: formValue(formData, "phone") || undefined,
    accountType: formValue(formData, "accountType"),
    password: formValue(formData, "password"),
    confirmPassword: formValue(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }

  const address = await getClientAddress();
  const allowed = consumeRateLimits([
    { key: `sign-up:email:${parsed.data.email}`, rule: AUTH_RATE_LIMITS.signUpByEmail },
    ...(address !== "unknown"
      ? [{ key: `sign-up:address:${address}`, rule: AUTH_RATE_LIMITS.signUpByAddress }]
      : []),
  ]);

  if (!allowed) {
    return {
      status: "error",
      message: "Too many sign-up attempts. Wait a little while and try again.",
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  let user: { id: string; email: string };

  try {
    user = await getDatabase().user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        passwordHash,
      },
      select: { id: true, email: true },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        status: "error",
        message:
          "We could not create an account with those details. If you already have an account, sign in or reset your password.",
      };
    }

    throw error;
  }

  try {
    const token = await issueAccountToken(user.id, "EMAIL_VERIFICATION");
    await deliverAccountEmail({ purpose: "verification", to: user.email, token });
  } catch (error) {
    logger.error("identity.verification_email_failed", { error });
  }

  await mergeGuestCartIntoUserCart(user.id);

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
      redirectTo: parsed.data.accountType === "SELLER" ? "/vendor/apply" : "/account?welcome=1",
    });
  } catch (error) {
    if (!(error instanceof AuthError)) {
      throw error;
    }

    return {
      status: "success",
      message: "Account created. Sign in to continue.",
    };
  }

  redirect(parsed.data.accountType === "SELLER" ? "/vendor/apply" : "/account?welcome=1");
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function signOutEverywhereAction(): Promise<void> {
  const actor = await getSessionActor();

  if (!actor) {
    redirect("/sign-in");
  }

  await getDatabase().user.update({
    where: { id: actor.id },
    data: { sessionVersion: { increment: 1 } },
  });

  await signOut({ redirectTo: "/sign-in?signout=all" });
}

export async function forgotPasswordAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formValue(formData, "email"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }

  const address = await getClientAddress();
  const allowed = consumeRateLimits([
    { key: `recovery:email:${parsed.data.email}`, rule: AUTH_RATE_LIMITS.recoveryByEmail },
    ...(address !== "unknown"
      ? [{ key: `recovery:address:${address}`, rule: AUTH_RATE_LIMITS.recoveryByAddress }]
      : []),
  ]);

  if (!allowed) {
    return {
      status: "error",
      message: "Too many reset requests. Wait a little while and try again.",
    };
  }

  const user = await getDatabase().user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, status: true },
  });

  if (user?.status === "ACTIVE") {
    try {
      const token = await issueAccountToken(user.id, "PASSWORD_RESET");
      await deliverAccountEmail({ purpose: "password-reset", to: user.email, token });
    } catch (error) {
      logger.error("identity.password_reset_email_failed", { error });
    }
  }

  return {
    status: "success",
    message: "If an account exists for that email, we sent a password reset link.",
  };
}

export async function resetPasswordAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formValue(formData, "token"),
    password: formValue(formData, "password"),
    confirmPassword: formValue(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }

  const address = await getClientAddress();

  if (
    !consumeRateLimits([{ key: `reset:address:${address}`, rule: AUTH_RATE_LIMITS.resetByAddress }])
  ) {
    return {
      status: "error",
      message: "Too many reset attempts. Wait a little while and try again.",
    };
  }

  const consumed = await consumeAccountToken(parsed.data.token, "PASSWORD_RESET");

  if (!consumed) {
    return {
      status: "error",
      message: "This reset link is invalid or has expired. Request a new one.",
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await getDatabase().user.update({
    where: { id: consumed.userId },
    data: {
      passwordHash,
      sessionVersion: { increment: 1 },
    },
  });

  redirect("/sign-in?reset=1");
}

export async function verifyEmailAction(formData: FormData): Promise<void> {
  const parsed = verifyEmailSchema.safeParse({
    token: formValue(formData, "token"),
  });

  if (!parsed.success) {
    redirect("/verify-email?status=invalid");
  }

  const address = await getClientAddress();

  if (
    !consumeRateLimits([
      { key: `verify:address:${address}`, rule: AUTH_RATE_LIMITS.verificationByAddress },
    ])
  ) {
    redirect("/verify-email?status=slow-down");
  }

  const consumed = await consumeAccountToken(parsed.data.token, "EMAIL_VERIFICATION");

  if (!consumed) {
    redirect("/verify-email?status=invalid");
  }

  await getDatabase().user.update({
    where: { id: consumed.userId },
    data: { emailVerifiedAt: new Date() },
  });

  const actor = await getSessionActor();

  redirect(actor?.id === consumed.userId ? "/account?verified=1" : "/sign-in?verified=1");
}

export async function resendVerificationAction(): Promise<void> {
  const actor = await getSessionActor();

  if (!actor) {
    redirect("/sign-in?next=/account");
  }

  if (
    !consumeRateLimits([{ key: `verify:resend:${actor.id}`, rule: AUTH_RATE_LIMITS.resendByUser }])
  ) {
    redirect("/account?verification=slow-down");
  }

  const user = await getDatabase().user.findUnique({
    where: { id: actor.id },
    select: { id: true, email: true, emailVerifiedAt: true, status: true },
  });

  if (user && !user.emailVerifiedAt && user.status === "ACTIVE") {
    try {
      const token = await issueAccountToken(user.id, "EMAIL_VERIFICATION");
      await deliverAccountEmail({ purpose: "verification", to: user.email, token });
    } catch (error) {
      logger.error("identity.verification_email_failed", { error });
    }
  }

  redirect("/account?verification=sent");
}
