import type { VendorStatus } from "@/generated/prisma/enums";
import { safeNextPath } from "@/lib/security/safe-redirect";

export function getPostSignInDestination(
  nextPath: string | undefined,
  vendorStatus: VendorStatus | null | undefined,
): string {
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
