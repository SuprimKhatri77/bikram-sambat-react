# bikram-sambat-react

Accessible React components for selecting and displaying Bikram Sambat (BS)
dates, the calendar used in Nepal.

It's the UI layer for [bikram-sambat-ts](https://www.npmjs.com/package/bikram-sambat-ts),
which does all the calendar work: conversion, month lengths, weekdays,
arithmetic, formatting and the supported range. This package adds
interaction, accessibility and presentation, and contains no calendar data
of its own.

```text
✓ <NepaliCalendar /> and <NepaliDatePicker />
✓ BS 1979–2100, the range bikram-sambat-ts supports
✓ Full keyboard navigation and screen reader labels
✓ English or Nepali labels, Latin or Devanagari digits
✓ Controlled or uncontrolled, min/max and custom disabled days
✓ SSR-safe, hydrates without mismatches, works in the Next.js App Router
✓ Fully restylable: CSS variables, per-part classNames, unstyled mode,
  replaceable parts; no Tailwind, MUI or shadcn required
✓ No network requests, one runtime dependency, React 18 and 19
```

## Installation

```sh
npm install bikram-sambat-react
# or
pnpm add bikram-sambat-react
yarn add bikram-sambat-react
bun add bikram-sambat-react
```

`bikram-sambat-ts` is installed with it as a dependency. React and React DOM
18 or 19 are peer dependencies.

Import the default styles once, e.g. in your app's entry file or root layout:

```ts
import "bikram-sambat-react/styles.css";
```

The components render without it, but unstyled.

## Usage

### Calendar

```tsx
import { useState } from "react";
import { NepaliCalendar, type BSDate } from "bikram-sambat-react";
import "bikram-sambat-react/styles.css";

function App() {
  const [date, setDate] = useState<BSDate>({ year: 2083, month: 6, day: 15 });
  return <NepaliCalendar value={date} onChange={setDate} />;
}
```

BS months are **1-based**: 1 is Baisakh, 12 is Chaitra. `BSDate` is the same
type bikram-sambat-ts exports, so values go straight into its functions:

```ts
import { bsToAd, formatBsDate } from "bikram-sambat-ts";

bsToAd(date); // a Date at local midnight of the AD day
formatBsDate(date, "dddd, MMMM D, YYYY"); // "Thursday, Ashwin 15, 2083"
```

### Date picker

```tsx
import { useState } from "react";
import { NepaliDatePicker, type BSDate } from "bikram-sambat-react";

function BirthDateField() {
  const [date, setDate] = useState<BSDate>();
  return (
    <>
      <label htmlFor="dob">Date of birth</label>
      <NepaliDatePicker id="dob" value={date} onChange={setDate} clearable />
    </>
  );
}
```

The calendar button goes after the input by default. Use `iconPosition="start"`
to put it before the input, or `iconPosition="none"` to leave it out. With
`"none"`, the input itself opens the calendar: clicking it opens the calendar
while you keep typing, and ↓ moves into the calendar (the WAI-ARIA
combobox date picker pattern).

```tsx
<NepaliDatePicker iconPosition="start" />
<NepaliDatePicker iconPosition="none" />
```

The input accepts `YYYY-MM-DD` in Latin or Devanagari digits. A date is only
committed once the text is complete, valid and selectable; partial or invalid
text never produces a date, and invalid text is marked `aria-invalid` after
the input loses focus (not while typing). Clearing the text calls
`onChange(undefined)`.

### Controlled and uncontrolled

Both components follow React's usual `value` / `defaultValue` / `onChange`
contract.

```tsx
// Controlled: you own the state.
<NepaliCalendar value={date} onChange={setDate} />

// Uncontrolled: the component owns it; onChange is just a notification.
<NepaliCalendar defaultValue={{ year: 2083, month: 6, day: 15 }} onChange={console.log} />
```

Passing the `value` prop at all, even as `undefined`, makes a component
controlled, so `useState<BSDate>()` works as expected: `undefined` means
"nothing selected".

The displayed month can be controlled too, with `month` and `onMonthChange`,
or seeded with `defaultMonth`:

```tsx
const [month, setMonth] = useState({ year: 2083, month: 6 });
<NepaliCalendar month={month} onMonthChange={setMonth} />;
```

### Minimum and maximum dates

```tsx
<NepaliDatePicker
  minDate={{ year: 2083, month: 1, day: 1 }}
  maxDate={{ year: 2083, month: 12, day: 30 }}
  value={date}
  onChange={setDate}
/>
```

Days outside the range are disabled, keyboard navigation stops at them, and
month/year navigation doesn't go past them. Typed dates outside the range
are rejected.

