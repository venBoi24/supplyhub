import { Badge } from "@/components/ui/badge";
import type { ProductStatus } from "@/generated/prisma/enums";

const labels: Record<
  ProductStatus,
  { label: string; tone: "neutral" | "accent" | "clay" | "success" | "danger" }
> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  PENDING_REVIEW: { label: "In review", tone: "clay" },
  PUBLISHED: { label: "Published", tone: "success" },
  REJECTED: { label: "Changes requested", tone: "danger" },
  ARCHIVED: { label: "Archived", tone: "neutral" },
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const entry = labels[status];

  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}

export const productStatusLabels = Object.fromEntries(
  Object.entries(labels).map(([status, entry]) => [status, entry.label]),
) as Record<ProductStatus, string>;
