import type { DefaultSession } from "next-auth";

import type { UserRole, UserStatus, VendorStatus } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
      vendorId: string | null;
      vendorStatus: VendorStatus | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    sessionVersion?: number;
    role?: UserRole;
    status?: UserStatus;
    vendorId?: string | null;
    vendorStatus?: VendorStatus | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sessionVersion?: number;
    role?: UserRole;
    status?: UserStatus;
    vendorId?: string | null;
    vendorStatus?: VendorStatus | null;
  }
}
