import { describe, expect, it } from "vitest";

import { createTranslator, fallbackDictionary, loadDictionary } from "@/i18n/dictionary";
import { LOCALES } from "@/i18n/config";
import { formatCurrency } from "@/i18n/formatters";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("platform dictionaries", () => {
  it.each(LOCALES.filter((locale) => locale !== "en"))(
    "keeps %s at exact key parity with English",
    async (locale) => {
      const dictionary = await loadDictionary(locale);
      expect(leafKeys(dictionary).sort()).toEqual(leafKeys(fallbackDictionary).sort());
    },
  );

  it("falls back to English for a missing translation and finally to the key", () => {
    const incomplete = { common: {} } as typeof fallbackDictionary;
    const t = createTranslator(incomplete);
    expect(t("common.addToCart")).toBe("Add to cart");
    expect(t("missing.key")).toBe("missing.key");
  });

  it("interpolates named variables without changing database values", () => {
    const t = createTranslator(fallbackDictionary);
    expect(t("cart.objectsFrom", { studio: "Amina | Craft" })).toBe("Objects from Amina | Craft");
  });
});

describe("locale-aware money", () => {
  it("keeps integer-cent amounts exact while localizing presentation", () => {
    expect(formatCurrency(1850050, "TZS", "en")).toContain("18,500.50");
    expect(formatCurrency(1850000, "TZS", "fr")).toContain("18 500");
  });
});
