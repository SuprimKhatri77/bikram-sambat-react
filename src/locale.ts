import { formatBsDate, fromNepaliDigits, toNepaliDigits, type BSDate } from "bikram-sambat-ts";
import type { CalendarLocale, Numerals } from "./types";

/** All visible and accessible text for one locale. BS names come from bikram-sambat-ts. */
export interface LocaleStrings {
  /** Whether bikram-sambat-ts should render month and weekday names in Nepali. */
  nepali: boolean;
  previousMonth: string;
  nextMonth: string;
  month: string;
  year: string;
  chooseDate: string;
  clearDate: string;
  calendar: string;
  placeholder: string;
  /** formatBsDate layouts. */
  titleLayout: string;
  dayLabelLayout: string;
  /** Gregorian month names, used only by `showGregorianDate`. */
  adMonths: readonly string[];
  adMonthsShort: readonly string[];
  /** Accessible suffix for a day's Gregorian date, e.g. "22 September 2026". */
  adLabel: (day: string, month: string, year: string) => string;
}

// prettier-ignore
const EN_AD_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

// prettier-ignore
const NE_AD_MONTHS = [
  "जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन",
  "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर",
] as const;

// prettier-ignore
const NE_AD_MONTHS_SHORT = [
  "जन", "फेब", "मार्च", "अप्रि", "मे", "जुन",
  "जुला", "अग", "सेप्ट", "अक्टो", "नोभे", "डिसे",
] as const;

export const LOCALES: Record<CalendarLocale, LocaleStrings> = {
  en: {
    nepali: false,
    previousMonth: "Previous month",
    nextMonth: "Next month",
    month: "Month",
    year: "Year",
    chooseDate: "Choose date",
    clearDate: "Clear date",
    calendar: "Calendar",
    placeholder: "YYYY-MM-DD",
    titleLayout: "MMMM YYYY",
    dayLabelLayout: "dddd, D MMMM YYYY",
    adMonths: EN_AD_MONTHS,
    adMonthsShort: EN_AD_MONTHS.map((m) => m.slice(0, 3)),
    adLabel: (day, month, year) => `${day} ${month} ${year} AD`,
  },
  ne: {
    nepali: true,
    previousMonth: "अघिल्लो महिना",
    nextMonth: "अर्को महिना",
    month: "महिना",
    year: "वर्ष",
    chooseDate: "मिति छान्नुहोस्",
    clearDate: "मिति हटाउनुहोस्",
    calendar: "पात्रो",
    placeholder: "वर्ष-महिना-गते",
    titleLayout: "MMMM YYYY",
    dayLabelLayout: "YYYY MMMM D, dddd",
    adMonths: NE_AD_MONTHS,
    adMonthsShort: NE_AD_MONTHS_SHORT,
    adLabel: (day, month, year) => `ईस्वी ${year} ${month} ${day}`,
  },
};

/** The default numeral system for a locale: Devanagari for Nepali, Latin otherwise. */
export function defaultNumerals(locale: CalendarLocale): Numerals {
  return locale === "ne" ? "devanagari" : "latin";
}

/** Converts every digit in `value` to the requested numeral system. */
export function toNumerals(value: string | number, numerals: Numerals): string {
  return numerals === "devanagari" ? toNepaliDigits(value) : fromNepaliDigits(String(value));
}

/** formatBsDate in the given locale, with digits in the given numeral system. */
export function formatInLocale(
  date: BSDate,
  layout: string,
  strings: LocaleStrings,
  numerals: Numerals,
): string {
  return toNumerals(formatBsDate(date, layout, { nepali: strings.nepali }), numerals);
}
