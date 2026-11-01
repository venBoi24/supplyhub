import type { UserRole, UserStatus, VendorStatus } from "@/generated/prisma/enums";

export interface ActorVendor {
  id: string;
  status: VendorStatus;
}

export interface Actor {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  vendor: ActorVendor | null;
}

export interface OrderAccessResource {
  customerId: string;
  vendorIds: readonly string[];
}

export interface VendorOrderAccessResource {
  vendorId: string;
}
