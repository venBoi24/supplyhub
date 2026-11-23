import type { Metadata } from "next";

import { PageShell } from "@/components/storefront/page-shell";
import { DeliveryPlanner } from "@/components/checkout/delivery-planner";
import { getCartView } from "@/features/cart/service";
import { getServerI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: t("nav.delivery"),
    description: t("checkout.pinMetaDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function DeliveryPage() {
  const [{ t }, view] = await Promise.all([getServerI18n(), getCartView()]);
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
        <p className="eyebrow text-muted-foreground">{t("nav.delivery")}</p>
        <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] sm:text-5xl">
          {t("checkout.pinTitle")}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
          {t("checkout.pinIntro")}
        </p>
      </div>

      <div className="mt-8 max-w-3xl">
        <DeliveryPlanner vendors={vendors} currency={view.currency || "TZS"} />
      </div>
    </PageShell>
  );
}

export const instant = false;
