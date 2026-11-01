import type { VendorStatus } from "@/generated/prisma/enums";
import { safeNextPath } from "@/lib/security/safe-redirect";

export function getPostSignInDestination(
  nextPath: string | undefined,
  vendorStatus: VendorStatus | null | undefined,
): string {
  if (!nextPath && vendorStatus === "REJECTED") {
    return "/vendor?appeal=1#appeal";
  }

  return safeNextPath(nextPath, "/account");
}
