import type { Actor, OrderAccessResource, VendorOrderAccessResource } from "@/server/auth/actor";

export function isActiveActor(actor: Actor | null): actor is Actor {
  return actor !== null && actor.status === "ACTIVE";
}

export function isApprovedVendor(actor: Actor): boolean {
  return actor.role === "VENDOR" && actor.vendor?.status === "APPROVED";
}

export function canManageVendor(actor: Actor | null, vendorId: string): boolean {
  if (!isActiveActor(actor)) return false;
  if (actor.role === "ADMIN") return true;
  return isApprovedVendor(actor) && actor.vendor?.id === vendorId;
}

export function canViewVendorApplication(actor: Actor | null, vendorId: string): boolean {
  if (!isActiveActor(actor)) return false;
  if (actor.role === "ADMIN") return true;
  return actor.vendor?.id === vendorId;
}

export function canApplyForVendor(actor: Actor | null): boolean {
  return isActiveActor(actor) && actor.role === "CUSTOMER" && actor.vendor === null;
}

export function canViewAccount(actor: Actor | null, userId: string): boolean {
  return isActiveActor(actor) && actor.id === userId;
}

export function canPerformAdminAction(actor: Actor | null): boolean {
  return isActiveActor(actor) && actor.role === "ADMIN";
}

/**
 * Operational accounts (vendor and admin) cannot place orders in this phase. Relax this
 * when marketplace policy for vendor or administrator purchasing is specified.
 */
export function canCheckout(actor: Actor | null): boolean {
  return isActiveActor(actor) && actor.role === "CUSTOMER";
}

export function canViewCustomerOrder(actor: Actor | null, customerId: string): boolean {
  if (!isActiveActor(actor)) return false;
  return actor.role === "ADMIN" || actor.id === customerId;
}

export function canReviewVendorApplication(actor: Actor | null): boolean {
  return canPerformAdminAction(actor);
}

export function canManageProduct(actor: Actor | null, productVendorId: string): boolean {
  return canManageVendor(actor, productVendorId);
}

export function canManageInventory(actor: Actor | null, productVendorId: string): boolean {
  return canManageVendor(actor, productVendorId);
}

export function canUploadProductImage(actor: Actor | null, productVendorId: string): boolean {
  return canManageVendor(actor, productVendorId);
}

export function canModerateCatalog(actor: Actor | null): boolean {
  return canPerformAdminAction(actor);
}

export function canManageCategories(actor: Actor | null): boolean {
  return canPerformAdminAction(actor);
}

export function canViewOrder(actor: Actor | null, order: OrderAccessResource): boolean {
  if (!isActiveActor(actor)) return false;
  if (actor.role === "ADMIN") return true;
  if (order.customerId === actor.id) return true;
  if (!isApprovedVendor(actor)) return false;
  return order.vendorIds.includes(actor.vendor?.id ?? "");
}

export function canUpdateVendorOrder(
  actor: Actor | null,
  order: VendorOrderAccessResource,
): boolean {
  return canManageVendor(actor, order.vendorId);
}
