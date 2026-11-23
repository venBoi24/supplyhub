import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABEL_KEYS, ORDER_STATUS_TONES } from "@/features/checkout/status";
import type { OrderStatus } from "@/generated/prisma/enums";
import { getServerI18n } from "@/i18n/server";

export async function OrderStatusPill({ status }: { status: OrderStatus }) {
  const { t } = await getServerI18n();

  return (
    <Badge
      tone={ORDER_STATUS_TONES[status]}
      className="rounded-full font-sans text-[0.625rem] font-medium tracking-normal normal-case"
    >
      {t(ORDER_STATUS_LABEL_KEYS[status])}
    </Badge>
  );
}