### Disabling days

```tsx
// Disable Saturdays (the weekly holiday in Nepal).
import { getBsDayOfWeek } from "bikram-sambat-ts";

<NepaliCalendar isDateDisabled={(date) => getBsDayOfWeek(date) === 6} />;
```

Disabled days can still receive keyboard focus (so screen reader users can
hear them), are announced as disabled, and can't be selected.

### Localization

```tsx
<NepaliCalendar locale="ne" />                     // असोज २०८३, आइत सोम …, Devanagari digits
<NepaliCalendar locale="ne" numerals="latin" />    // Nepali names, 0–9 digits
<NepaliCalendar numerals="devanagari" />           // English names, ०–९ digits
```

`locale` sets month names, weekday names and every button and accessible
label. `numerals` defaults to Devanagari for `locale="ne"` and Latin
otherwise. Month and weekday names come from bikram-sambat-ts, spelled as
Hamro Patro spells them.

### Day shape

```tsx
<NepaliCalendar dayShape="circle" />   // default
<NepaliCalendar dayShape="rounded" />  // rounded squares (follows --nc-radius)
<NepaliCalendar dayShape="square" />
```

The shape applies to the selected day, today's ring and the hover highlight.
For anything else, keep the default and set `--nc-day-radius` (e.g.
`0.75rem`), or style `.nc-calendar-day` yourself. `NepaliDatePicker` takes
`dayShape` too.

### Gregorian dates

```tsx
<NepaliCalendar showGregorianDate />
```

Shows each day's AD date in small text under the BS day number,
without changing the calendar's size, naming the
AD month on its 1st and on the BS month's 1st. The AD date is also added to
each day's accessible label.

### Custom day content

```tsx
<NepaliCalendar
  renderDay={(date) => (
    <>
      {date.day}
      {holidays.has(`${date.month}-${date.day}`) && <span className="holiday-dot" />}
    </>
  )}
/>
```

`renderDay` replaces only the content of the day button; the button, its
label, its state attributes and its keyboard behavior stay the calendar's.
This package doesn't ship holiday data.

### Forms

`NepaliDatePicker` works with plain `value`/`onChange`, so it fits any form
library. For native forms, give it a `name`: it then renders a hidden input
holding the date as ASCII `YYYY-MM-DD` (empty when no date), whatever the
numeral system.

```tsx
<form action="/save">
  <NepaliDatePicker name="dob" locale="ne" defaultValue={{ year: 2083, month: 6, day: 15 }} />
</form>
// submits dob=2083-06-15
```

## Styling and customization

Nothing about the look is locked in. There are four levels, and you can mix
them:

1. **Use the default stylesheet** and adjust it with CSS variables.
2. **Add your own classes** to any part with `classNames` (works with
   Tailwind, CSS modules or plain CSS).
3. **Go fully unstyled**: skip `styles.css`, or pass `unstyled` to drop the
   default classes from one component.
4. **Replace parts** (navigation buttons, icons, month/year selects, day
   buttons) with your own components via `components`.

In every case the behavior stays the package's: keyboard navigation, focus
management, labels and ARIA states keep working.

### Default stylesheet and CSS variables

```css
.nc-calendar,
.nc-date-picker {
  --nc-primary: #1d4ed8; /* selected day, today ring, Saturday header */
  --nc-radius: 0.75rem;
  --nc-cell-size: 2.25rem;
  --nc-font: "Mukta", system-ui, sans-serif;
}
```

| Variable                                  | Used for                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------- |
| `--nc-background`, `--nc-foreground`      | surface and text                                                                   |
| `--nc-muted`, `--nc-muted-foreground`     | subtle surfaces, weekday and AD text                                               |
| `--nc-border`                             | borders                                                                            |
| `--nc-primary`, `--nc-primary-foreground` | selected day, today, invalid input                                                 |
| `--nc-hover`                              | hover background                                                                   |
| `--nc-focus`                              | focus outline, focused input border                                                |
| `--nc-disabled`                           | disabled days and buttons                                                          |
| `--nc-radius`, `--nc-shadow`              | corners, popover shadow                                                            |
| `--nc-day-radius`                         | day shape for `dayShape="circle"` (default `50%`); any radius gives a custom shape |
| `--nc-cell-size`, `--nc-font`             | day cell size, font                                                                |

**Dark mode**: a dark palette applies inside any `.dark` or
`[data-theme="dark"]` ancestor (the conventions of Tailwind, next-themes and
most docs sites), or with `className="nc-dark"` on a component. It doesn't
follow `prefers-color-scheme` on its own, so it never turns dark on a light
page.

