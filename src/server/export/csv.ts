const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Spreadsheet applications execute cells that begin with a formula character. Prefixing those
 * cells with an apostrophe keeps exported admin data inert when opened in Excel or Sheets.
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  let text = String(value);

  if (FORMULA_PREFIX.test(text)) {
    text = `'${text}`;
  }

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export function buildCsv(
  headers: readonly string[],
  rows: readonly (readonly (string | number | null | undefined)[])[],
): string {
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}
