import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { VendorStatus } from "@/generated/prisma/enums";
import { getServerI18n } from "@/i18n/server";

const statusPresentation: Record<
  VendorStatus,
  { labelKey: string; tone: NonNullable<BadgeProps["tone"]> }
> = {
  PENDING: { labelKey: "studio.status.inReview", tone: "clay" },
  APPROVED: { labelKey: "vendor.approved", tone: "success" },
  REJECTED: { labelKey: "admin.rejected", tone: "danger" },
  SUSPENDED: { labelKey: "admin.suspended", tone: "neutral" },
};

export async function VendorStatusBadge({
  status,
  className,
}: {
  status: VendorStatus;
  className?: string;
}) {
  const { t } = await getServerI18n();
  const presentation = statusPresentation[status];

  return <Badge tone={presentation.tone}>{t(presentation.labelKey)}</Badge>;
}
