export const DEFAULT_PAGE_SIZE = 20;

export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function pageCount(total: number, pageSize = DEFAULT_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function clampPage(page: number, total: number, pageSize = DEFAULT_PAGE_SIZE): number {
  return Math.min(Math.max(1, page), pageCount(total, pageSize));
}

export function pageOffset(page: number, pageSize = DEFAULT_PAGE_SIZE): number {
  return (page - 1) * pageSize;
}
