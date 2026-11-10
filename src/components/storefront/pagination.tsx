"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { catalogHref, type CatalogQuery } from "@/features/catalog/search-params";
import { useT } from "@/i18n/client";

export function Pagination({
  pathname,
  query,
  page,
  pageCount,
}: {
  pathname: string;
  query: CatalogQuery;
  page: number;
  pageCount: number;
}) {
  const t = useT();

  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav
      aria-label={t("common.pagination")}
      className="flex flex-wrap items-center justify-between gap-4 border-t border-border py-6"
    >
      <p className="font-mono text-[0.625rem] tracking-[0.12em] text-muted-foreground uppercase">
        {t("products.page", { page, pages: pageCount })}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={catalogHref(pathname, { ...query, page: page - 1 })} rel="prev">
              <ChevronLeft className="size-4" aria-hidden="true" />
              {t("common.previous")}
            </Link>
          </Button>
        ) : (
          <Button variant="secondary" size="sm" disabled>
            <ChevronLeft className="size-4" aria-hidden="true" />
            {t("common.previous")}
          </Button>
        )}
        {page < pageCount ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={catalogHref(pathname, { ...query, page: page + 1 })} rel="next">
              {t("common.next")}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button variant="secondary" size="sm" disabled>
            {t("common.next")}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </nav>
  );
}
