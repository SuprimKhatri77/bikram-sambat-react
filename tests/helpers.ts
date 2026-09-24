import { MAX_BS_YEAR, MIN_BS_YEAR, daysInBsMonth } from "bikram-sambat-ts";
import type { BSMonth } from "../src";

/** The day button for a date key like "2083-06-15", or throws. */
export function day(container: HTMLElement, key: string): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>(`button[data-date="${key}"]`);
  if (button === null) throw new Error(`no day button for ${key}`);
  return button;
}

/** All day buttons currently rendered. */
export function days(container: HTMLElement): HTMLButtonElement[] {
  return [...container.querySelectorAll<HTMLButtonElement>("button[data-date]")];
}

/** The date key of the focused element, if it's a day button. */
export function focusedKey(): string | null {
  return document.activeElement?.getAttribute("data-date") ?? null;
}

/** The first supported month with exactly `length` days, found via bikram-sambat-ts. */
export function monthWithDays(length: number): BSMonth {
  for (let year = MIN_BS_YEAR; year <= MAX_BS_YEAR; year++) {
    for (let month = 1; month <= 12; month++) {
      if (daysInBsMonth(year, month) === length) return { year, month };
    }
  }
  throw new Error(`no month with ${length} days`);
}

export const pad = (n: number): string => String(n).padStart(2, "0");
export const keyOf = (year: number, month: number, d: number): string =>
  `${year}-${pad(month)}-${pad(d)}`;
