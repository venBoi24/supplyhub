export function searchParamValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseEnumParam<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
): T | undefined {
  const raw = searchParamValue(value);
  return allowed.includes(raw as T) ? (raw as T) : undefined;
}

export function parseSearchTerm(
  value: string | string[] | undefined,
  maxLength = 80,
): string | undefined {
  const raw = searchParamValue(value)
    ?.replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim();

  return raw ? raw.slice(0, maxLength) : undefined;
}

export function paginationHref(
  pathname: string,
  params: Record<string, string | undefined>,
  page: number,
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  if (page > 1) {
    search.set("page", String(page));
  } else {
    search.delete("page");
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}
