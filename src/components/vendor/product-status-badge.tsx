import { Badge } from "@/components/ui/badge";
import type { ProductStatus } from "@/generated/prisma/enums";
import { getServerI18n } from "@/i18n/server";

const STATUS_META: Record<
  ProductStatus,
  { labelKey: string; tone: "neutral" | "accent" | "clay" | "success" | "danger" }
> = {
  DRAFT: { labelKey: "studio.status.draft", tone: "neutral" },
  PENDING_REVIEW: { labelKey: "studio.status.inReview", tone: "clay" },
  PUBLISHED: { labelKey: "studio.status.published", tone: "success" },
  REJECTED: { labelKey: "studio.status.changesRequested", tone: "danger" },
  ARCHIVED: { labelKey: "studio.status.archived", tone: "neutral" },
};

export async function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const { t } = await getServerI18n();
  const entry = STATUS_META[status];

  return <Badge tone={entry.tone}>{t(entry.labelKey)}</Badge>;
}
