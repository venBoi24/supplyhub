import type { Metadata } from "next";

import { PageShell } from "@/components/storefront/page-shell";
import { DeliveryPlanner } from "@/components/checkout/delivery-planner";
import { getCartView } from "@/features/cart/service";

export const metadata: Metadata = {
  title: "Delivery",
  description: "Pin your delivery location and see delivery prices by distance.",
  robots: { index: false, follow: false },
};

export default async function DeliveryPage() {
  const view = await getCartView();
  const vendors = [
    ...new Map(
      view.lines.map((line) => [
        line.vendorId,
        {
          id: line.vendorId,
          name: line.vendorName,
          latitude: line.vendorLatitude,
          longitude: line.vendorLongitude,
        },
      ]),
    ).values(),
  ];

  return (
    <PageShell className="pt-10 sm:pt-14">
      <div className="border-b border-border pb-8">
        <p className="eyebrow text-muted-foreground">Delivery</p>
        <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] sm:text-5xl">
          Pin your delivery location
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
          Use your location to pin where the order should be delivered. Delivery prices are
          calculated from your location to each studio in your cart.
        </p>
      </div>

      <div className="mt-8 max-w-3xl">
        <DeliveryPlanner vendors={vendors} currency={view.currency || "TZS"} />
      </div>
    </PageShell>
  );
}
