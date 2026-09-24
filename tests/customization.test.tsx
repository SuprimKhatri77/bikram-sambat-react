import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  NepaliCalendar,
  NepaliDatePicker,
  type ChevronProps,
  type DayButtonProps,
  type IconProps,
  type NavButtonProps,
  type SelectProps,
} from "../src";
import { day, days, focusedKey } from "./helpers";

const ashwin = { year: 2083, month: 6 };

describe("classNames", () => {
  it("adds classes to each part, next to the defaults", () => {
    const { container } = render(
      <NepaliCalendar
        defaultMonth={ashwin}
        defaultValue={{ year: 2083, month: 6, day: 15 }}
        today={{ year: 2083, month: 6, day: 7 }}
        isDateDisabled={(d) => d.day === 20}
        showGregorianDate
        className="extra"
        classNames={{
          root: "c-root",
          header: "c-header",
          nav: "c-nav",
          navPrevious: "c-prev",
          navNext: "c-next",
          selects: "c-selects",
          select: "c-select",
          selectMonth: "c-month",
          selectYear: "c-year",
          grid: "c-grid",
          weekdays: "c-weekdays",
          weekday: "c-weekday",
          week: "c-week",
          cell: "c-cell",
          day: "c-day",
          dayNumber: "c-number",
          dayGregorian: "c-ad",
          selected: "c-selected",
          today: "c-today",
          disabled: "c-disabled",
          focused: "c-focused",
          icon: "c-icon",
        }}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toBe("nc-calendar c-root extra");
    expect(root.querySelector(".nc-calendar-header.c-header")).not.toBeNull();
    const previous = screen.getByRole("button", { name: "Previous month" });
    expect(previous.className).toBe("nc-calendar-nav nc-calendar-nav-previous c-nav c-prev");
    expect(screen.getByRole("button", { name: "Next month" }).className).toContain("c-next");
    expect(previous.querySelector("svg")?.getAttribute("class")).toBe("nc-icon c-icon");
    expect(screen.getByRole("combobox", { name: "Month" }).className).toBe(
      "nc-calendar-select nc-calendar-select-month c-select c-month",
    );
    expect(screen.getByRole("combobox", { name: "Year" }).className).toContain("c-year");
    expect(root.querySelector(".c-selects")).not.toBeNull();
    expect(screen.getByRole("grid").className).toBe("nc-calendar-grid c-grid");
    expect(root.querySelector("thead tr")?.className).toBe("nc-calendar-weekdays c-weekdays");
    expect(root.querySelectorAll("th.c-weekday")).toHaveLength(7);
    expect(root.querySelectorAll("tbody tr.c-week").length).toBeGreaterThanOrEqual(5);
    expect(root.querySelector("td[data-empty].c-cell")).not.toBeNull();

    const plain = day(container, "2083-06-16");
    expect(plain.className).toBe("nc-calendar-day c-day");
    expect(plain.querySelector(".c-number")).not.toBeNull();
    expect(plain.querySelector(".c-ad")).not.toBeNull();
    expect(day(container, "2083-06-15").className).toBe(
      "nc-calendar-day c-day c-selected c-focused",
    );
    expect(day(container, "2083-06-07").className).toContain("c-today");
    expect(day(container, "2083-06-20").className).toContain("c-disabled");
  });

  it("moves state classes as the state changes", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <NepaliCalendar defaultMonth={ashwin} classNames={{ selected: "is-selected" }} />,
    );
    await user.click(day(container, "2083-06-03"));
    await user.click(day(container, "2083-06-04"));
    expect(container.querySelectorAll(".is-selected")).toHaveLength(1);
    expect(day(container, "2083-06-04").classList.contains("is-selected")).toBe(true);
  });
});

