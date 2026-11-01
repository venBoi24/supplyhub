import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { VendorStatus } from "@/generated/prisma/enums";

const statusPresentation: Record<
  VendorStatus,
  { label: string; tone: NonNullable<BadgeProps["tone"]> }
> = {
  PENDING: { label: "Under review", tone: "clay" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  SUSPENDED: { label: "Suspended", tone: "neutral" },
};

export function VendorStatusBadge({
  status,
  className,
}: {
  status: VendorStatus;
  className?: string;
}) {
  const presentation = statusPresentation[status];

  return (
    <Badge tone={presentation.tone} className={className}>
      {presentation.label}
    </Badge>
  );
}
