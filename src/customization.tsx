// Customization surface: per-part class names, replaceable parts, and the
// defaults for both. The calendar keeps behavior and accessibility; these
// only change what's rendered around it.
import type { BSDate } from "bikram-sambat-ts";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import type { DayState } from "./types";

/**
 * Class names for each part of {@link NepaliCalendar}. Each one is added to
 * the part's default `nc-*` class (or replaces it with `unstyled`).
 */
export interface CalendarClassNames {
  /** The root element. */
  root: string;
  /** The row with the navigation buttons and month/year selects. */
  header: string;
  /** Both navigation buttons. */
  nav: string;
  /** The previous-month button. */
  navPrevious: string;
  /** The next-month button. */
  navNext: string;
  /** The wrapper around the month and year selects. */
  selects: string;
  /** Both selects. */
  select: string;
  /** The month select. */
  selectMonth: string;
  /** The year select. */
  selectYear: string;
  /** The `<table role="grid">`. */
  grid: string;
  /** The weekday header row (`<tr>`). */
  weekdays: string;
  /** Each weekday header cell (`<th>`). */
  weekday: string;
  /** Each week row (`<tr>`). */
  week: string;
  /** Each cell (`<td>`), including empty ones (which have `data-empty`). */
  cell: string;
  /** Each day button. */
  day: string;
  /** The day number inside a day button (not rendered with `renderDay`). */
  dayNumber: string;
  /** The Gregorian date inside a day button (`showGregorianDate`). */
  dayGregorian: string;
  /** Added to the selected day button. */
  selected: string;
  /** Added to today's day button. */
  today: string;
  /** Added to disabled day buttons. */
  disabled: string;
  /** Added to the day button that has the roving `tabIndex=0`. */
  focused: string;
  /** Built-in SVG icons. */
  icon: string;
}

/** Class names for each part of {@link NepaliDatePicker}. */
export interface DatePickerClassNames {
  /** The root element. */
  root: string;
  /** The bordered row holding the input and buttons. */
  field: string;
  /** The text input. */
  input: string;
  /** The clear button (`clearable`). */
  clear: string;
  /** The button that opens the calendar. */
  trigger: string;
  /** The popover around the calendar. */
  popover: string;
  /** Built-in SVG icons. */
  icon: string;
  /** Class names for the calendar inside the popover. */
  calendar: Partial<CalendarClassNames>;
}

const CALENDAR_DEFAULTS: Record<keyof CalendarClassNames, string> = {
  root: "nc-calendar",
  header: "nc-calendar-header",
  nav: "nc-calendar-nav",
  navPrevious: "nc-calendar-nav-previous",
  navNext: "nc-calendar-nav-next",
  selects: "nc-calendar-selects",
  select: "nc-calendar-select",
  selectMonth: "nc-calendar-select-month",
  selectYear: "nc-calendar-select-year",
  grid: "nc-calendar-grid",
  weekdays: "nc-calendar-weekdays",
  weekday: "nc-calendar-weekday",
  week: "nc-calendar-week",
  cell: "nc-calendar-cell",
  day: "nc-calendar-day",
  dayNumber: "nc-calendar-day-number",
  dayGregorian: "nc-calendar-day-gregorian",
  // States are styled by default through data attributes.
  selected: "",
  today: "",
  disabled: "",
  focused: "",
  icon: "nc-icon",
};

const PICKER_DEFAULTS: Record<Exclude<keyof DatePickerClassNames, "calendar">, string> = {
  root: "nc-date-picker",
  field: "nc-date-picker-field",
  input: "nc-date-picker-input",
  clear: "nc-date-picker-clear",
  trigger: "nc-date-picker-trigger",
  popover: "nc-date-picker-popover",
  icon: "nc-icon",
};

/** Joins the truthy class names with spaces; `undefined` when there are none. */
export function cx(...names: (string | false | null | undefined)[]): string | undefined {
  const joined = names.filter(Boolean).join(" ");
  return joined === "" ? undefined : joined;
}

type ClassNameResolver<K extends string> = (
  ...keys: (K | false | null | undefined)[]
) => string | undefined;

