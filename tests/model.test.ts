import { MAX_BS_YEAR, MIN_BS_YEAR, daysInBsMonth, getBsDayOfWeek } from "bikram-sambat-ts";
import { describe, expect, it } from "vitest";
import {
  FIRST_SUPPORTED_DATE,
  LAST_SUPPORTED_DATE,
  clampMonth,
  keyboardTarget,
  pickTabbableDate,
  resolveBounds,
  shiftDateByMonths,
  shiftMonth,
} from "../src/model";
import { monthWithDays } from "./helpers";

const all = resolveBounds();

describe("supported range", () => {
  it("comes from bikram-sambat-ts", () => {
    expect(FIRST_SUPPORTED_DATE).toEqual({ year: MIN_BS_YEAR, month: 1, day: 1 });
    expect(LAST_SUPPORTED_DATE).toEqual({
      year: MAX_BS_YEAR,
      month: 12,
      day: daysInBsMonth(MAX_BS_YEAR, 12),
    });
  });

  it("ignores invalid min/max dates", () => {
    expect(
      resolveBounds({ year: 1900, month: 1, day: 1 }, { year: 2083, month: 13, day: 1 }),
    ).toEqual(all);
  });
});

describe("shiftMonth / clampMonth", () => {
  it("crosses year boundaries", () => {
    expect(shiftMonth({ year: 2083, month: 12 }, 1)).toEqual({ year: 2084, month: 1 });
    expect(shiftMonth({ year: 2083, month: 1 }, -1)).toEqual({ year: 2082, month: 12 });
    expect(shiftMonth({ year: 2083, month: 6 }, -12)).toEqual({ year: 2082, month: 6 });
  });

  it("clamps into the bounds", () => {
    const bounds = resolveBounds(
      { year: 2083, month: 3, day: 10 },
      { year: 2083, month: 9, day: 5 },
    );
    expect(clampMonth({ year: 2080, month: 1 }, bounds)).toEqual({ year: 2083, month: 3 });
    expect(clampMonth({ year: 2090, month: 1 }, bounds)).toEqual({ year: 2083, month: 9 });
  });
});

describe("shiftDateByMonths", () => {
  it("clamps the day to the target month's length", () => {
    const m32 = monthWithDays(32);
    const target = shiftMonth(m32, 1);
    expect(shiftDateByMonths({ ...m32, day: 32 }, 1)).toEqual({
      ...target,
      day: Math.min(32, daysInBsMonth(target.year, target.month)),
    });
  });

  it("moves by a year keeping the month", () => {
    const from = { year: 2083, month: 6, day: 31 };
    expect(shiftDateByMonths(from, 12)).toEqual({
      year: 2084,
      month: 6,
      day: Math.min(31, daysInBsMonth(2084, 6)),
    });
  });

  it("stops at the supported range", () => {
    expect(shiftDateByMonths({ year: MAX_BS_YEAR, month: 12, day: 1 }, 1)).toEqual(
      LAST_SUPPORTED_DATE,
    );
    expect(shiftDateByMonths({ year: MIN_BS_YEAR, month: 1, day: 5 }, -1)).toEqual(
      FIRST_SUPPORTED_DATE,
    );
    expect(shiftDateByMonths({ year: MIN_BS_YEAR, month: 6, day: 5 }, -12)).toEqual(
      FIRST_SUPPORTED_DATE,
    );
  });
});

describe("keyboardTarget", () => {
  const d = { year: 2083, month: 6, day: 15 };

  it("maps navigation keys", () => {
    expect(keyboardTarget(d, "ArrowRight", false, all)).toEqual({ ...d, day: 16 });
    expect(keyboardTarget(d, "ArrowLeft", false, all)).toEqual({ ...d, day: 14 });
    expect(keyboardTarget(d, "ArrowDown", false, all)).toEqual({ ...d, day: 22 });
    expect(keyboardTarget(d, "ArrowUp", false, all)).toEqual({ ...d, day: 8 });
    expect(keyboardTarget(d, "a", false, all)).toBeNull();
  });

  it("Home and End go to the start and end of the week", () => {
    const home = keyboardTarget(d, "Home", false, all);
    const end = keyboardTarget(d, "End", false, all);
    expect(home && getBsDayOfWeek(home)).toBe(0);
    expect(end && getBsDayOfWeek(end)).toBe(6);
  });

  it("clamps to the supported range and to min/max", () => {
    expect(keyboardTarget(FIRST_SUPPORTED_DATE, "ArrowLeft", false, all)).toEqual(
      FIRST_SUPPORTED_DATE,
    );
    expect(keyboardTarget(LAST_SUPPORTED_DATE, "ArrowDown", false, all)).toEqual(
      LAST_SUPPORTED_DATE,
    );
    const bounds = resolveBounds(
      { year: 2083, month: 6, day: 10 },
      { year: 2083, month: 6, day: 20 },
    );
    expect(keyboardTarget({ ...d, day: 12 }, "ArrowUp", false, bounds)).toEqual(bounds.min);
    expect(keyboardTarget(d, "PageDown", false, bounds)).toEqual(bounds.max);
  });
});

describe("pickTabbableDate", () => {
  const month = { year: 2083, month: 6 };

  it("prefers focused, then selected, then carried day, then today", () => {
    const focused = { ...month, day: 3 };
    const selected = { ...month, day: 9 };
    const today = { ...month, day: 20 };
    expect(pickTabbableDate(month, { focused, selected, today }, all)).toEqual(focused);
    expect(pickTabbableDate(month, { selected, today }, all)).toEqual(selected);
    expect(
      pickTabbableDate(month, { focused: { year: 2083, month: 5, day: 32 }, today }, all),
    ).toEqual({ ...month, day: daysInBsMonth(2083, 6) });
    expect(pickTabbableDate(month, { today }, all)).toEqual(today);
  });

  it("falls back to the first enabled day", () => {
    expect(pickTabbableDate(month, {}, all, (date) => date.day < 5)).toEqual({ ...month, day: 5 });
    const bounds = resolveBounds({ ...month, day: 12 });
    expect(pickTabbableDate(month, {}, bounds)).toEqual({ ...month, day: 12 });
  });
});
