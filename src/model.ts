// Pure calendar-UI helpers. Everything calendar-specific (month lengths,
// weekdays, arithmetic, the supported range) comes from bikram-sambat-ts;
// this module only decides UI behavior on top of it.
import {
  DateOutOfRangeError,
  MAX_BS_YEAR,
  MIN_BS_YEAR,
  addBsDays,
  compareBsDates,
  daysInBsMonth,
  endOfBsYear,
  formatBsDate,
  getBsDayOfWeek,
  isValidBsDate,
  nextBsMonth,
  previousBsMonth,
  type BSDate,
} from "bikram-sambat-ts";
import type { BSMonth } from "./types";

/** The first and last selectable dates, inclusive. */
export interface Bounds {
  min: BSDate;
  max: BSDate;
}

/** The first day bikram-sambat-ts supports. */
export const FIRST_SUPPORTED_DATE: BSDate = { year: MIN_BS_YEAR, month: 1, day: 1 };

/** The last day bikram-sambat-ts supports. */
export const LAST_SUPPORTED_DATE: BSDate = endOfBsYear({ year: MAX_BS_YEAR, month: 1, day: 1 });

/** Returns `date` if it is a real, supported BS date, otherwise `undefined`. */
export function validOrUndefined(date: BSDate | undefined | null): BSDate | undefined {
  return date != null && isValidBsDate(date) ? date : undefined;
}

/** Whether `month` is a supported BS year and a month from 1 to 12. */
export function isValidMonth(month: BSMonth | undefined): month is BSMonth {
  return (
    month !== undefined &&
    Number.isInteger(month.year) &&
    Number.isInteger(month.month) &&
    month.year >= MIN_BS_YEAR &&
    month.year <= MAX_BS_YEAR &&
    month.month >= 1 &&
    month.month <= 12
  );
}

/**
 * The selectable range: `minDate`/`maxDate` narrowed to the supported range.
 * An invalid `minDate` or `maxDate` is ignored.
 */
export function resolveBounds(minDate?: BSDate, maxDate?: BSDate): Bounds {
  const min = validOrUndefined(minDate) ?? FIRST_SUPPORTED_DATE;
  const max = validOrUndefined(maxDate) ?? LAST_SUPPORTED_DATE;
  return { min, max };
}

export function isWithinBounds(date: BSDate, bounds: Bounds): boolean {
  return compareBsDates(date, bounds.min) >= 0 && compareBsDates(date, bounds.max) <= 0;
}

export function clampToBounds(date: BSDate, bounds: Bounds): BSDate {
  if (compareBsDates(date, bounds.min) < 0) return bounds.min;
  if (compareBsDates(date, bounds.max) > 0) return bounds.max;
  return date;
}

/** Whether a day can't be selected. */
export function isDayDisabled(
  date: BSDate,
  bounds: Bounds,
  isDateDisabled: ((date: BSDate) => boolean) | undefined,
): boolean {
  return !isWithinBounds(date, bounds) || isDateDisabled?.(date) === true;
}

/** A stable string key for a date, `"YYYY-MM-DD"`. */
export function dateKey(date: BSDate): string {
  return formatBsDate(date);
}

export function monthOf(date: BSDate): BSMonth {
  return { year: date.year, month: date.month };
}

export function compareMonths(a: BSMonth, b: BSMonth): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

export function isSameMonth(date: BSDate, month: BSMonth): boolean {
  return date.year === month.year && date.month === month.month;
}

/** Moves a month by `n` months, crossing years. The result may be unsupported. */
export function shiftMonth(month: BSMonth, n: number): BSMonth {
  const index = month.year * 12 + (month.month - 1) + n;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** Moves a month into the months that contain at least one day within `bounds`. */
export function clampMonth(month: BSMonth, bounds: Bounds): BSMonth {
  if (compareMonths(month, monthOf(bounds.min)) < 0) return monthOf(bounds.min);
  if (compareMonths(month, monthOf(bounds.max)) > 0) return monthOf(bounds.max);
  return month;
}

/**
 * Moves a date by `n` months, keeping the day of the month but clamping it to
 * the target month's length (Ashwin 31 + 1 month = Kartik 30). Past the
 * supported range, returns the first or last supported day.
 */
export function shiftDateByMonths(date: BSDate, n: number): BSDate {
  const target = shiftMonth(monthOf(date), n);
  if (target.year < MIN_BS_YEAR) return FIRST_SUPPORTED_DATE;
  if (target.year > MAX_BS_YEAR) return LAST_SUPPORTED_DATE;
  if (n === 1) return nextBsMonth(date);
  if (n === -1) return previousBsMonth(date);
  return { ...target, day: Math.min(date.day, daysInBsMonth(target.year, target.month)) };
}

/** addBsDays, but past the supported range returns the first or last supported day. */
export function addDaysClamped(date: BSDate, days: number): BSDate {
  try {
    return addBsDays(date, days);
  } catch (error) {
    if (error instanceof DateOutOfRangeError) {
      return days > 0 ? LAST_SUPPORTED_DATE : FIRST_SUPPORTED_DATE;
    }
    throw error;
  }
}

/**
 * The date a keyboard key moves focus to from `date`, clamped to `bounds`, or
 * `null` if the key isn't a calendar navigation key. Follows the WAI-ARIA APG
 * date picker grid pattern; weeks run Sunday to Saturday.
 */
export function keyboardTarget(
  date: BSDate,
  key: string,
  shiftKey: boolean,
  bounds: Bounds,
): BSDate | null {
  let target: BSDate;
  switch (key) {
    case "ArrowLeft":
      target = addDaysClamped(date, -1);
      break;
    case "ArrowRight":
      target = addDaysClamped(date, 1);
      break;
    case "ArrowUp":
      target = addDaysClamped(date, -7);
      break;
    case "ArrowDown":
      target = addDaysClamped(date, 7);
      break;
    case "Home":
      target = addDaysClamped(date, -getBsDayOfWeek(date));
      break;
    case "End":
      target = addDaysClamped(date, 6 - getBsDayOfWeek(date));
      break;
    case "PageUp":
      target = shiftDateByMonths(date, shiftKey ? -12 : -1);
      break;
    case "PageDown":
      target = shiftDateByMonths(date, shiftKey ? 12 : 1);
      break;
    default:
      return null;
  }
  return clampToBounds(target, bounds);
}

/**
 * The one day in `month` that gets `tabIndex=0` (roving tabindex). In order of
 * preference: the focused date, the selected date, the focused day number
 * carried over to this month, today, then the first selectable day.
 */
export function pickTabbableDate(
  month: BSMonth,
  candidates: {
    focused?: BSDate | undefined;
    selected?: BSDate | undefined;
    today?: BSDate | undefined;
  },
  bounds: Bounds,
  isDateDisabled?: (date: BSDate) => boolean,
): BSDate {
  const days = daysInBsMonth(month.year, month.month);
  const { focused, selected, today } = candidates;
  const carried = focused && { ...month, day: Math.min(focused.day, days) };
  for (const date of [focused, selected, carried, today]) {
    if (date && isSameMonth(date, month) && isWithinBounds(date, bounds)) return date;
  }
  for (let day = 1; day <= days; day++) {
    const date = { ...month, day };
    if (!isDayDisabled(date, bounds, isDateDisabled)) return date;
  }
  // Nothing selectable in this month: keep a focusable cell anyway.
  return clampToBounds({ ...month, day: 1 }, bounds);
}
