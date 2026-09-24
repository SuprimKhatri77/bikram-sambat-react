import { todayBs, type BSDate } from "bikram-sambat-ts";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  calendarClassNames,
  cx,
  resolveComponents,
  type CalendarClassNames,
  type CalendarComponents,
} from "../customization";
import { useControllableState } from "../hooks/useControllableState";
import { useToday } from "../hooks/useToday";
import { LOCALES, defaultNumerals } from "../locale";
import {
  LAST_SUPPORTED_DATE,
  clampMonth,
  compareMonths,
  dateKey,
  isDayDisabled,
  isSameMonth,
  isValidMonth,
  keyboardTarget,
  monthOf,
  pickTabbableDate,
  resolveBounds,
  validOrUndefined,
  type Bounds,
} from "../model";
import type { BSMonth, CalendarLocale, DayShape, DayState, Numerals } from "../types";
import { CalendarGrid } from "./CalendarGrid";
import { CalendarHeader } from "./CalendarHeader";

/** Props for {@link NepaliCalendar}. */
export interface NepaliCalendarProps {
  /**
   * The selected date (controlled). Passing the `value` prop at all, even as
   * `undefined`, makes the selection controlled; `undefined` then means
   * "nothing selected". Invalid or unsupported dates are treated as no
   * selection.
   */
  value?: BSDate | undefined;
  /** The initially selected date when uncontrolled. */
  defaultValue?: BSDate | undefined;
  /** Called with the chosen date whenever the user selects a day, including the already selected one. */
  onChange?: ((date: BSDate) => void) | undefined;

  /** The displayed month (controlled). Use with `onMonthChange`. */
  month?: BSMonth | undefined;
  /**
   * The initially displayed month when uncontrolled. Defaults to the month of
   * `value`/`defaultValue`, then of `today`, then the current month in Nepal.
   */
  defaultMonth?: BSMonth | undefined;
  /** Called when the user navigates to another month. */
  onMonthChange?: ((month: BSMonth) => void) | undefined;

  /** The first selectable date (inclusive). Earlier days are disabled and unreachable. */
  minDate?: BSDate | undefined;
  /** The last selectable date (inclusive). Later days are disabled and unreachable. */
  maxDate?: BSDate | undefined;
  /** Return `true` to disable a day. Disabled days can be focused but not selected. */
  isDateDisabled?: ((date: BSDate) => boolean) | undefined;

  /** Language for month names, weekday names and labels. Default `"en"`. */
  locale?: CalendarLocale | undefined;
  /** Digits for numbers. Defaults to `"devanagari"` for `locale="ne"`, `"latin"` otherwise. */
  numerals?: Numerals | undefined;

  /**
   * The date to highlight as today. By default it's the device's local date,
   * computed after mount so server-rendered markup stays deterministic.
   */
  today?: BSDate | undefined;
  /** Show each day's Gregorian (AD) date under the BS day number. Default `false`. */
  showGregorianDate?: boolean | undefined;
  /**
   * Always render six week rows, so the calendar keeps the same height from
   * month to month. Default `true`; `false` renders only the rows a month needs.
   */
  fixedWeeks?: boolean | undefined;
  /**
   * Shape of the day buttons with the default stylesheet: `"circle"`
   * (default), `"rounded"` or `"square"`. For anything else, set the
   * `--nc-day-radius` CSS variable.
   */
  dayShape?: DayShape | undefined;
  /**
   * Custom content for a day cell. The surrounding button, its label and its
   * keyboard behavior stay the calendar's.
   */
  renderDay?: ((date: BSDate, state: DayState) => ReactNode) | undefined;

  /**
   * Class names for each part, added to the default `nc-*` classes (e.g.
   * `{ day: "rounded-full", selected: "bg-blue-600 text-white" }`).
   */
  classNames?: Partial<CalendarClassNames> | undefined;
  /**
   * Replace parts with your own components: `NavButton`, `Chevron`,
   * `Select`, `DayButton`. Define them outside your component (or memoize
   * them) so they keep their identity between renders.
   */
  components?: Partial<CalendarComponents> | undefined;
  /**
   * Leave out the default `nc-*` class names, so the default stylesheet
   * doesn't apply to this calendar even when it's loaded. Data attributes
   * (`data-selected`, …) and `classNames` still apply.
   */
  unstyled?: boolean | undefined;

  /** Focus the calendar's focusable day on mount. */
  autoFocus?: boolean | undefined;
  /** Extra class name for the root element (same as `classNames.root`). */
  className?: string | undefined;
  /** `id` for the root element. */
  id?: string | undefined;
}

/**
 * Displays an interactive Bikram Sambat month calendar.
 *
 * Supports controlled and uncontrolled selection and month, full keyboard
 * navigation (arrows, Home/End, PageUp/PageDown, Shift+PageUp/PageDown),
 * `minDate`/`maxDate` and custom disabled days, English and Nepali labels,
 * and Latin or Devanagari digits. All calendar math comes from
 * `bikram-sambat-ts`; the supported range is BS 1979–2100.
 *
 * @example
 * const [date, setDate] = useState<BSDate>();
 * <NepaliCalendar value={date} onChange={setDate} />
 */
