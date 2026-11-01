import { describe, expect, it } from "vitest";

import type { Actor } from "@/server/auth/actor";
import {
  canApplyForVendor,
  canCheckout,
  canManageVendor,
  canPerformAdminAction,
  canReviewVendorApplication,
  canUpdateVendorOrder,
  canViewAccount,
  canViewCustomerOrder,
  canViewOrder,
  canViewVendorApplication,
  isActiveActor,
  isApprovedVendor,
} from "@/server/auth/policies";

const baseActor: Actor = {
  id: "user-base",
  name: "Base User",
  email: "base@example.com",
  role: "CUSTOMER",
  status: "ACTIVE",
  vendor: null,
};

const customer = baseActor;

const approvedVendor: Actor = {
  ...baseActor,
  id: "user-vendor-1",
  role: "VENDOR",
  vendor: { id: "vendor-1", status: "APPROVED" },
};

const otherApprovedVendor: Actor = {
  ...baseActor,
  id: "user-vendor-2",
  role: "VENDOR",
  vendor: { id: "vendor-2", status: "APPROVED" },
};

const pendingOwner: Actor = {
  ...baseActor,
  id: "user-pending",
  vendor: { id: "vendor-pending", status: "PENDING" },
};

const rejectedOwner: Actor = {
  ...baseActor,
  id: "user-rejected",
  role: "VENDOR",
  vendor: { id: "vendor-rejected", status: "REJECTED" },
};

const suspendedVendor: Actor = {
  ...approvedVendor,
  status: "SUSPENDED",
};

const vendorRoleWithoutVendor: Actor = {
  ...baseActor,
  role: "VENDOR",
  vendor: null,
};

const admin: Actor = {
  ...baseActor,
  id: "user-admin",
  role: "ADMIN",
};

const suspendedAdmin: Actor = {
  ...admin,
  status: "SUSPENDED",
};

describe("isActiveActor", () => {
  it("accepts only non-null active actors", () => {
    expect(isActiveActor(customer)).toBe(true);
    expect(isActiveActor(suspendedVendor)).toBe(false);
    expect(isActiveActor(null)).toBe(false);
  });
});

describe("isApprovedVendor", () => {
  it("requires the vendor role and an approved vendor record", () => {
    expect(isApprovedVendor(approvedVendor)).toBe(true);
    expect(isApprovedVendor(pendingOwner)).toBe(false);
    expect(isApprovedVendor(rejectedOwner)).toBe(false);
    expect(isApprovedVendor(vendorRoleWithoutVendor)).toBe(false);
  });
});

describe("canManageVendor", () => {
  it("lets an active admin manage any vendor", () => {
    expect(canManageVendor(admin, "vendor-1")).toBe(true);
    expect(canManageVendor(admin, "vendor-unknown")).toBe(true);
  });

  it("lets an approved vendor manage only its own studio", () => {
    expect(canManageVendor(approvedVendor, "vendor-1")).toBe(true);
    expect(canManageVendor(approvedVendor, "vendor-2")).toBe(false);
    expect(canManageVendor(otherApprovedVendor, "vendor-1")).toBe(false);
  });

  it("denies pending, rejected, suspended, and customer actors", () => {
    expect(canManageVendor(pendingOwner, "vendor-pending")).toBe(false);
    expect(canManageVendor(rejectedOwner, "vendor-rejected")).toBe(false);
    expect(canManageVendor(suspendedVendor, "vendor-1")).toBe(false);
    expect(canManageVendor(customer, "vendor-1")).toBe(false);
    expect(canManageVendor(vendorRoleWithoutVendor, "vendor-1")).toBe(false);
    expect(canManageVendor(null, "vendor-1")).toBe(false);
  });

  it("denies a suspended admin", () => {
    expect(canManageVendor(suspendedAdmin, "vendor-1")).toBe(false);
  });
});

describe("canViewVendorApplication", () => {
  it("lets admins view every application", () => {
    expect(canViewVendorApplication(admin, "vendor-pending")).toBe(true);
  });

  it("lets owners view their own application before approval", () => {
    expect(canViewVendorApplication(pendingOwner, "vendor-pending")).toBe(true);
    expect(canViewVendorApplication(rejectedOwner, "vendor-rejected")).toBe(true);
  });

  it("denies other vendors, customers, and suspended accounts", () => {
    expect(canViewVendorApplication(approvedVendor, "vendor-pending")).toBe(false);
    expect(canViewVendorApplication(customer, "vendor-pending")).toBe(false);
    expect(canViewVendorApplication(suspendedVendor, "vendor-1")).toBe(false);
    expect(canViewVendorApplication(null, "vendor-pending")).toBe(false);
  });
});

