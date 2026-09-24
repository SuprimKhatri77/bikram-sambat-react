import { getBsMonthName, getBsMonthNameNepali } from "bikram-sambat-ts";
import {
  VISUALLY_HIDDEN,
  type CalendarClassNameResolver,
  type CalendarComponents,
} from "../customization";
import { formatInLocale, toNumerals, type LocaleStrings } from "../locale";
import { clampMonth, compareMonths, monthOf, shiftMonth, type Bounds } from "../model";
import type { BSMonth, Numerals } from "../types";

interface CalendarHeaderProps {
  month: BSMonth;
  bounds: Bounds;
  strings: LocaleStrings;
  numerals: Numerals;
  titleId: string;
  cn: CalendarClassNameResolver;
  components: CalendarComponents;
  onMonthChange: (month: BSMonth) => void;
}

/** Previous/next buttons, month and year selects, and the live month title. */
export function CalendarHeader({
  month,
  bounds,
  strings,
  numerals,
  titleId,
  cn,
  components: { NavButton, Chevron, Select },
  onMonthChange,
}: CalendarHeaderProps) {
  const first = monthOf(bounds.min);
  const last = monthOf(bounds.max);
  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const monthName = strings.nepali ? getBsMonthNameNepali : getBsMonthName;

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const option = { year: month.year, month: i + 1 };
    return {
      value: option.month,
      label: monthName(option.month),
      disabled: compareMonths(option, first) < 0 || compareMonths(option, last) > 0,
    };
  });
  const yearOptions = [];
  for (let year = first.year; year <= last.year; year++) {
    yearOptions.push({ value: year, label: toNumerals(year, numerals), disabled: false });
  }

  return (
    <div className={cn("header")}>
      <h2 id={titleId} style={VISUALLY_HIDDEN} aria-live="polite">
        {formatInLocale({ ...month, day: 1 }, strings.titleLayout, strings, numerals)}
      </h2>
      <NavButton
        direction="previous"
        className={cn("nav", "navPrevious")}
        aria-label={strings.previousMonth}
        disabled={compareMonths(previous, first) < 0}
        onClick={() => onMonthChange(previous)}
      >
        <Chevron direction="previous" className={cn("icon")} />
      </NavButton>
      <div className={cn("selects")}>
        <Select
          kind="month"
          className={cn("select", "selectMonth")}
          aria-label={strings.month}
          value={month.month}
          options={monthOptions}
          onChange={(value) => onMonthChange(clampMonth({ ...month, month: value }, bounds))}
        />
        <Select
          kind="year"
          className={cn("select", "selectYear")}
          aria-label={strings.year}
          value={month.year}
          options={yearOptions}
          onChange={(value) => onMonthChange(clampMonth({ ...month, year: value }, bounds))}
        />
      </div>
      <NavButton
        direction="next"
        className={cn("nav", "navNext")}
        aria-label={strings.nextMonth}
        disabled={compareMonths(next, last) > 0}
        onClick={() => onMonthChange(next)}
      >
        <Chevron direction="next" className={cn("icon")} />
      </NavButton>
    </div>
  );
}
