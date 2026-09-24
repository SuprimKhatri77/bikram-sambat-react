import type { BSDate } from "bikram-sambat-ts";

/** A Bikram Sambat year and 1-based month (1 is Baisakh, 12 is Chaitra). */
export interface BSMonth {
  year: number;
  month: number;
}

/** Display language for month names, weekday names and built-in labels. */
export type CalendarLocale = "en" | "ne";

/**
 * Digits used for day numbers, years and the date picker's input text.
 * `"latin"` is 0–9; `"devanagari"` is ०–९.
 */
export type Numerals = "latin" | "devanagari";

/** The shape of the day buttons (hover, today ring and selection). */
export type DayShape = "circle" | "rounded" | "square";

/** The state of one day cell, as passed to `renderDay`. */
export interface DayState {
  /** The day is the selected value. */
  selected: boolean;
  /** The day is today (see the `today` prop). */
  today: boolean;
  /** The day can't be selected: outside `minDate`/`maxDate` or rejected by `isDateDisabled`. */
  disabled: boolean;
  /** The day is the calendar's keyboard focus target (the one cell with `tabIndex=0`). */
  focused: boolean;
}

export type { BSDate };
