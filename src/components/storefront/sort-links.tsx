"use client";

import Link from "next/link";

import { catalogHref, type CatalogQuery } from "@/features/catalog/search-params";
import type { ProductSort } from "@/features/catalog/types";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

const options: readonly { value: ProductSort; labelKey: string }[] = [
  { value: "featured", labelKey: "common.featured" },
  { value: "newest", labelKey: "common.newest" },
  { value: "price-asc", labelKey: "common.priceAsc" },
  { value: "price-desc", labelKey: "common.priceDesc" },
];

export function SortLinks({ pathname, query }: { pathname: string; query: CatalogQuery }) {
  const t = useT();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="eyebrow hidden text-muted-foreground sm:inline">{t("common.sort")}</span>
      <nav aria-label={t("common.sortObjects")} className="flex flex-wrap items-center gap-1">
        {options.map((option) => {
          const active = query.sort === option.value;

          return (
            <Link
              key={option.value}
              href={catalogHref(pathname, { ...query, sort: option.value })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-sm px-2 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                active
                  ? "bg-surface-muted font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(option.labelKey)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
