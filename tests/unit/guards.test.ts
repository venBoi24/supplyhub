import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

vi.mock("@/server/auth/session", () => ({
  getSessionActor: vi.fn(),
}));

import { getSessionActor } from "@/server/auth/session";
import type { Actor } from "@/server/auth/actor";
import { requireActor, requireAdmin, requireApprovedVendor } from "@/server/auth/guards";

const getSessionActorMock = vi.mocked(getSessionActor);

const customer: Actor = {
  id: "user-customer",
  name: "Customer",
  email: "customer@example.com",
  role: "CUSTOMER",
  status: "ACTIVE",
  vendor: null,
};

const admin: Actor = {
  ...customer,
  id: "user-admin",
  role: "ADMIN",
};

const suspendedAdmin: Actor = {
  ...admin,
  status: "SUSPENDED",
};

const approvedVendor: Actor = {
  ...customer,
  id: "user-vendor",
  role: "VENDOR",
  vendor: { id: "vendor-1", status: "APPROVED" },
};

const pendingVendor: Actor = {
  ...customer,
  id: "user-pending",
  role: "VENDOR",
  vendor: { id: "vendor-pending", status: "PENDING" },
};

describe("requireActor", () => {
  beforeEach(() => {
    getSessionActorMock.mockReset();
  });

  it("returns the current actor", async () => {
    getSessionActorMock.mockResolvedValue(customer);

    await expect(requireActor()).resolves.toEqual(customer);
  });

  it("sends guests to sign in with a safe next path", async () => {
    getSessionActorMock.mockResolvedValue(null);

    await expect(requireActor("/vendor?submitted=1")).rejects.toThrow(
      "redirect:/sign-in?next=%2Fvendor%3Fsubmitted%3D1",
    );
  });

  it("replaces unsafe next paths with the account fallback", async () => {
    getSessionActorMock.mockResolvedValue(null);

    await expect(requireActor("https://evil.example/steal")).rejects.toThrow(
      "redirect:/sign-in?next=%2Faccount",
    );
  });
});

describe("requireAdmin", () => {
  beforeEach(() => {
    getSessionActorMock.mockReset();
  });

  it("returns an active admin", async () => {
    getSessionActorMock.mockResolvedValue(admin);

    await expect(requireAdmin()).resolves.toEqual(admin);
  });

  it("denies customers and sends them to the account page", async () => {
    getSessionActorMock.mockResolvedValue(customer);

    await expect(requireAdmin()).rejects.toThrow("redirect:/account?denied=admin");
  });

  it("denies suspended admins", async () => {
    getSessionActorMock.mockResolvedValue(suspendedAdmin);

    await expect(requireAdmin()).rejects.toThrow("redirect:/account?denied=admin");
  });

  it("sends guests to sign in with the admin path preserved", async () => {
    getSessionActorMock.mockResolvedValue(null);

    await expect(requireAdmin()).rejects.toThrow("redirect:/sign-in?next=%2Fadmin%2Fvendors");
  });
});

describe("requireApprovedVendor", () => {
  beforeEach(() => {
    getSessionActorMock.mockReset();
  });

  it("returns the actor and their own vendor id", async () => {
    getSessionActorMock.mockResolvedValue(approvedVendor);

    await expect(requireApprovedVendor()).resolves.toEqual({
      actor: approvedVendor,
      vendorId: "vendor-1",
    });
  });

  it("redirects pending and unaffiliated vendors to the studio gate", async () => {
    getSessionActorMock.mockResolvedValue(pendingVendor);
    await expect(requireApprovedVendor()).rejects.toThrow("redirect:/vendor");

    getSessionActorMock.mockResolvedValue(customer);
    await expect(requireApprovedVendor()).rejects.toThrow("redirect:/vendor");
  });

  it("sends admins to the admin catalog instead of a studio", async () => {
    getSessionActorMock.mockResolvedValue(admin);

    await expect(requireApprovedVendor()).rejects.toThrow("redirect:/admin/products");
  });

  it("preserves the requested studio path for guests", async () => {
    getSessionActorMock.mockResolvedValue(null);

    await expect(requireApprovedVendor("/vendor/products/new")).rejects.toThrow(
      "redirect:/sign-in?next=%2Fvendor%2Fproducts%2Fnew",
    );
  });
});
