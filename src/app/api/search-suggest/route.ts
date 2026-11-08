import { connection } from "next/server";
import { z } from "zod";

import {
  listCategorySummaries,
  listProducts,
  listVendorSummaries,
} from "@/features/catalog/queries";
import { normalizeSearchText } from "@/features/catalog/search";

const querySchema = z.string().trim().max(80).catch("");

/** Bounded Levenshtein distance; returns `max + 1` once the budget is exceeded. */
function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let last = prev[0]!;
    prev[0] = i;
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, last + cost);
      last = tmp;
      rowMin = Math.min(rowMin, prev[j]!);
    }
    if (rowMin > max) return max + 1;
  }
  return prev[b.length]!;
}

interface Suggestion {
  products: {
    slug: string;
    name: string;
    vendorName: string;
    priceCents: number;
    currency: string;
    image: string;
  }[];
  studios: { slug: string; name: string; location: string }[];
  departments: { slug: string; name: string }[];
  corrected: string | null;
}

export async function GET(request: Request): Promise<Response> {
  await connection();

  const url = new URL(request.url);
  const raw = querySchema.parse(url.searchParams.get("q") ?? "");
  const q = normalizeSearchText(raw);
  const headers = { "Cache-Control": "no-store" };

  if (q.length < 2) {
    return Response.json(
      {
        query: raw,
        products: [],
        studios: [],
        departments: [],
        corrected: null,
      } satisfies Suggestion & { query: string },
      { headers },
    );
  }

  const [products, vendors, categories] = await Promise.all([
    listProducts({ limit: 48 }),
    listVendorSummaries(),
    listCategorySummaries(),
  ]);

  // Build a vocabulary for typo correction from real catalog terms.
  const vocabulary = new Set<string>();
  for (const p of products) {
    normalizeSearchText(p.name)
      .split(/\s+/)
      .forEach((w) => w.length >= 3 && vocabulary.add(w));
    p.materials.forEach((m) =>
      normalizeSearchText(m)
        .split(/\s+/)
        .forEach((w) => w.length >= 3 && vocabulary.add(w)),
    );
  }
  for (const v of vendors)
    normalizeSearchText(v.name)
      .split(/\s+/)
      .forEach((w) => w.length >= 3 && vocabulary.add(w));
  for (const c of categories)
    normalizeSearchText(c.name)
      .split(/\s+/)
      .forEach((w) => w.length >= 3 && vocabulary.add(w));

  const tokens = q.split(/\s+/).filter(Boolean);
  const correctedTokens = tokens.map((token) => {
    if (vocabulary.has(token) || token.length < 4) return token;
    let best = token;
    let bestDist = 3;
    for (const word of vocabulary) {
      const d = editDistance(token, word, 2);
      if (d < bestDist) {
        bestDist = d;
        best = word;
      }
    }
    return bestDist <= 2 ? best : token;
  });
  const corrected = correctedTokens.join(" ");
  const effective = corrected !== q ? corrected : q;
  const effectiveTokens = effective.split(/\s+/).filter(Boolean);

  const scoreText = (text: string): number => {
    const hay = normalizeSearchText(text);
    let score = 0;
    for (const token of effectiveTokens) {
      if (hay.includes(token)) score += 3;
      else if (hay.split(/\s+/).some((w) => editDistance(token, w, 1) <= 1)) score += 1;
    }
    return score;
  };

  const rankedProducts = products
    .map((p) => ({
      p,
      score:
        scoreText(p.name) * 2 +
        scoreText(p.vendor.name) +
        scoreText(p.category.name) +
        scoreText(p.materials.join(" ")),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ p }) => ({
      slug: p.slug,
      name: p.name,
      vendorName: p.vendor.name,
      priceCents: p.priceCents,
      currency: p.currency,
      image: p.image.src,
    }));

  const studios = vendors
    .map((v) => ({
      v,
      score: scoreText(v.name) * 2 + scoreText(v.location) + scoreText(v.discipline),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ v }) => ({ slug: v.slug, name: v.name, location: v.location }));

  const departments = categories
    .map((c) => ({ c, score: scoreText(c.name) * 2 + scoreText(c.headline) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ c }) => ({ slug: c.slug, name: c.name }));

  const body: Suggestion & { query: string } = {
    query: raw,
    products: rankedProducts,
    studios,
    departments,
    corrected: corrected !== q ? corrected : null,
  };

  return Response.json(body, { headers });
}
