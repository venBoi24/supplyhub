import type { Metadata } from "next";

import { PageShell } from "@/components/storefront/page-shell";
import { SectionHeading } from "@/components/storefront/section-heading";

export const metadata: Metadata = {
  title: "Delivery",
  description: "Choose pickup from a studio or delivery to your address at checkout.",
  robots: { index: false, follow: false },
};

export default function DeliveryPage() {
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div className="border-b border-border pb-8">
        <p className="eyebrow text-muted-foreground">Delivery</p>
        <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] sm:text-5xl">
          Pickup or delivery
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
          At checkout, choose whether to collect an object from its studio or have it delivered.
          Delivery distance and price are calculated from your location to each studio.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-6">
          <SectionHeading
            eyebrow="Pickup"
            title="Collect from the studio"
            description="Choose pickup when you want to visit the studio directly. There is no delivery fee."
          />
        </section>
        <section className="rounded-xl border border-border bg-surface p-6">
          <SectionHeading
            eyebrow="Delivery"
            title="Delivered to your address"
            description="Choose delivery to see the distance in kilometres and the delivery price before placing the order."
          />
        </section>
      </div>
    </PageShell>
  );
}
