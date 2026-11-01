# Changelog

## 0.2.0 - 2026-11-01

- `NepaliDatePicker` masks typed input by default (new `mask` prop,
  default `true`):
  - only digits are accepted, Latin or Devanagari, and shown in `numerals`
  - dashes are added as you type, and never re-added while deleting
  - a typed separator where a dash goes is a no-op, and input stops at
    eight digits
  - a separator typed after a one-digit month pads it (`2084-9-` becomes
    `2084-09-`), and a one-digit day is padded on blur, then committed if
    valid (`2084-9-9` becomes `2084-09-09`)
  - pasted or autofilled dates are normalized (`2084/9/9`, `2084.09.09` and
    `20840909` become `2084-09-09`)
  - the caret stays in place when you edit mid-string
  - IME composition is formatted when it ends
  - the input sets `inputMode="numeric"`

  **Behavior change:** the input no longer accepts free text. Pass
  `mask={false}` to keep the 0.1 behavior. Commit semantics are unchanged: a
  date is still committed only when the text is complete, valid and
  selectable.

## 0.1.0 - 2026-09-24

Initial release, built on bikram-sambat-ts 0.3.

- `NepaliCalendar`: a BS month calendar with controlled/uncontrolled
  selection and month, `minDate`/`maxDate`, `isDateDisabled`, `today`,
  `showGregorianDate`, `dayShape` (`"circle"`, `"rounded"`, `"square"`),
  `fixedWeeks` (a constant six-row height) and
  `renderDay`
- `NepaliDatePicker`: a `YYYY-MM-DD` text input (Latin or Devanagari digits)
  with a calendar popover, `clearable`, `disabled`, `readOnly`, `required`,
  a hidden form input via `name`, and `iconPosition` (`"end"`, `"start"`,
  or `"none"` for a combobox-style input)
- Keyboard navigation following the WAI-ARIA APG date picker pattern: arrows,
  Home/End, PageUp/PageDown, Shift+PageUp/PageDown, Enter/Space, Escape,
  Alt+ArrowDown
- Accessible labels, `aria-selected`/`aria-current`/`aria-disabled`, roving
  tabindex, live month announcements
- English and Nepali locales; Latin or Devanagari numerals
- BS 1979–2100, the range of bikram-sambat-ts; all calendar data and math
  come from it
- SSR-safe, `"use client"` entry for React Server Components
- Customization: per-part `classNames` (including state classes), an
  `unstyled` mode, and replaceable parts via `components` (`NavButton`,
  `Chevron`, `Select`, `DayButton`, `TriggerIcon`, `ClearIcon`)
- Optional default styles with CSS variables, a dark palette, and stable
  class names and data attributes
- ESM with TypeScript declarations; React 18 and 19
