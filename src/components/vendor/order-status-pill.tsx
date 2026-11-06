import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from "@/features/checkout/status";
import type { OrderStatus } from "@/generated/prisma/enums";

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return (
    <Badge
      tone={ORDER_STATUS_TONES[status]}
      className="rounded-full font-sans text-[0.625rem] font-medium tracking-normal normal-case"
    >
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