### `classNames`

Pass a class for any part. It's added after the part's default `nc-*` class,
so it can extend the default styles, or fully replace them together with
`unstyled`.

```tsx
<NepaliCalendar
  unstyled
  classNames={{
    root: "rounded-xl border bg-white p-3 shadow-sm",
    header: "mb-2 flex items-center justify-between",
    nav: "size-8 rounded-md hover:bg-gray-100 disabled:opacity-40",
    select: "rounded-md bg-transparent px-1 font-semibold",
    weekday: "size-9 text-xs font-normal text-gray-500",
    day: "size-9 rounded-md text-sm hover:bg-gray-100",
    selected: "bg-red-700 text-white hover:bg-red-700",
    today: "ring-1 ring-red-700",
    disabled: "text-gray-300 line-through",
  }}
/>
```

| Key                                        | Part                                                     |
| ------------------------------------------ | -------------------------------------------------------- |
| `root`                                     | the calendar                                             |
| `header`                                   | the row with the navigation and selects                  |
| `nav`, `navPrevious`, `navNext`            | both / the previous / the next month button              |
| `selects`                                  | the wrapper around the month and year selects            |
| `select`, `selectMonth`, `selectYear`      | both / the month / the year select                       |
| `grid`                                     | the `<table role="grid">`                                |
| `weekdays`, `weekday`                      | the weekday row / each weekday header                    |
| `week`, `cell`                             | each week row / each cell (empty ones have `data-empty`) |
| `day`                                      | each day button                                          |
| `dayNumber`, `dayGregorian`                | the day number / the AD date inside a day button         |
| `selected`, `today`, `disabled`, `focused` | added to day buttons in that state                       |
| `icon`                                     | the built-in SVG icons                                   |

`NepaliDatePicker` takes `root`, `field`, `input`, `clear`, `trigger`,
`popover` and `icon`, plus `calendar` for the calendar inside it:

```tsx
<NepaliDatePicker
  classNames={{
    input: "font-mono",
    popover: "mt-2",
    calendar: { selected: "bg-indigo-600 text-white" },
  }}
/>
```

### Unstyled

- **Skip the stylesheet** and nothing is styled: you get plain, accessible
  markup to style however you like.
- **`unstyled`** leaves the `nc-*` classes off one component, so the default
  stylesheet doesn't reach it even when your app loads it for other
  calendars. Your `classNames` still apply.

The month title, which only screen readers should hear, stays hidden
without any stylesheet. Everything else is up to you, including the date
picker's popover position. The default stylesheet uses
`position: absolute` under the field.

### State attributes

Every component also exposes its state as data attributes, which stay in
place with `unstyled`. You can target them from CSS, or with Tailwind's
`data-[selected]:` variants.

| Element     | Attributes                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| calendar    | `data-day-shape`, `data-numerals`, `data-gregorian` (with `showGregorianDate`)                                            |
| day button  | `data-selected`, `data-today`, `data-disabled`, `data-focused`, `data-date="YYYY-MM-DD"`                                  |
| empty cell  | `data-empty`                                                                                                              |
| date picker | `data-open`, `data-disabled`, `data-icon-position`; popover: `data-side="bottom" \| "top"`, `data-align="start" \| "end"` |

```css
.nc-calendar-day[data-selected] {
  border-radius: 999px;
}
```

### `components`

Replace parts with your own components. The package passes each one the
props that make it work (labels, `disabled`, handlers, `tabIndex`,
`data-date`, …). Spread them onto your element.

```tsx
import type { DayButtonProps, NavButtonProps, SelectProps } from "bikram-sambat-react";

// Define these outside your components so they keep their identity between renders.
function NavButton({ direction, ...props }: NavButtonProps) {
  return <MyIconButton {...props} />;
}

function DayButton({ date, state, children, ...props }: DayButtonProps) {
  return (
    <button {...props}>
      {children}
      {holidays.has(`${date.month}-${date.day}`) && <span className="dot" />}
    </button>
  );
}

// Any control works, not just <select>: call onChange with an option's value.
function Select({ kind, value, options, onChange, className, ...rest }: SelectProps) {
  return (
    <MySelect aria-label={rest["aria-label"]} value={value} onValueChange={onChange}>
      {options.map((o) => (
        <MyOption key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </MyOption>
      ))}
    </MySelect>
  );
}

<NepaliCalendar components={{ NavButton, DayButton, Select }} />;
```