export function NepaliCalendar(props: NepaliCalendarProps) {
  const {
    locale = "en",
    minDate,
    maxDate,
    isDateDisabled,
    showGregorianDate = false,
    fixedWeeks = true,
    dayShape = "circle",
    renderDay,
    classNames,
    components,
    unstyled = false,
    autoFocus = false,
    className,
    id,
    onChange,
    onMonthChange,
  } = props;
  const strings = LOCALES[locale];
  const numerals = props.numerals ?? defaultNumerals(locale);
  const bounds = resolveBounds(minDate, maxDate);
  const titleId = useId();
  const cn = calendarClassNames(classNames, unstyled);
  const parts = resolveComponents(components);

  const handleChange = useCallback(
    (date: BSDate | undefined) => {
      if (date !== undefined) onChange?.(date);
    },
    [onChange],
  );
  const [rawSelected, setSelected] = useControllableState<BSDate | undefined>({
    controlled: "value" in props,
    value: props.value,
    defaultValue: props.defaultValue,
    onChange: handleChange,
  });
  const selected = validOrUndefined(rawSelected);
  const today = useToday(validOrUndefined(props.today));

  // Displayed month.
  const [internalMonth, setInternalMonth] = useState<BSMonth>(() =>
    initialMonth(props, selected, bounds),
  );
  // Follow a selection that moves to another month from outside (uncontrolled month only).
  const selectedKey = selected ? dateKey(selected) : "";
  const [previousSelectedKey, setPreviousSelectedKey] = useState(selectedKey);
  if (selectedKey !== previousSelectedKey) {
    setPreviousSelectedKey(selectedKey);
    if (selected && !isSameMonth(selected, internalMonth)) setInternalMonth(monthOf(selected));
  }
  const monthControlled = isValidMonth(props.month);
  const displayedMonth = clampMonth(
    monthControlled && props.month ? props.month : internalMonth,
    bounds,
  );
  const setMonth = (month: BSMonth) => {
    const next = clampMonth(month, bounds);
    if (compareMonths(next, displayedMonth) === 0) return;
    if (!monthControlled) setInternalMonth(next);
    onMonthChange?.(next);
  };

  // Roving focus.
  const [focusedDate, setFocusedDate] = useState<BSDate>();
  const tabbable = pickTabbableDate(
    displayedMonth,
    { focused: focusedDate, selected, today },
    bounds,
    isDateDisabled,
  );
  const gridRef = useRef<HTMLTableElement>(null);
  const focusPending = useRef(false);
  useEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    focusTabbableDay(gridRef.current);
  });
  useEffect(() => {
    if (autoFocus) focusTabbableDay(gridRef.current);
  }, [autoFocus]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = keyboardTarget(tabbable, event.key, event.shiftKey, bounds);
    if (target === null) return;
    event.preventDefault();
    setFocusedDate(target);
    if (!isSameMonth(target, displayedMonth)) setMonth(monthOf(target));
    focusPending.current = true;
  };

  const handleSelect = (date: BSDate) => {
    setFocusedDate(date);
    if (!isDayDisabled(date, bounds, isDateDisabled)) setSelected(date);
  };

  return (
    <div
      id={id}
      className={cx(cn("root"), className)}
      lang={locale}
      data-gregorian={showGregorianDate || undefined}
      data-numerals={numerals}
      data-day-shape={dayShape}
    >
      <CalendarHeader
        month={displayedMonth}
        bounds={bounds}
        strings={strings}
        numerals={numerals}
        titleId={titleId}
        cn={cn}
        components={parts}
        onMonthChange={setMonth}
      />
      <CalendarGrid
        month={displayedMonth}
        bounds={bounds}
        strings={strings}
        numerals={numerals}
        titleId={titleId}
        selected={selected}
        today={today}
        tabbable={tabbable}
        isDateDisabled={isDateDisabled}
        showGregorianDate={showGregorianDate}
        fixedWeeks={fixedWeeks}
        renderDay={renderDay}
        cn={cn}
        components={parts}
        gridRef={gridRef}
        onKeyDown={handleKeyDown}
        onSelect={handleSelect}
        onFocusDate={setFocusedDate}
      />
    </div>
  );
}

function focusTabbableDay(grid: HTMLTableElement | null) {
  grid?.querySelector<HTMLElement>('[data-date][tabindex="0"]')?.focus();
}

function initialMonth(
  props: NepaliCalendarProps,
  selected: BSDate | undefined,
  bounds: Bounds,
): BSMonth {
  const fromDate =
    selected ?? validOrUndefined(props.defaultValue) ?? validOrUndefined(props.today);
  const month =
    (isValidMonth(props.month) ? props.month : undefined) ??
    (isValidMonth(props.defaultMonth) ? props.defaultMonth : undefined) ??
    (fromDate ? monthOf(fromDate) : currentMonthInNepal());
  return clampMonth(month, bounds);
}

/**
 * The current month in Nepal. Nepal time (not the device's) so a server and
 * a browser rendering at the same moment agree on the initial month.
 */
function currentMonthInNepal(): BSMonth {
  try {
    return monthOf(todayBs());
  } catch {
    return monthOf(LAST_SUPPORTED_DATE);
  }
}
