# Changelog

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