| Component     | Replaces                    | Props                                                                                              |
| ------------- | --------------------------- | -------------------------------------------------------------------------------------------------- |
| `NavButton`   | previous/next month buttons | `direction` + button attributes                                                                    |
| `Chevron`     | the arrows inside them      | `direction`, `className`                                                                           |
| `Select`      | the month and year selects  | `kind`, `value`, `options` (`{ value, label, disabled }[]`), `onChange`, `aria-label`, `className` |
| `DayButton`   | each day's button           | `date`, `state` + button attributes and `children`                                                 |
| `TriggerIcon` | the picker's calendar icon  | `className`                                                                                        |
| `ClearIcon`   | the picker's clear icon     | `className`                                                                                        |

`NepaliDatePicker` accepts all six and passes the calendar's parts on to its
calendar. For only the _content_ of a day, `renderDay` is simpler than a
`DayButton`.

### Building your own picker

`NepaliDatePicker` is a convenience. If you want your own trigger, popover
library or layout, put `NepaliCalendar` inside it:

```tsx
function MyPicker() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<BSDate>();
  return (
    <MyPopover open={open} onOpenChange={setOpen}>
      <MyPopover.Trigger>{date ? formatBsDate(date) : "Pick a date"}</MyPopover.Trigger>
      <MyPopover.Content>
        <NepaliCalendar
          autoFocus
          value={date}
          onChange={(d) => {
            setDate(d);
            setOpen(false);
          }}
        />
      </MyPopover.Content>
    </MyPopover>
  );
}
```

`autoFocus` moves focus onto the selected day (or today) when the calendar
opens, and every keyboard interaction works inside any popover. For a typed
input, `parseBsDate` and `formatBsDate` from bikram-sambat-ts handle the
`YYYY-MM-DD` text.

## Accessibility

The calendar follows the
[WAI-ARIA APG date picker](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)
grid pattern:

- The month is a `role="grid"` table labelled by the month and year, with
  column headers (`<abbr title="Sunday">Sun</abbr>`).
- Each day is a button labelled with its full date, e.g. "Thursday, 15
  Ashwin 2083" or "२०८३ असोज १५, बिहिवार". Selected days have
  `aria-selected`, today has `aria-current="date"`, disabled days have
  `aria-disabled`.
- Only one day is in the tab order (roving tabindex): the focused day, else
  the selected day, else today, else the first selectable day.
- The month title is a polite live region, so month changes are announced.
- Navigation buttons have text labels ("Previous month", "अघिल्लो महिना").
- States aren't shown by color alone: selected is filled and bold, today has
  a ring and a dot, disabled is struck through.

