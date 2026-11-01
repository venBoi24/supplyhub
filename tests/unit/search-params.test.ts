import { describe, expect, it } from "vitest";

import { catalogHref, parseCatalogQuery } from "@/features/catalog/search-params";

describe("parseCatalogQuery", () => {
  it("returns safe defaults for empty params", () => {
    expect(parseCatalogQuery({})).toEqual({
      q: undefined,
      sort: "featured",
      vendor: undefined,
      category: undefined,
      page: 1,
    });
  });

  it("trims search text", () => {
    expect(parseCatalogQuery({ q: "  linen throw  " }).q).toBe("linen throw");
  });

  it("uses the first value when a param repeats", () => {
    expect(parseCatalogQuery({ q: ["indigo", "linen"] }).q).toBe("indigo");
    expect(parseCatalogQuery({ sort: ["newest", "price-asc"] }).sort).toBe("newest");
  });

  it("falls back to featured for an unknown sort", () => {
    expect(parseCatalogQuery({ sort: "cheapest" }).sort).toBe("featured");
  });

  it("rejects overlong search text", () => {
    expect(parseCatalogQuery({ q: "a".repeat(81) }).q).toBeUndefined();
  });

  it("rejects malformed slugs", () => {
    expect(parseCatalogQuery({ vendor: "Atelier Nord" }).vendor).toBeUndefined();
    expect(parseCatalogQuery({ category: "../admin" }).category).toBeUndefined();
  });

  it("coerces a positive page and clamps invalid values to one", () => {
    expect(parseCatalogQuery({ page: "3" }).page).toBe(3);
    expect(parseCatalogQuery({ page: ["2", "9"] }).page).toBe(2);
    expect(parseCatalogQuery({ page: "0" }).page).toBe(1);
    expect(parseCatalogQuery({ page: "-4" }).page).toBe(1);
    expect(parseCatalogQuery({ page: "second" }).page).toBe(1);
    expect(parseCatalogQuery({ page: "1001" }).page).toBe(1);
  });
});

describe("catalogHref", () => {
  it("returns a bare path when defaults apply", () => {
    expect(catalogHref("/products", { sort: "featured" })).toBe("/products");
  });

  it("serializes active filters", () => {
    expect(catalogHref("/products", { q: "linen throw", sort: "newest" })).toBe(
      "/products?q=linen+throw&sort=newest",
    );
  });

  it("omits the first page and serializes deeper pages", () => {
    expect(catalogHref("/products", { sort: "newest", page: 1 })).toBe("/products?sort=newest");
    expect(catalogHref("/products", { sort: "newest", page: 2 })).toBe(
      "/products?sort=newest&page=2",
    );
  });
});
