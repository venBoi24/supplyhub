import { z } from "zod";

import type { ProductSort } from "./types";

const SORT_VALUES = ["featured", "newest", "price-asc", "price-desc"] as const;

const firstValue = (value: unknown) => (Array.isArray(value) ? value[0] : value);

const textParam = z.preprocess(firstValue, z.string().trim().max(80)).catch("");

const slugParam = z
  .preprocess(
    firstValue,
    z
      .string()
      .trim()
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  )
  .catch("");

const sortParam = z.preprocess(firstValue, z.enum(SORT_VALUES)).catch("featured");

const pageParam = z.preprocess(firstValue, z.coerce.number().int().min(1).max(1000)).catch(1);

const catalogQuerySchema = z.object({
  q: textParam,
  sort: sortParam,
  vendor: slugParam,
  category: slugParam,
  page: pageParam,
});

export interface CatalogQuery {
  q?: string;
  sort: ProductSort;
  vendor?: string;
  category?: string;
  page: number;
}

export function parseCatalogQuery(
  params: Record<string, string | string[] | undefined>,
): CatalogQuery {
  const parsed = catalogQuerySchema.parse(params);

  return {
    q: parsed.q || undefined,
    sort: parsed.sort,
    vendor: parsed.vendor || undefined,
    category: parsed.category || undefined,
    page: parsed.page,
  };
}

export function catalogHref(pathname: string, query: Partial<CatalogQuery>): string {
  const params = new URLSearchParams();

  if (query.q) params.set("q", query.q);
  if (query.vendor) params.set("vendor", query.vendor);
  if (query.category) params.set("category", query.category);
  if (query.sort && query.sort !== "featured") params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));

  const search = params.toString();

  return search ? `${pathname}?${search}` : pathname;
}
