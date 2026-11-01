import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { catalogHref, type CatalogQuery } from "@/features/catalog/search-params";

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
  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-4 border-t border-border py-6"
    >
      <p className="font-mono text-[0.625rem] tracking-[0.12em] text-muted-foreground uppercase">
        Page {page} of {pageCount}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={catalogHref(pathname, { ...query, page: page - 1 })} rel="prev">
              <ChevronLeft className="size-4" aria-hidden="true" />
              Previous
            </Link>
          </Button>
        ) : (
          <Button variant="secondary" size="sm" disabled>
            <ChevronLeft className="size-4" aria-hidden="true" />
            Previous
          </Button>
        )}
        {page < pageCount ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={catalogHref(pathname, { ...query, page: page + 1 })} rel="next">
              Next
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button variant="secondary" size="sm" disabled>
            Next
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </nav>
  );
}