| Key                     | Action                                                                       |
| ----------------------- | ---------------------------------------------------------------------------- |
| ← / →                   | previous / next day                                                          |
| ↑ / ↓                   | previous / next week                                                         |
| Home / End              | first / last day of the week (Sunday–Saturday)                               |
| PageUp / PageDown       | previous / next month (the day is clamped, e.g. 32 → 31)                     |
| Shift+PageUp / PageDown | previous / next year                                                         |
| Enter / Space           | select the focused day                                                       |
| Alt+↓ (in the input)    | open the date picker (↓ alone with `iconPosition="none"`, or once it's open) |
| Escape                  | close the date picker, focus back on its button                              |

Moving past the edge of the month shows the next or previous month, and
focus never goes outside `minDate`/`maxDate` or BS 1979–2100.

The date picker's popover is a non-modal `role="dialog"`: it takes focus
when opened, gives it back to the calendar button after a selection or
Escape, and closes when focus or a click goes elsewhere, so keyboard users
are never trapped.

Automated checks (axe-core) run in the test suite; they don't replace testing
with real screen readers.

## Server rendering and Next.js

The package is safe to import on a server: it touches no browser globals at
import time, and the built entry starts with `"use client"`, so you can use
the components directly from Server Components in the Next.js App Router.

What "today" is depends on the device's clock and timezone, so it isn't
known during server rendering. The calendar highlights today only after
hydration (on the device's local date), which keeps server and client
markup identical. Components mounted later, like the date picker's popover,
know today on their first render. To render today on the server too, pass it
yourself:

```tsx
import { todayBs } from "bikram-sambat-ts";

<NepaliCalendar today={todayBs()} />; // today in Nepal, UTC+05:45
```

Without `value`, `defaultMonth` or `today`, the initial month is the current
month in Nepal (`todayBs()`), which the server and the browser agree on.

## API

```ts
interface BSDate {
  year: number;
  month: number;
  day: number;
} // from bikram-sambat-ts
interface BSMonth {
  year: number;
  month: number;
} // month is 1-based
type CalendarLocale = "en" | "ne";
type Numerals = "latin" | "devanagari";
interface DayState {
  selected: boolean;
  today: boolean;
  disabled: boolean;
  focused: boolean;
}
```

### `<NepaliCalendar />`

| Prop                | Type                                                 | Default                                      |
| ------------------- | ---------------------------------------------------- | -------------------------------------------- |
| `value`             | `BSDate \| undefined`                                | (uncontrolled)                               |
| `defaultValue`      | `BSDate`                                             |                                              |
| `onChange`          | `(date: BSDate) => void`                             |                                              |
| `month`             | `BSMonth`                                            | (uncontrolled)                               |
| `defaultMonth`      | `BSMonth`                                            | month of the value, `today`, or now in Nepal |
| `onMonthChange`     | `(month: BSMonth) => void`                           |                                              |
| `minDate`           | `BSDate`                                             | 1979-01-01                                   |
| `maxDate`           | `BSDate`                                             | last day of 2100                             |
| `isDateDisabled`    | `(date: BSDate) => boolean`                          |                                              |
| `locale`            | `"en" \| "ne"`                                       | `"en"`                                       |
| `numerals`          | `"latin" \| "devanagari"`                            | from `locale`                                |
| `today`             | `BSDate`                                             | device's date, after hydration               |
| `showGregorianDate` | `boolean`                                            | `false`                                      |
| `dayShape`          | `"circle" \| "rounded" \| "square"`                  | `"circle"`                                   |
| `fixedWeeks`        | `boolean` (always 6 rows, so the height never jumps) | `true`                                       |
| `renderDay`         | `(date: BSDate, state: DayState) => ReactNode`       |                                              |
| `classNames`        | `Partial<CalendarClassNames>`                        |                                              |
| `components`        | `Partial<CalendarComponents>`                        |                                              |
| `unstyled`          | `boolean`                                            | `false`                                      |
| `autoFocus`         | `boolean`                                            | `false`                                      |
| `className`, `id`   | `string`                                             |                                              |

`onChange` fires on every selection, including re-selecting the selected day.
Invalid dates passed as `value`, `minDate` etc. are ignored rather than
thrown.

### `<NepaliDatePicker />`

Everything from the calendar's `value`, `defaultValue`, `minDate`, `maxDate`,
`isDateDisabled`, `locale`, `numerals`, `today`, `showGregorianDate` and
`dayShape`, plus:

| Prop                                                | Type                                  | Default                             |
| --------------------------------------------------- | ------------------------------------- | ----------------------------------- |
| `onChange`                                          | `(date: BSDate \| undefined) => void` |                                     |
| `placeholder`                                       | `string`                              | `"YYYY-MM-DD"` / `"वर्ष-महिना-गते"` |
| `clearable`                                         | `boolean`                             | `false`                             |
| `iconPosition`                                      | `"end" \| "start" \| "none"`          | `"end"`                             |
| `disabled`                                          | `boolean`                             | `false`                             |
| `readOnly`                                          | `boolean`                             | `false`                             |
| `required`                                          | `boolean`                             |                                     |
| `name`                                              | `string`                              | (no hidden input)                   |
| `id`                                                | `string`                              | (the text input's id)               |
| `aria-label`, `aria-labelledby`, `aria-describedby` | `string`                              |                                     |
| `classNames`                                        | `Partial<DatePickerClassNames>`       |                                     |
| `components`                                        | `Partial<DatePickerComponents>`       |                                     |
| `unstyled`                                          | `boolean`                             | `false`                             |
| `className`                                         | `string`                              |                                     |

## Supported range

BS **1979-01-01 to 2100-12-31** (AD 1922-04-13 to 2044-04-13), exactly the
range of bikram-sambat-ts (`MIN_BS_YEAR`–`MAX_BS_YEAR`). Navigation, the year
list, keyboard movement and typed input all stop at these bounds. When
bikram-sambat-ts extends its data, this package follows without changes.

bikram-sambat-ts documents the data's sources and
[known issues](https://github.com/SuprimKhatri77/bikram-sambat-ts#calendar-data-and-accuracy):
the data for BS 1979–1999 and around 2085–2100 is less certain.

## Not in v0.1

Range selection, weeks starting on Monday, showing adjacent months' days,
custom input formats, multiple months, holiday data, and refreshing the
"today" highlight at midnight. See [CHANGELOG.md](CHANGELOG.md).

## Related

- [bikram-sambat-ts](https://www.npmjs.com/package/bikram-sambat-ts): the
  TypeScript date engine this package is built on
- [go-bs](https://github.com/suprimkhatri77/go-bs): the Go reference
  implementation both are verified against

## License

[MIT](LICENSE)
