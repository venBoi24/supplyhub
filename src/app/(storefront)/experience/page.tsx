import type { Metadata } from "next";
import { Suspense } from "react";

import { listProducts } from "@/features/catalog/queries";
import { ExperienceCenter } from "@/features/experience/experience-center";
import type { ExperienceTab } from "@/features/experience/types";

export const metadata: Metadata = {
  title: "Buy with confidence",
  description:
    "Try SupplyHub buyer protection end to end: protected payment, live courier tracking with a hand-over code, returns, verified reviews, studio chat, wishlist alerts and account security.",
  alternates: { canonical: "/experience" },
};

const TABS: ExperienceTab[] = [
  "shop",
  "orders",
  "protection",
  "reviews",
  "inbox",
  "security",
  "saved",
  "alerts",
];

function parseTab(value: string | string[] | undefined): ExperienceTab {
  const first = Array.isArray(value) ? value[0] : value;
  return TABS.includes(first as ExperienceTab) ? (first as ExperienceTab) : "shop";
}

export default function ExperiencePage({ searchParams }: PageProps<"/experience">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6" />}>
      <ExperienceContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ExperienceContent({
  searchParams,
}: {
  searchParams: PageProps<"/experience">["searchParams"];
}) {
  const params = await searchParams;
  const products = await listProducts({ limit: 48 });

  return <ExperienceCenter products={products} initialTab={parseTab(params.tab)} />;
}