describe("canApplyForVendor", () => {
  it("allows an active customer with no vendor record", () => {
    expect(canApplyForVendor(customer)).toBe(true);
  });

  it("denies existing applications, vendor roles, admins, and suspended accounts", () => {
    expect(canApplyForVendor(pendingOwner)).toBe(false);
    expect(canApplyForVendor(approvedVendor)).toBe(false);
    expect(canApplyForVendor(vendorRoleWithoutVendor)).toBe(false);
    expect(canApplyForVendor(admin)).toBe(false);
    expect(canApplyForVendor(suspendedVendor)).toBe(false);
    expect(canApplyForVendor(null)).toBe(false);
  });
});

describe("canViewAccount", () => {
  it("allows only active users to view their own account", () => {
    expect(canViewAccount(customer, customer.id)).toBe(true);
    expect(canViewAccount(customer, "user-other")).toBe(false);
    expect(canViewAccount(admin, customer.id)).toBe(false);
    expect(canViewAccount(suspendedVendor, suspendedVendor.id)).toBe(false);
    expect(canViewAccount(null, customer.id)).toBe(false);
  });
});

describe("admin actions", () => {
  it("requires an active admin", () => {
    expect(canPerformAdminAction(admin)).toBe(true);
    expect(canReviewVendorApplication(admin)).toBe(true);
    expect(canPerformAdminAction(suspendedAdmin)).toBe(false);
    expect(canReviewVendorApplication(approvedVendor)).toBe(false);
    expect(canPerformAdminAction(customer)).toBe(false);
    expect(canPerformAdminAction(null)).toBe(false);
  });
});

describe("canViewOrder", () => {
  const order = { customerId: "user-base", vendorIds: ["vendor-1", "vendor-3"] };

  it("lets admins view any order", () => {
    expect(canViewOrder(admin, order)).toBe(true);
  });

  it("lets the customer view their own order", () => {
    expect(canViewOrder(customer, order)).toBe(true);
    expect(canViewOrder({ ...customer, id: "user-other" }, order)).toBe(false);
  });

  it("lets only approved vendors named on the order view it", () => {
    expect(canViewOrder(approvedVendor, order)).toBe(true);
    expect(canViewOrder(otherApprovedVendor, order)).toBe(false);
    expect(canViewOrder(pendingOwner, order)).toBe(false);
    expect(canViewOrder(suspendedVendor, order)).toBe(false);
  });

  it("denies guests", () => {
    expect(canViewOrder(null, order)).toBe(false);
  });
});

describe("canUpdateVendorOrder", () => {
  it("delegates to vendor management", () => {
    expect(canUpdateVendorOrder(approvedVendor, { vendorId: "vendor-1" })).toBe(true);
    expect(canUpdateVendorOrder(approvedVendor, { vendorId: "vendor-2" })).toBe(false);
    expect(canUpdateVendorOrder(pendingOwner, { vendorId: "vendor-pending" })).toBe(false);
    expect(canUpdateVendorOrder(admin, { vendorId: "vendor-2" })).toBe(true);
  });
});

describe("canCheckout", () => {
  it("allows active customers only", () => {
    expect(canCheckout(customer)).toBe(true);
    expect(canCheckout(approvedVendor)).toBe(false);
    expect(canCheckout(admin)).toBe(false);
    expect(canCheckout(suspendedVendor)).toBe(false);
    expect(canCheckout(null)).toBe(false);
  });
});

describe("canViewCustomerOrder", () => {
  it("allows the owner and admins", () => {
    expect(canViewCustomerOrder(customer, customer.id)).toBe(true);
    expect(canViewCustomerOrder(admin, customer.id)).toBe(true);
  });

  it("denies other customers, vendors, suspended accounts, and guests", () => {
    expect(canViewCustomerOrder({ ...customer, id: "user-other" }, customer.id)).toBe(false);
    expect(canViewCustomerOrder(approvedVendor, customer.id)).toBe(false);
    expect(canViewCustomerOrder(suspendedVendor, suspendedVendor.id)).toBe(false);
    expect(canViewCustomerOrder(suspendedAdmin, customer.id)).toBe(false);
    expect(canViewCustomerOrder(null, customer.id)).toBe(false);
  });
});
