import type { VendorStatus } from "@/generated/prisma/enums";
import { safeNextPath } from "@/lib/security/safe-redirect";

export function getPostSignInDestination(
  nextPath: string | undefined,
  role: "CUSTOMER" | "VENDOR" | "ADMIN" | null | undefined,
  vendorStatus: VendorStatus | null | undefined,
): string {
  if (role === "ADMIN") {
    if (nextPath) {
      const safe = safeNextPath(nextPath, "/admin");
      if (safe.startsWith("/admin")) {
        return safe;
      }
    }
    return "/admin";
  }

  if (nextPath) {
    return safeNextPath(nextPath, "/account");
  }

  if (vendorStatus === "REJECTED") {
    return "/vendor?appeal=1#appeal";
  }

  if (vendorStatus === "PENDING" || vendorStatus === "APPROVED") {
    return "/vendor";
  }

  return "/account";
}
