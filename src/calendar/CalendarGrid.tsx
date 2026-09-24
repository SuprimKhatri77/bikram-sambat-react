import {
  bsToAd,
  firstWeekdayOfBsMonth,
  getBsMonthCalendar,
  isEqualBs,
  type BSDate,
} from "bikram-sambat-ts";
import type { KeyboardEvent, ReactNode, Ref } from "react";
import type { CalendarClassNameResolver, CalendarComponents } from "../customization";
import { formatInLocale, toNumerals, type LocaleStrings } from "../locale";
import { dateKey, isDayDisabled, isSameMonth, type Bounds } from "../model";
import type { BSMonth, DayState, Numerals } from "../types";

interface CalendarGridProps {
  month: BSMonth;
  bounds: Bounds;
  strings: LocaleStrings;
  numerals: Numerals;
  titleId: string;
  selected: BSDate | undefined;
  today: BSDate | undefined;
  tabbable: BSDate;
  isDateDisabled: ((date: BSDate) => boolean) | undefined;
  showGregorianDate: boolean;
  fixedWeeks: boolean;
  renderDay: ((date: BSDate, state: DayState) => ReactNode) | undefined;
  cn: CalendarClassNameResolver;
  components: CalendarComponents;
  gridRef: Ref<HTMLTableElement>;
  onKeyDown: (event: KeyboardEvent<HTMLTableElement>) => void;
  onSelect: (date: BSDate) => void;
  onFocusDate: (date: BSDate) => void;
}

/** The weekday header row and the month's day cells (Sunday first). */
export function CalendarGrid({
  month,
  bounds,
  strings,
  numerals,
  titleId,
  selected,
  today,
  tabbable,
  isDateDisabled,
  showGregorianDate,
  fixedWeeks,
  renderDay,
  cn,
  components,
  gridRef,
  onKeyDown,
  onSelect,
  onFocusDate,
}: CalendarGridProps) {
  // A date in this month for each weekday, so the header names come from
  // formatBsDate's own "ddd"/"dddd" tokens. Every BS month has ≥ 29 days.
  const firstWeekday = firstWeekdayOfBsMonth(month.year, month.month);
  const weekdays = Array.from({ length: 7 }, (_, weekday) => {
    const date = { ...month, day: 1 + ((weekday - firstWeekday + 7) % 7) };
    return {
      short: formatInLocale(date, "ddd", strings, numerals),
      long: formatInLocale(date, "dddd", strings, numerals),
    };
  });
  // If the tabbable day isn't in this month (only possible when `month` is
  // controlled outside the bounds), day 1 keeps the grid reachable by Tab.
  const tabbableDay = isSameMonth(tabbable, month) ? tabbable.day : 1;
  const weeks: (BSDate | null)[][] = getBsMonthCalendar(month.year, month.month);
  // Six rows for every month, so the calendar's height doesn't jump.
  while (fixedWeeks && weeks.length < 6) weeks.push(Array.from({ length: 7 }, () => null));

  return (
    <table
      ref={gridRef}
      role="grid"
      className={cn("grid")}
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
    >
      <thead>
        <tr className={cn("weekdays")}>
          {weekdays.map(({ short, long }) => (
            <th key={long} scope="col" className={cn("weekday")}>
              <abbr title={long}>{short}</abbr>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week, row) => (
          <tr key={row} className={cn("week")}>
            {week.map((date, column) =>
              date === null ? (
                <td key={column} className={cn("cell")} data-empty="" />
              ) : (
                <CalendarDay
                  key={column}
                  date={date}
                  strings={strings}
                  numerals={numerals}
                  state={{
                    selected: selected !== undefined && isEqualBs(selected, date),
                    today: today !== undefined && isEqualBs(today, date),
                    disabled: isDayDisabled(date, bounds, isDateDisabled),
                    focused: date.day === tabbableDay,
                  }}
                  showGregorianDate={showGregorianDate}
                  renderDay={renderDay}
                  cn={cn}
                  DayButton={components.DayButton}
                  onSelect={onSelect}
                  onFocusDate={onFocusDate}
                />
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface CalendarDayProps {
  date: BSDate;
  strings: LocaleStrings;
  numerals: Numerals;
  state: DayState;
  showGregorianDate: boolean;
  renderDay: ((date: BSDate, state: DayState) => ReactNode) | undefined;
  cn: CalendarClassNameResolver;
  DayButton: CalendarComponents["DayButton"];
  onSelect: (date: BSDate) => void;
  onFocusDate: (date: BSDate) => void;
}

function CalendarDay({
  date,
  strings,
  numerals,
  state,
  showGregorianDate,
  renderDay,
  cn,
  DayButton,
  onSelect,
  onFocusDate,
}: CalendarDayProps) {
  let label = formatInLocale(date, strings.dayLabelLayout, strings, numerals);
  let gregorian: string | undefined;
  if (showGregorianDate) {
    const ad = bsToAd(date);
    const adDay = toNumerals(ad.getDate(), numerals);
    // Name the AD month where it's needed to read the column: on the 1st of
    // the AD month and on the 1st of the BS month.
    gregorian =
      ad.getDate() === 1 || date.day === 1
        ? `${adDay} ${strings.adMonthsShort[ad.getMonth()] ?? ""}`
        : adDay;
    label += ` (${strings.adLabel(adDay, strings.adMonths[ad.getMonth()] ?? "", toNumerals(ad.getFullYear(), numerals))})`;
  }

  return (
    <td role="gridcell" className={cn("cell")} aria-selected={state.selected}>
      <DayButton
        date={date}
        state={state}
        className={cn(
          "day",
          state.selected && "selected",
          state.today && "today",
          state.disabled && "disabled",
          state.focused && "focused",
        )}
        tabIndex={state.focused ? 0 : -1}
        aria-label={label}
        aria-disabled={state.disabled || undefined}
        aria-current={state.today ? "date" : undefined}
        data-date={dateKey(date)}
        data-selected={state.selected || undefined}
        data-today={state.today || undefined}
        data-disabled={state.disabled || undefined}
        data-focused={state.focused || undefined}
        onClick={() => onSelect(date)}
        onFocus={() => onFocusDate(date)}
      >
        {renderDay ? (
          renderDay(date, state)
        ) : (
          <span className={cn("dayNumber")}>{toNumerals(date.day, numerals)}</span>
        )}
        {gregorian !== undefined && (
          <span className={cn("dayGregorian")} aria-hidden="true">
            {gregorian}
          </span>
        )}
      </DayButton>
    </td>
  );
}
