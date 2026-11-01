export const MAX_SEARCH_TOKENS = 8;
export const MAX_SEARCH_TOKEN_LENGTH = 40;
export const MAX_SEARCH_TEXT_LENGTH = 8000;

/**
 * Stored search text is lowercased and stripped of diacritics, so "café" and "cafe" match.
 * Tokens are normalized the same way before they reach the query layer.
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function searchTokens(query: string): string[] {
  const tokens = normalizeSearchText(query)
    .split(/\s+/)
    .map((token) => token.slice(0, MAX_SEARCH_TOKEN_LENGTH))
    .filter(Boolean);

  return [...new Set(tokens)].slice(0, MAX_SEARCH_TOKENS);
}

export interface SearchableProduct {
  name: string;
  summary: string;
  description: string;
  makerNote?: string;
  materials?: readonly string[];
  dimensions?: string;
}

export function buildSearchText(product: SearchableProduct): string {
  return normalizeSearchText(
    [
      product.name,
      product.summary,
      product.description,
      product.makerNote ?? "",
      product.materials?.join(" ") ?? "",
      product.dimensions ?? "",
    ].join(" "),
  ).slice(0, MAX_SEARCH_TEXT_LENGTH);
}
