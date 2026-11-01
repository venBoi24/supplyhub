import "server-only";

import { redirect } from "next/navigation";

import { safeNextPath } from "@/lib/security/safe-redirect";

import type { Actor } from "./actor";
import { canCheckout, canPerformAdminAction, isApprovedVendor } from "./policies";
import { getSessionActor } from "./session";

export async function requireActor(nextPath = "/account"): Promise<Actor> {
  const actor = await getSessionActor();

  if (!actor) {
    redirect(`/sign-in?next=${encodeURIComponent(safeNextPath(nextPath, "/account"))}`);
  }

  return actor;
}

export async function requireCustomer(nextPath = "/checkout"): Promise<Actor> {
  const actor = await requireActor(nextPath);

  if (!canCheckout(actor)) {
    redirect("/account?denied=checkout");
  }

  return actor;
}

export async function requireAdmin(): Promise<Actor> {
  const actor = await requireActor("/admin/vendors");

  if (!canPerformAdminAction(actor)) {
    redirect("/account?denied=admin");
  }

  return actor;
}

export async function requireApprovedVendor(
  nextPath = "/vendor",
): Promise<{ actor: Actor; vendorId: string }> {
  const actor = await requireActor(nextPath);

  if (actor.role === "ADMIN") {
    redirect("/admin/products");
  }

  if (!isApprovedVendor(actor) || !actor.vendor) {
    redirect("/vendor");
  }

  return { actor, vendorId: actor.vendor.id };
}
