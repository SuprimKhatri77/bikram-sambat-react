import {
  formatBsDate,
  fromNepaliDigits,
  isEqualBs,
  parseBsDate,
  type BSDate,
} from "bikram-sambat-ts";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { NepaliCalendar } from "../calendar/NepaliCalendar";
import {
  cx,
  datePickerClassNames,
  resolveComponents,
  type DatePickerClassNames,
  type DatePickerComponents,
} from "../customization";
import { useControllableState } from "../hooks/useControllableState";
import { useIsomorphicLayoutEffect } from "../hooks/useIsomorphicLayoutEffect";
import { LOCALES, defaultNumerals, toNumerals } from "../locale";
import { dateKey, isDayDisabled, resolveBounds, validOrUndefined } from "../model";
import type { CalendarLocale, DayShape, Numerals } from "../types";

/** Props for {@link NepaliDatePicker}. */
export interface NepaliDatePickerProps {
  /**
   * The selected date (controlled). Passing the `value` prop at all, even as
   * `undefined`, makes the picker controlled; `undefined` then means empty.
   */
  value?: BSDate | undefined;
  /** The initial date when uncontrolled. */
  defaultValue?: BSDate | undefined;
  /**
   * Called when the date changes: picked in the calendar, typed as a complete
   * valid date, or cleared (`undefined`).
   */
  onChange?: ((date: BSDate | undefined) => void) | undefined;

  /** The first selectable date (inclusive). */
  minDate?: BSDate | undefined;
  /** The last selectable date (inclusive). */
  maxDate?: BSDate | undefined;
  /** Return `true` to disable a day, in the calendar and for typed input. */
  isDateDisabled?: ((date: BSDate) => boolean) | undefined;

  /** Language for the calendar and labels. Default `"en"`. */
  locale?: CalendarLocale | undefined;
  /** Digits for the input text and the calendar. Defaults to `"devanagari"` for `locale="ne"`. */
  numerals?: Numerals | undefined;
  /** The date the calendar highlights as today (see `NepaliCalendar`). */
  today?: BSDate | undefined;
  /** Show Gregorian (AD) dates in the calendar. Default `false`. */
  showGregorianDate?: boolean | undefined;
  /** Shape of the calendar's day buttons (see `NepaliCalendar`). Default `"circle"`. */
  dayShape?: DayShape | undefined;

  /** Input placeholder. Defaults to the locale's `YYYY-MM-DD` hint. */
  placeholder?: string | undefined;
  /** Show a button that clears the date. Default `false`. */
  clearable?: boolean | undefined;
  /**
   * Where the calendar button goes: after the input (`"end"`, default),
   * before it (`"start"`), or nowhere (`"none"`). With `"none"`, clicking the
   * input or pressing ArrowDown in it opens the calendar, and the input acts
   * as a combobox.
   */
  iconPosition?: "start" | "end" | "none" | undefined;
  /** Disable the whole picker. */
  disabled?: boolean | undefined;
  /** Show the value without allowing changes. */
  readOnly?: boolean | undefined;
  /** Mark the input as required (for native form validation). */
  required?: boolean | undefined;
  /**
   * Form field name. The picker then renders a hidden input holding the
   * selected date as ASCII `YYYY-MM-DD` (empty when no date), whatever the
   * numeral system, so native forms submit a parseable value.
   */
  name?: string | undefined;

  /** `id` for the text input, so a `<label htmlFor>` can point at it. */
  id?: string | undefined;
  "aria-label"?: string | undefined;
  "aria-labelledby"?: string | undefined;
  "aria-describedby"?: string | undefined;

  /**
   * Class names for each part, added to the default `nc-*` classes. The
   * `calendar` key takes the calendar's own class names.
   */
  classNames?: Partial<DatePickerClassNames> | undefined;
  /**
   * Replace parts with your own components: the calendar's (`NavButton`,
   * `Chevron`, `Select`, `DayButton`) plus `TriggerIcon` and `ClearIcon`.
   * Define them outside your component so they keep their identity.
   */
  components?: Partial<DatePickerComponents> | undefined;
  /** Leave out the default `nc-*` class names (see `NepaliCalendar`'s `unstyled`). */
  unstyled?: boolean | undefined;
  /** Extra class name for the root element (same as `classNames.root`). */
  className?: string | undefined;
}

interface Placement {
  side: "bottom" | "top";
  align: "start" | "end";
}