function resolver<K extends string>(
  defaults: Record<K, string>,
  custom: Partial<Record<K, unknown>> | undefined,
  unstyled: boolean,
): ClassNameResolver<K> {
  // Defaults first, then the custom classes, in the order the keys are given.
  return (...keys) => {
    const active = keys.filter((key): key is K => Boolean(key));
    return cx(
      ...(unstyled ? [] : active.map((key) => defaults[key])),
      ...active.map((key) => {
        const own = custom?.[key];
        return typeof own === "string" ? own : undefined;
      }),
    );
  };
}

export type CalendarClassNameResolver = ClassNameResolver<keyof CalendarClassNames>;

export function calendarClassNames(
  custom: Partial<CalendarClassNames> | undefined,
  unstyled: boolean,
): CalendarClassNameResolver {
  return resolver(CALENDAR_DEFAULTS, custom, unstyled);
}

export function datePickerClassNames(
  custom: Partial<DatePickerClassNames> | undefined,
  unstyled: boolean,
): ClassNameResolver<Exclude<keyof DatePickerClassNames, "calendar">> {
  return resolver(PICKER_DEFAULTS, custom, unstyled);
}

/** Hides content visually but keeps it for screen readers, with or without our CSS. */
export const VISUALLY_HIDDEN: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

type DataAttributes = { [key: `data-${string}`]: string | boolean | undefined };

/**
 * Props for a custom `NavButton`. Spread everything except `direction` onto
 * a `<button>` (it carries the label, `disabled` state and click handler).
 */
export interface NavButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  direction: "previous" | "next";
}

/** Props for a custom `Chevron` icon. */
export interface ChevronProps {
  direction: "previous" | "next";
  className: string | undefined;
}

/** One option of a month or year select. */
export interface SelectOption {
  value: number;
  label: string;
  disabled: boolean;
}

/**
 * Props for a custom `Select` (the month and year pickers). Render any
 * control that shows `value`, offers `options` (skipping or disabling the
 * disabled ones) and calls `onChange` with the chosen option's value.
 */
export interface SelectProps {
  kind: "month" | "year";
  value: number;
  options: SelectOption[];
  onChange: (value: number) => void;
  "aria-label": string;
  className: string | undefined;
}

/**
 * Props for a custom `DayButton`. Spread everything except `date` and
 * `state` onto the focusable element: `tabIndex`, `data-date`, the `aria-*`
 * attributes and the handlers are what make keyboard navigation and screen
 * readers work.
 */
export interface DayButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, DataAttributes {
  date: BSDate;
  state: DayState;
  children?: ReactNode;
}

/** Parts of {@link NepaliCalendar} that can be replaced with your own components. */
export interface CalendarComponents {
  NavButton: (props: NavButtonProps) => ReactNode;
  Chevron: (props: ChevronProps) => ReactNode;
  Select: (props: SelectProps) => ReactNode;
  DayButton: (props: DayButtonProps) => ReactNode;
}

/** Icon props for the date picker's trigger and clear buttons. */
export interface IconProps {
  className: string | undefined;
}

/** Parts of {@link NepaliDatePicker} that can be replaced: the calendar's parts plus two icons. */
export interface DatePickerComponents extends CalendarComponents {
  TriggerIcon: (props: IconProps) => ReactNode;
  ClearIcon: (props: IconProps) => ReactNode;
}

function DefaultNavButton({ direction, ...props }: NavButtonProps) {
  return <button type="button" {...props} />;
}

function DefaultChevron({ direction, className }: ChevronProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={direction === "previous" ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DefaultSelect({ value, options, onChange, className, ...rest }: SelectProps) {
  return (
    <select
      className={className}
      aria-label={rest["aria-label"]}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function DefaultDayButton({ date, state, ...props }: DayButtonProps) {
  return <button type="button" {...props} />;
}

function DefaultTriggerIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="2"
        y="3"
        width="12"
        height="11"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DefaultClearIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

const DEFAULT_COMPONENTS: DatePickerComponents = {
  NavButton: DefaultNavButton,
  Chevron: DefaultChevron,
  Select: DefaultSelect,
  DayButton: DefaultDayButton,
  TriggerIcon: DefaultTriggerIcon,
  ClearIcon: DefaultClearIcon,
};

/** The given components, with defaults for the ones left out. */
export function resolveComponents(
  custom: Partial<DatePickerComponents> | undefined,
): DatePickerComponents {
  return custom ? { ...DEFAULT_COMPONENTS, ...custom } : DEFAULT_COMPONENTS;
}
