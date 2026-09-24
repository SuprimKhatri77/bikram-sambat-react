import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  NepaliCalendar,
  NepaliDatePicker,
  type BSDate,
  type CalendarLocale,
  type ChevronProps,
  type DayButtonProps,
  type DayShape,
} from "../src";
import "../src/styles.css";
import "./playground.css";

// Custom parts for the "unstyled" demo, defined outside App so they keep their identity.
function ArrowChevron({ direction }: ChevronProps) {
  return <span aria-hidden="true">{direction === "previous" ? "←" : "→"}</span>;
}

function DotDay({ date, state, children, ...props }: DayButtonProps) {
  return (
    <button type="button" {...props}>
      {children}
      {date.day % 7 === 0 && !state.selected ? <i className="demo-dot" /> : null}
    </button>
  );
}

function App() {
  const [date, setDate] = useState<BSDate | undefined>({ year: 2083, month: 6, day: 15 });
  const [pickerDate, setPickerDate] = useState<BSDate>();
  const [locale, setLocale] = useState<CalendarLocale>("en");
  const [dark, setDark] = useState(false);
  const [gregorian, setGregorian] = useState(false);
  const [dayShape, setDayShape] = useState<DayShape>("circle");
  const [iconPosition, setIconPosition] = useState<"start" | "end" | "none">("end");

  return (
    <main className={dark ? "dark" : undefined} data-testid="app">
      <h1>bikram-sambat-react</h1>
      <div className="controls">
        <label>
          Locale{" "}
          <select value={locale} onChange={(e) => setLocale(e.target.value as CalendarLocale)}>
            <option value="en">English</option>
            <option value="ne">नेपाली</option>
          </select>
        </label>
        <label>
          Shape{" "}
          <select value={dayShape} onChange={(e) => setDayShape(e.target.value as DayShape)}>
            <option value="circle">circle</option>
            <option value="rounded">rounded</option>
            <option value="square">square</option>
          </select>
        </label>
        <label>
          Icon{" "}
          <select
            value={iconPosition}
            onChange={(e) => setIconPosition(e.target.value as "start" | "end" | "none")}
          >
            <option value="end">end</option>
            <option value="start">start</option>
            <option value="none">none</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} /> Dark
        </label>
        <label>
          <input
            type="checkbox"
            checked={gregorian}
            onChange={(e) => setGregorian(e.target.checked)}
          />{" "}
          Gregorian dates
        </label>
      </div>

      <section>
        <h2>NepaliCalendar</h2>
        <NepaliCalendar
          value={date}
          onChange={setDate}
          locale={locale}
          showGregorianDate={gregorian}
          dayShape={dayShape}
          today={{ year: 2083, month: 6, day: 7 }}
          isDateDisabled={(d) => d.year === 2083 && d.month === 6 && d.day === 20}
        />
        <p className="note">
          Demo settings: today is pinned to Ashwin 7, and Ashwin 20 is disabled on purpose (via{" "}
          <code>isDateDisabled</code>) to show the disabled style.
        </p>
        <p data-testid="calendar-value">
          Selected: {date ? `${date.year}-${date.month}-${date.day}` : "none"}
        </p>
      </section>

      <section>
        <h2>Unstyled + classNames + components</h2>
        <NepaliCalendar
          unstyled
          locale={locale}
          defaultValue={{ year: 2083, month: 6, day: 15 }}
          today={{ year: 2083, month: 6, day: 7 }}
          classNames={{
            root: "demo-root",
            header: "demo-header",
            nav: "demo-nav",
            select: "demo-select",
            weekday: "demo-weekday",
            day: "demo-day",
            selected: "demo-selected",
            today: "demo-today",
          }}
          components={{ Chevron: ArrowChevron, DayButton: DotDay }}
        />
      </section>

      <section>
        <h2>NepaliDatePicker</h2>
        <label htmlFor="picker">Date of birth</label>
        <br />
        <NepaliDatePicker
          id="picker"
          value={pickerDate}
          onChange={setPickerDate}
          locale={locale}
          showGregorianDate={gregorian}
          dayShape={dayShape}
          clearable
          iconPosition={iconPosition}
          name="dob"
          maxDate={{ year: 2083, month: 6, day: 30 }}
        />
        <p className="note">
          Demo settings: <code>maxDate</code> is Ashwin 30, 2083, so later days are disabled.
        </p>
        <p data-testid="picker-value">
          Selected:{" "}
          {pickerDate ? `${pickerDate.year}-${pickerDate.month}-${pickerDate.day}` : "none"}
        </p>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