/**
 * A text input with a calendar popover for choosing a Bikram Sambat date.
 *
 * The input accepts `YYYY-MM-DD` in Latin or Devanagari digits; a date is
 * only committed once it is complete, valid and selectable, so partial or
 * invalid text never produces a date. The popover opens from the calendar
 * button (or Alt+ArrowDown in the input), moves focus into the calendar,
 * and closes on selection, Escape, an outside click or focus leaving it.
 *
 * @example
 * const [date, setDate] = useState<BSDate>();
 * <label htmlFor="dob">Date of birth</label>
 * <NepaliDatePicker id="dob" value={date} onChange={setDate} />
 */
export function NepaliDatePicker(props: NepaliDatePickerProps) {
  const {
    locale = "en",
    minDate,
    maxDate,
    isDateDisabled,
    today,
    showGregorianDate = false,
    dayShape,
    placeholder,
    clearable = false,
    iconPosition = "end",
    disabled = false,
    readOnly = false,
    required,
    name,
    classNames,
    components,
    unstyled = false,
    className,
    onChange,
  } = props;
  const cn = datePickerClassNames(classNames, unstyled);
  const parts = resolveComponents(components);
  const { TriggerIcon, ClearIcon } = parts;
  const strings = LOCALES[locale];
  const numerals = props.numerals ?? defaultNumerals(locale);
  const bounds = resolveBounds(minDate, maxDate);
  const generatedId = useId();
  const inputId = props.id ?? `${generatedId}-input`;
  const popoverId = `${generatedId}-popover`;

  const [rawValue, setValue] = useControllableState<BSDate | undefined>({
    controlled: "value" in props,
    value: props.value,
    defaultValue: props.defaultValue,
    onChange,
  });
  const value = validOrUndefined(rawValue);
  const format = (date: BSDate | undefined) =>
    date ? toNumerals(formatBsDate(date), numerals) : "";
  const keyFor = (date: BSDate | undefined) => `${date ? dateKey(date) : ""}|${numerals}`;

  // The input text is its own state: it can hold partial or invalid text
  // while `value` keeps the last valid date. When `value` changes from
  // outside (or the numeral system changes), the text follows it.
  const [text, setText] = useState(() => format(value));
  const [showInvalid, setShowInvalid] = useState(false);
  const [syncedKey, setSyncedKey] = useState(() => keyFor(value));
  if (keyFor(value) !== syncedKey) {
    setSyncedKey(keyFor(value));
    setText(format(value));
    setShowInvalid(false);
  }
  const commit = (date: BSDate | undefined) => {
    // Mark this value as already reflected in the text, so typing isn't reformatted.
    setSyncedKey(keyFor(date));
    setValue(date);
  };

  const [open, setOpen] = useState(false);
  // Opening from a click in the input keeps focus there for typing; opening
  // from the button or the keyboard moves focus into the calendar.
  const [focusCalendar, setFocusCalendar] = useState(true);
  const [placement, setPlacement] = useState<Placement>({ side: "bottom", align: "start" });
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const interactive = !disabled && !readOnly;

  const openPicker = (moveFocus: boolean) => {
    setFocusCalendar(moveFocus);
    setOpen(true);
  };

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) (triggerRef.current ?? inputRef.current)?.focus();
  };

  const focusCalendarDay = () => {
    popoverRef.current?.querySelector<HTMLElement>('[data-date][tabindex="0"]')?.focus();
  };

  // Close on a pointer press outside the picker (focus stays where the user put it).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Flip the popover above the field, or align it to the field's right edge,
  // when it would overflow the viewport.
  useIsomorphicLayoutEffect(() => {
    if (!open || !rootRef.current || !popoverRef.current) return;
    const field = rootRef.current.getBoundingClientRect();
    const popover = popoverRef.current.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const side =
      field.bottom + popover.height > window.innerHeight && field.top - popover.height >= 0
        ? "top"
        : "bottom";
    const align =
      field.left + popover.width > viewportWidth && field.right - popover.width >= 0
        ? "end"
        : "start";
    // Measuring the DOM has to happen after render, before paint.
    setPlacement((current) =>
      current.side === side && current.align === align ? current : { side, align },
    );
  }, [open]);

  const parseText = (input: string): BSDate | undefined => {
    try {
      const date = parseBsDate(fromNepaliDigits(input.trim()));
      return isDayDisabled(date, bounds, isDateDisabled) ? undefined : date;
    } catch {
      return undefined;
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setText(next);
    setShowInvalid(false);
    if (next.trim() === "") {
      if (value !== undefined) commit(undefined);
      return;
    }
    const date = parseText(next);
    if (date !== undefined && (value === undefined || !isEqualBs(value, date))) commit(date);
  };

  const validateText = () => {
    if (text.trim() === "") return;
    const date = parseText(text);
    if (date === undefined) setShowInvalid(true);
    else if (value !== undefined && isEqualBs(value, date)) setText(format(value));
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && interactive && open) {
      event.preventDefault();
      focusCalendarDay();
    } else if (
      event.key === "ArrowDown" &&
      interactive &&
      (event.altKey || iconPosition === "none")
    ) {
      event.preventDefault();
      openPicker(true);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === "Enter") {
      validateText();
    }
  };

  const handleCalendarChange = (date: BSDate) => {
    setShowInvalid(false);
    if (value === undefined || !isEqualBs(value, date)) {
      setText(format(date));
      commit(date);
    } else {
      setText(format(value));
    }
    close(true);
  };

  const handlePopoverKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    close(true);
  };

  const handlePopoverBlur = (event: FocusEvent<HTMLDivElement>) => {
    // Focus moved somewhere outside the picker (e.g. Tab): don't trap it.
    const next = event.relatedTarget as Node | null;
    if (next !== null && !rootRef.current?.contains(next)) setOpen(false);
  };

  const handleInputClick = () => {
    if (iconPosition === "none" && interactive && !open) openPicker(false);
  };

  const handleInputBlur = (event: FocusEvent<HTMLInputElement>) => {
    validateText();
    const next = event.relatedTarget as Node | null;
    if (open && next !== null && !rootRef.current?.contains(next)) setOpen(false);
  };

  const handleClear = () => {
    setText("");
    setShowInvalid(false);
    if (value !== undefined) commit(undefined);
    inputRef.current?.focus();
  };

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className={cn("trigger")}
      aria-label={value ? `${strings.chooseDate}, ${format(value)}` : strings.chooseDate}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? popoverId : undefined}
      disabled={!interactive}
      onClick={() => (open ? setOpen(false) : openPicker(true))}
    >
      <TriggerIcon className={cn("icon")} />
    </button>
  );

  return (
    <div
      ref={rootRef}
      className={cx(cn("root"), className)}
      lang={locale}
      data-open={open || undefined}
      data-disabled={disabled || undefined}
      data-icon-position={iconPosition}
    >
      <div className={cn("field")}>
        {iconPosition === "start" && trigger}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className={cn("input")}
          value={text}
          placeholder={placeholder ?? strings.placeholder}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-invalid={showInvalid || undefined}
          aria-label={props["aria-label"]}
          aria-labelledby={props["aria-labelledby"]}
          aria-describedby={props["aria-describedby"]}
          {...(iconPosition === "none" && {
            role: "combobox",
            "aria-haspopup": "dialog" as const,
            "aria-expanded": open,
            "aria-controls": open ? popoverId : undefined,
          })}
          onChange={handleInputChange}
          onClick={handleInputClick}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
        />
        {clearable && interactive && value !== undefined && (
          <button
            type="button"
            className={cn("clear")}
            aria-label={strings.clearDate}
            onClick={handleClear}
          >
            <ClearIcon className={cn("icon")} />
          </button>
        )}
        {iconPosition === "end" && trigger}
      </div>
      {name !== undefined && (
        <input type="hidden" name={name} value={value ? formatBsDate(value) : ""} />
      )}
      {open && (
        // A non-modal dialog handles Escape itself; its controls stay natively focusable.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <div
          ref={popoverRef}
          id={popoverId}
          role="dialog"
          aria-label={strings.chooseDate}
          className={cn("popover")}
          data-side={placement.side}
          data-align={placement.align}
          onKeyDown={handlePopoverKeyDown}
          onBlur={handlePopoverBlur}
        >
          <NepaliCalendar
            value={value}
            onChange={handleCalendarChange}
            minDate={minDate}
            maxDate={maxDate}
            isDateDisabled={isDateDisabled}
            locale={locale}
            numerals={numerals}
            today={today}
            showGregorianDate={showGregorianDate}
            dayShape={dayShape}
            classNames={classNames?.calendar}
            components={parts}
            unstyled={unstyled}
            autoFocus={focusCalendar}
          />
        </div>
      )}
    </div>
  );
}
