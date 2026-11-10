/**
 * "New arrivals" windows for the storefront home page.
 *
 * Buyers can browse objects published today, this week, or this month. The
 * windows are calendar-based and computed from the server clock so the section
 * stays server-rendered (no client fetching) and matches the existing typed
 * routes. `publishedAt` is set the moment a studio publishes an object.
 */
export const NEW_ARRIVAL_PERIODS = ["day", "week", "month"] as const;

export type NewArrivalPeriod = (typeof NEW_ARRIVAL_PERIODS)[number];

export const DEFAULT_NEW_ARRIVAL_PERIOD: NewArrivalPeriod = "week";

/** Resolve an untrusted search-param value to a supported period. */
export function parseNewArrivalPeriod(value: unknown): NewArrivalPeriod {
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === "string" &&
    (NEW_ARRIVAL_PERIODS as readonly string[]).includes(candidate)
    ? (candidate as NewArrivalPeriod)
    : DEFAULT_NEW_ARRIVAL_PERIOD;
}

/**
 * Inclusive start of the window as of `now`:
 * - day: midnight at the start of today
 * - week: midnight at the start of the current week (Monday)
 * - month: midnight on the first day of the current month
 */
export function newArrivalsSince(period: NewArrivalPeriod, now: Date = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case "day":
      return start;
    case "week": {
      const daysSinceMonday = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - daysSinceMonday);
      return start;
    }
    case "month":
      start.setDate(1);
      return start;
  }
}
