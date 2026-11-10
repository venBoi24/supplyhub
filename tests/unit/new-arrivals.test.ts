import { describe, expect, it } from "vitest";

import {
  DEFAULT_NEW_ARRIVAL_PERIOD,
  NEW_ARRIVAL_PERIODS,
  newArrivalsSince,
  parseNewArrivalPeriod,
} from "@/features/catalog/new-arrivals";

describe("parseNewArrivalPeriod", () => {
  it("accepts each supported period", () => {
    for (const period of NEW_ARRIVAL_PERIODS) {
      expect(parseNewArrivalPeriod(period)).toBe(period);
    }
  });

  it("falls back to the default for unknown or missing values", () => {
    expect(parseNewArrivalPeriod(undefined)).toBe(DEFAULT_NEW_ARRIVAL_PERIOD);
    expect(parseNewArrivalPeriod("year")).toBe(DEFAULT_NEW_ARRIVAL_PERIOD);
    expect(parseNewArrivalPeriod(42)).toBe(DEFAULT_NEW_ARRIVAL_PERIOD);
  });

  it("reads the first value of an array search param", () => {
    expect(parseNewArrivalPeriod(["day", "week"])).toBe("day");
    expect(parseNewArrivalPeriod(["nope"])).toBe(DEFAULT_NEW_ARRIVAL_PERIOD);
  });
});

describe("newArrivalsSince", () => {
  // 11 November 2026, 15:30 local time.
  const now = new Date(2026, 10, 11, 15, 30, 0);

  it("starts today at midnight", () => {
    const start = newArrivalsSince("day", now);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(10);
    expect(start.getDate()).toBe(11);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
  });

  it("starts this week on Monday at midnight, within the last 7 days", () => {
    const start = newArrivalsSince("week", now);
    expect(start.getDay()).toBe(1);
    expect(start.getHours()).toBe(0);
    expect(start.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(now.getTime() - start.getTime()).toBeLessThan(7 * 24 * 60 * 60 * 1000);
  });

  it("starts this month on the first at midnight", () => {
    const start = newArrivalsSince("month", now);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(10);
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
  });

  it("does not mutate the supplied date", () => {
    const snapshot = now.getTime();
    newArrivalsSince("week", now);
    newArrivalsSince("month", now);
    expect(now.getTime()).toBe(snapshot);
  });
});