describe("unstyled", () => {
  it("drops the nc-* classes but keeps custom classes and data attributes", () => {
    const { container } = render(
      <NepaliCalendar
        unstyled
        defaultValue={{ year: 2083, month: 6, day: 15 }}
        classNames={{ day: "my-day" }}
      />,
    );
    expect(container.innerHTML).not.toMatch(/class="[^"]*\bnc-/);
    const selected = day(container, "2083-06-15");
    expect(selected.className).toBe("my-day");
    expect(selected.hasAttribute("data-selected")).toBe(true);
    expect(day(container, "2083-06-16").className).toBe("my-day");
  });

  it("keeps the month title visually hidden without any stylesheet", () => {
    render(<NepaliCalendar unstyled defaultMonth={ashwin} />);
    const title = screen.getByRole("heading", { level: 2 });
    expect(title.style.position).toBe("absolute");
    expect(title.style.width).toBe("1px");
    expect(title.style.overflow).toBe("hidden");
  });

  it("applies to the date picker and its calendar", async () => {
    const user = userEvent.setup();
    const { container } = render(<NepaliDatePicker unstyled aria-label="Date" clearable />);
    await user.click(screen.getByRole("button", { name: "Choose date" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(container.innerHTML).not.toMatch(/class="[^"]*\bnc-/);
  });
});

// Custom parts, defined at module level so they keep their identity.
function PillButton({ direction, children, ...props }: NavButtonProps) {
  return (
    <button type="button" data-custom-nav={direction} {...props}>
      {children}
    </button>
  );
}

function TextChevron({ direction }: ChevronProps) {
  return <span data-custom-chevron="">{direction === "previous" ? "‹" : "›"}</span>;
}

// A select that isn't a <select>: a group of buttons.
function ButtonSelect({ kind, value, options, onChange, ...rest }: SelectProps) {
  return (
    <div role="group" aria-label={rest["aria-label"]} data-custom-select={kind}>
      {options
        .filter((option) => !option.disabled)
        .slice(0, 14)
        .map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
    </div>
  );
}

function StarDay({ date, state, children, ...props }: DayButtonProps) {
  return (
    <button type="button" {...props} data-custom-day="">
      {children}
      {state.selected ? " ★" : ""}
      {date.day === 1 ? <small> start</small> : null}
    </button>
  );
}

function PlusIcon({ className }: IconProps) {
  return <span className={className} data-custom-icon="trigger" aria-hidden="true" />;
}

function CrossIcon({ className }: IconProps) {
  return <span className={className} data-custom-icon="clear" aria-hidden="true" />;
}

describe("components", () => {
  it("replaces the navigation buttons, chevrons and selects", async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();
    const { container } = render(
      <NepaliCalendar
        defaultMonth={ashwin}
        onMonthChange={onMonthChange}
        components={{ NavButton: PillButton, Chevron: TextChevron, Select: ButtonSelect }}
      />,
    );
    const next = screen.getByRole("button", { name: "Next month" });
    expect(next.getAttribute("data-custom-nav")).toBe("next");
    expect(next.textContent).toBe("›");
    expect(container.querySelectorAll("[data-custom-chevron]")).toHaveLength(2);
    expect(container.querySelector("select")).toBeNull();

    await user.click(next);
    expect(onMonthChange).toHaveBeenLastCalledWith({ year: 2083, month: 7 });

    const months = screen.getByRole("group", { name: "Month" });
    await user.click(within(months, "Poush"));
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Poush 2083");
    const years = screen.getByRole("group", { name: "Year" });
    await user.click(within(years, "1985"));
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Poush 1985");
  });

  it("passes the month select's disabled options through", () => {
    let captured: SelectProps | undefined;
    function Spy(props: SelectProps) {
      if (props.kind === "month") captured = props;
      return null;
    }
    render(
      <NepaliCalendar
        defaultMonth={ashwin}
        minDate={{ year: 2083, month: 4, day: 1 }}
        maxDate={{ year: 2083, month: 8, day: 1 }}
        components={{ Select: Spy }}
      />,
    );
    expect(captured?.value).toBe(6);
    expect(captured?.options.filter((o) => !o.disabled).map((o) => o.value)).toEqual([
      4, 5, 6, 7, 8,
    ]);
  });

  it("replaces day buttons and keeps selection and keyboard navigation", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [date, setDate] = useState({ year: 2083, month: 6, day: 15 });
      return <NepaliCalendar value={date} onChange={setDate} components={{ DayButton: StarDay }} />;
    }
    const { container } = render(<Controlled />);
    const cells = days(container);
    expect(cells).toHaveLength(31);
    expect(cells.every((cell) => cell.hasAttribute("data-custom-day"))).toBe(true);
    expect(day(container, "2083-06-15").textContent).toBe("15 ★");
    expect(day(container, "2083-06-01").textContent).toBe("1 start");
    // The calendar's label and state attributes are still there.
    expect(day(container, "2083-06-15").getAttribute("aria-label")).toBe(
      "Thursday, 15 Ashwin 2083",
    );
    expect(days(container).filter((d) => d.tabIndex === 0)).toHaveLength(1);

    act(() => day(container, "2083-06-15").focus());
    await user.keyboard("{ArrowRight}{ArrowDown}");
    expect(focusedKey()).toBe("2083-06-23");
    await user.keyboard("{Enter}");
    expect(day(container, "2083-06-23").textContent).toBe("23 ★");
    await user.keyboard("{PageDown}");
    expect(focusedKey()).toBe("2083-07-23");
  });

  it("replaces the date picker's icons and styles its parts", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <NepaliDatePicker
        aria-label="Date"
        clearable
        defaultValue={{ year: 2083, month: 6, day: 15 }}
        components={{ TriggerIcon: PlusIcon, ClearIcon: CrossIcon, DayButton: StarDay }}
        classNames={{
          root: "p-root",
          field: "p-field",
          input: "p-input",
          clear: "p-clear",
          trigger: "p-trigger",
          popover: "p-popover",
          icon: "p-icon",
          calendar: { root: "p-calendar", day: "p-day" },
        }}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toBe("nc-date-picker p-root");
    expect(root.querySelector(".nc-date-picker-field.p-field")).not.toBeNull();
    expect(screen.getByRole("textbox").className).toBe("nc-date-picker-input p-input");
    const clear = screen.getByRole("button", { name: "Clear date" });
    expect(clear.className).toBe("nc-date-picker-clear p-clear");
    expect(clear.querySelector('[data-custom-icon="clear"]')?.className).toBe("nc-icon p-icon");
    const trigger = screen.getByRole("button", { name: /^Choose date/ });
    expect(trigger.className).toBe("nc-date-picker-trigger p-trigger");
    expect(trigger.querySelector('[data-custom-icon="trigger"]')).not.toBeNull();

    await user.click(trigger);
    expect(screen.getByRole("dialog").className).toBe("nc-date-picker-popover p-popover");
    expect(container.querySelector(".nc-calendar.p-calendar")).not.toBeNull();
    expect(day(container, "2083-06-15").className).toContain("p-day");
    expect(day(container, "2083-06-15").hasAttribute("data-custom-day")).toBe(true);
    await user.click(day(container, "2083-06-16"));
    expect(screen.getByRole<HTMLInputElement>("textbox").value).toBe("2083-06-16");
  });

  it("stays accessible with custom parts and no default classes", async () => {
    const { container } = render(
      <NepaliCalendar
        unstyled
        defaultValue={{ year: 2083, month: 6, day: 15 }}
        components={{ NavButton: PillButton, Chevron: TextChevron, DayButton: StarDay }}
      />,
    );
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

describe("building your own picker", () => {
  it("composes the calendar with any popover or disclosure", async () => {
    const user = userEvent.setup();
    function MyPicker() {
      const [open, setOpen] = useState(false);
      const [date, setDate] = useState<{ year: number; month: number; day: number }>();
      return (
        <div>
          <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
            {date ? `${date.year}-${date.month}-${date.day}` : "Pick a date"}
          </button>
          {open && (
            <NepaliCalendar
              autoFocus
              value={date}
              today={{ year: 2083, month: 6, day: 7 }}
              onChange={(d) => {
                setDate(d);
                setOpen(false);
              }}
            />
          )}
        </div>
      );
    }
    render(<MyPicker />);
    await user.click(screen.getByRole("button", { name: "Pick a date" }));
    expect(focusedKey()).toBe("2083-06-07");
    await user.keyboard("{ArrowRight}{Enter}");
    expect(screen.getByRole("button", { name: "2083-6-8" })).toBeTruthy();
    expect(screen.queryByRole("grid")).toBeNull();
  });
});

function within(group: HTMLElement, label: string): HTMLElement {
  const button = [...group.querySelectorAll("button")].find((b) => b.textContent === label);
  if (!button) throw new Error(`no option ${label}`);
  return button;
}
