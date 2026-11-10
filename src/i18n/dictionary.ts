import en from "./messages/en.json";
import { DEFAULT_LOCALE, type Locale } from "./config";

export type Messages = typeof en;

const loaders: Record<Locale, () => Promise<Messages>> = {
  en: () => Promise.resolve(en),
  sw: () => import("./messages/sw.json").then((m) => m.default as Messages),
  ar: () => import("./messages/ar.json").then((m) => m.default as Messages),
  zh: () => import("./messages/zh.json").then((m) => m.default as Messages),
  fr: () => import("./messages/fr.json").then((m) => m.default as Messages),
};

export async function loadDictionary(locale: Locale): Promise<Messages> {
  return loaders[locale]();
}

export const fallbackDictionary: Messages = en;

function lookup(source: unknown, path: string): unknown {
  let cursor: unknown = source;
  for (const part of path.split(".")) {
    if (typeof cursor !== "object" || cursor === null) return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

export type Translator = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Build a translator that resolves dot-paths against `dict`, gracefully falling
 * back to English and finally to the raw key so a missing translation never
 * breaks rendering.
 */
export function createTranslator(
  dict: Messages,
  fallback: Messages = fallbackDictionary,
): Translator {
  return (key, vars) => {
    const primary = lookup(dict, key);
    if (typeof primary === "string") return interpolate(primary, vars);
    const secondary = lookup(fallback, key);
    if (typeof secondary === "string") return interpolate(secondary, vars);
    return key;
  };
}

export const defaultTranslator: Translator = createTranslator(en, en);

export function translatorFor(locale: Locale, dict: Messages): Translator {
  return createTranslator(dict, locale === DEFAULT_LOCALE ? dict : fallbackDictionary);
}
