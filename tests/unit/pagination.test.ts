import { describe, expect, it } from "vitest";

import { buildCsv, escapeCsvCell } from "@/server/export/csv";
import { paginationHref, parseEnumParam, parseSearchTerm } from "@/features/admin/filters";
import { clampPage, pageCount, pageOffset, parsePage } from "@/lib/utils/pagination";

describe("pagination", () => {
  it("defaults invalid pages to one", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-4")).toBe(1);
    expect(parsePage("nope")).toBe(1);
  });

  it("reads the first value from repeated parameters", () => {
    expect(parsePage(["3", "9"])).toBe(3);
  });

  it("computes page counts and clamps out-of-range pages", () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(41, 20)).toBe(3);
    expect(clampPage(9, 41)).toBe(3);
    expect(pageOffset(3, 20)).toBe(40);
  });
});

describe("admin filters", () => {
  it("accepts only allowlisted enum values", () => {
    expect(parseEnumParam("PAID", ["PAID", "SHIPPED"] as const)).toBe("PAID");
    expect(parseEnumParam("paid", ["PAID", "SHIPPED"] as const)).toBeUndefined();
    expect(parseEnumParam(undefined, ["PAID"] as const)).toBeUndefined();
  });

  it("strips control characters and caps search terms", () => {
    expect(parseSearchTerm("  VENJR\u0000 ")).toBe("VENJR");
    expect(parseSearchTerm("")).toBeUndefined();
    expect(parseSearchTerm("a".repeat(120))).toHaveLength(80);
  });

  it("builds pagination links without empty parameters", () => {
    expect(paginationHref("/admin/orders", { status: "PAID", q: undefined }, 2)).toBe(
      "/admin/orders?status=PAID&page=2",
    );
    expect(paginationHref("/admin/orders", { status: "PAID" }, 1)).toBe(
      "/admin/orders?status=PAID",
    );
  });
});

describe("CSV export", () => {
  it("neutralises spreadsheet formulas", () => {
    expect(escapeCsvCell('=HYPERLINK("http://example.com")')).toBe(
      '"\'=HYPERLINK(""http://example.com"")"',
    );
    expect(escapeCsvCell("+SUM(A1:A2)")).toBe("'+SUM(A1:A2)");
    expect(escapeCsvCell("-12")).toBe("'-12");
  });

  it("quotes commas, quotes, and newlines", () => {
    expect(escapeCsvCell("Lagos, Nigeria")).toBe('"Lagos, Nigeria"');
    expect(escapeCsvCell('say "hello"')).toBe('"say ""hello"""');
    expect(escapeCsvCell("line\nbreak")).toBe('"line\nbreak"');
  });

  it("renders headers and rows with CRLF separators", () => {
    expect(
      buildCsv(
        ["Order", "Total"],
        [
          ["SH-1", 1200],
          [null, undefined],
        ],
      ),
    ).toBe("Order,Total\r\nSH-1,1200\r\n,");
  });
});
