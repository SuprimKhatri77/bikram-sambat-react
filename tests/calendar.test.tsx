import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MAX_BS_YEAR,
  MIN_BS_YEAR,
  bsToAd,
  daysInBsMonth,
  firstWeekdayOfBsMonth,
  getBsDayOfWeek,
  getBsMonthName,
  weeksInBsMonth,
} from "bikram-sambat-ts";
import { describe, expect, it, vi } from "vitest";
import { NepaliCalendar } from "../src";
import { day, days, keyOf, monthWithDays } from "./helpers";

const title = () => screen.getByRole("heading", { level: 2 }).textContent;

describe("month grid", () => {
  it.each([29, 30, 31, 32])("renders a %i-day month correctly", (length) => {
    const { year, month } = monthWithDays(length);
    const { container } = render(<NepaliCalendar defaultMonth={{ year, month }} />);

    const cells = days(container);
    expect(cells).toHaveLength(length);
    expect(cells.map((c) => c.getAttribute("data-date"))).toEqual(
      Array.from({ length }, (_, i) => keyOf(year, month, i + 1)),
    );

    // Day 1 sits in the column of its real weekday; so does the last day.
    const rows = container.querySelectorAll("tbody tr");
    const firstRowCells = rows[0]?.querySelectorAll("td") ?? [];
    expect(firstRowCells).toHaveLength(7);
    const firstColumn = [...firstRowCells].findIndex((td) => td.querySelector("button"));
    expect(firstColumn).toBe(firstWeekdayOfBsMonth(year, month));

    const lastRow = [...rows].findLast((row) => row.querySelector("button"));
    const lastRowCells = [...(lastRow?.querySelectorAll("td") ?? [])];
    const lastColumn = lastRowCells.findLastIndex((td) => td.querySelector("button"));
    expect(lastColumn).toBe(getBsDayOfWeek({ year, month, day: length }));
    expect(lastRowCells[lastColumn]?.querySelector("button")?.getAttribute("data-date")).toBe(
      keyOf(year, month, length),
    );
  });

  it("always renders six week rows, unless fixedWeeks is false", () => {
    for (const length of [29, 30, 31, 32]) {
      const month = monthWithDays(length);
      const { container, unmount } = render(<NepaliCalendar defaultMonth={month} />);
      expect(container.querySelectorAll("tbody tr")).toHaveLength(6);
      unmount();
      const loose = render(<NepaliCalendar defaultMonth={month} fixedWeeks={false} />);
      expect(loose.container.querySelectorAll("tbody tr")).toHaveLength(
        weeksInBsMonth(month.year, month.month),
      );
      loose.unmount();
    }
  });

  it("labels days with the weekday, day, month and year", () => {
    const { container } = render(<NepaliCalendar defaultMonth={{ year: 2083, month: 6 }} />);
    expect(day(container, "2083-06-07").getAttribute("aria-label")).toBe(
      "Wednesday, 7 Ashwin 2083",
    );
  });

  it("shows Sunday-first weekday headers with full names as titles", () => {
    render(<NepaliCalendar defaultMonth={{ year: 2083, month: 6 }} />);
    const headers = screen.getAllByRole("columnheader");
    expect(headers.map((h) => h.textContent)).toEqual([
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ]);
    expect(headers[0]?.querySelector("abbr")?.getAttribute("title")).toBe("Sunday");
  });
});

describe("month navigation", () => {
  it("moves between months with the buttons", async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();
    render(
      <NepaliCalendar defaultMonth={{ year: 2083, month: 6 }} onMonthChange={onMonthChange} />,
    );
    expect(title()).toBe("Ashwin 2083");
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(title()).toBe("Kartik 2083");
    expect(onMonthChange).toHaveBeenLastCalledWith({ year: 2083, month: 7 });
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(title()).toBe("Bhadra 2083");
  });

  it("crosses BS year boundaries", async () => {
    const user = userEvent.setup();
    render(<NepaliCalendar defaultMonth={{ year: 2083, month: 12 }} />);
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(title()).toBe("Baisakh 2084");
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(title()).toBe("Falgun 2083");
  });

  it("goes from Baisakh back to the previous year's Chaitra", async () => {
    const user = userEvent.setup();
    render(<NepaliCalendar defaultMonth={{ year: 2083, month: 1 }} />);
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(title()).toBe("Chaitra 2082");
  });

  it("changes month and year with the selects", async () => {
    const user = userEvent.setup();
    render(<NepaliCalendar defaultMonth={{ year: 2083, month: 6 }} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Month" }), "9");
    expect(title()).toBe("Poush 2083");
    await user.selectOptions(screen.getByRole("combobox", { name: "Year" }), "2090");
    expect(title()).toBe("Poush 2090");
  });

  it("supports a controlled month", async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();
    const { rerender } = render(
      <NepaliCalendar month={{ year: 2083, month: 6 }} onMonthChange={onMonthChange} />,
    );
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(onMonthChange).toHaveBeenCalledWith({ year: 2083, month: 7 });
    expect(title()).toBe("Ashwin 2083"); // the parent didn't update `month`
    rerender(<NepaliCalendar month={{ year: 2083, month: 7 }} onMonthChange={onMonthChange} />);
    expect(title()).toBe("Kartik 2083");
  });
});

describe("supported range boundaries", () => {
  it("can't go before Baisakh of MIN_BS_YEAR", async () => {
    render(<NepaliCalendar defaultMonth={{ year: MIN_BS_YEAR, month: 1 }} />);
    expect(screen.getByRole("button", { name: "Previous month" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Next month" })).toHaveProperty("disabled", false);
  });

  it("can't go past Chaitra of MAX_BS_YEAR", () => {
    render(<NepaliCalendar defaultMonth={{ year: MAX_BS_YEAR, month: 12 }} />);
    expect(screen.getByRole("button", { name: "Next month" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Previous month" })).toHaveProperty(
      "disabled",
      false,
    );
  });

  it("offers exactly the supported years", () => {
    render(<NepaliCalendar defaultMonth={{ year: 2083, month: 6 }} />);
    const years = screen
      .getAllByRole("option")
      .filter((o) => o.closest("select")?.getAttribute("aria-label") === "Year")
      .map((o) => Number(o.getAttribute("value")));
    expect(years[0]).toBe(MIN_BS_YEAR);
    expect(years[years.length - 1]).toBe(MAX_BS_YEAR);
    expect(years).toHaveLength(MAX_BS_YEAR - MIN_BS_YEAR + 1);
  });

  it("ignores an unsupported defaultMonth", () => {
    render(
      <NepaliCalendar
        defaultMonth={{ year: 2150, month: 1 }}
        today={{ year: 2083, month: 6, day: 7 }}
      />,
    );
    expect(title()).toBe("Ashwin 2083");
  });

  it("clamps the initial month into minDate/maxDate", () => {
    render(
      <NepaliCalendar
        defaultMonth={{ year: 2070, month: 1 }}
        minDate={{ year: 2083, month: 5, day: 10 }}
      />,
    );
    expect(title()).toBe("Bhadra 2083");
  });

  it("limits navigation and years to minDate/maxDate", async () => {
    const user = userEvent.setup();
    render(
      <NepaliCalendar
        defaultMonth={{ year: 2083, month: 6 }}
        minDate={{ year: 2083, month: 5, day: 10 }}
        maxDate={{ year: 2083, month: 7, day: 5 }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("button", { name: "Previous month" })).toHaveProperty("disabled", true);
    const yearOptions = screen.getByRole("combobox", { name: "Year" }).querySelectorAll("option");
    expect([...yearOptions].map((o) => o.value)).toEqual(["2083"]);
    const monthSelect = screen.getByRole("combobox", { name: "Month" });
    const enabled = [...monthSelect.querySelectorAll("option")]
      .filter((o) => !o.disabled)
      .map((o) => o.value);
    expect(enabled).toEqual(["5", "6", "7"]);
  });
});

describe("locale and numerals", () => {
  it("renders Nepali names and Devanagari digits for locale='ne'", () => {
    const { container } = render(
      <NepaliCalendar locale="ne" defaultMonth={{ year: 2083, month: 6 }} />,
    );
    expect(title()).toBe("असोज २०८३");
    expect(day(container, "2083-06-07").textContent).toBe("७");
    expect(day(container, "2083-06-07").getAttribute("aria-label")).toBe("२०८३ असोज ७, बुधवार");
    expect(screen.getByRole("button", { name: "अर्को महिना" })).toBeTruthy();
    expect(screen.getAllByRole("columnheader")[0]?.textContent).toBe("आइत");
  });

  it("allows Latin digits with Nepali names", () => {
    const { container } = render(
      <NepaliCalendar locale="ne" numerals="latin" defaultMonth={{ year: 2083, month: 6 }} />,
    );
    expect(title()).toBe("असोज 2083");
    expect(day(container, "2083-06-07").textContent).toBe("7");
  });

  it("allows Devanagari digits with English names", () => {
    const { container } = render(
      <NepaliCalendar numerals="devanagari" defaultMonth={{ year: 2083, month: 6 }} />,
    );
    expect(title()).toBe("Ashwin २०८३");
    expect(day(container, "2083-06-07").textContent).toBe("७");
  });
});

describe("optional display", () => {
  it("shows Gregorian dates when asked", () => {
    const { container } = render(
      <NepaliCalendar showGregorianDate defaultMonth={{ year: 2083, month: 6 }} />,
    );
    const cell = day(container, "2083-06-06");
    const ad = bsToAd({ year: 2083, month: 6, day: 6 });
    expect(cell.querySelector(".nc-calendar-day-gregorian")?.textContent).toBe(
      String(ad.getDate()),
    );
    expect(cell.getAttribute("aria-label")).toBe("Tuesday, 6 Ashwin 2083 (22 September 2026 AD)");
    // Day 1 names the AD month.
    expect(
      day(container, "2083-06-01").querySelector(".nc-calendar-day-gregorian")?.textContent,
    ).toBe("17 Sep");
  });

  it("hides Gregorian dates by default", () => {
    const { container } = render(<NepaliCalendar defaultMonth={{ year: 2083, month: 6 }} />);
    expect(container.querySelector(".nc-calendar-day-gregorian")).toBeNull();
  });

  it("renders custom day content with its state", () => {
    const { container } = render(
      <NepaliCalendar
        defaultValue={{ year: 2083, month: 6, day: 15 }}
        today={{ year: 2083, month: 6, day: 7 }}
        renderDay={(date, state) =>
          `${date.day}${state.selected ? "*" : ""}${state.today ? "!" : ""}`
        }
      />,
    );
    expect(day(container, "2083-06-15").textContent).toBe("15*");
    expect(day(container, "2083-06-07").textContent).toBe("7!");
    // The accessible label is still the calendar's.
    expect(day(container, "2083-06-15").getAttribute("aria-label")).toBe(
      "Thursday, 15 Ashwin 2083",
    );
  });

  it("highlights today with aria-current", () => {
    const { container } = render(<NepaliCalendar today={{ year: 2083, month: 6, day: 7 }} />);
    expect(title()).toBe(`${getBsMonthName(6)} 2083`);
    expect(day(container, "2083-06-07").getAttribute("aria-current")).toBe("date");
    expect(day(container, "2083-06-07").hasAttribute("data-today")).toBe(true);
    expect(container.querySelectorAll("[aria-current]")).toHaveLength(1);
  });

  it("exposes dayShape and the numeral system for styling", () => {
    const { container, rerender } = render(
      <NepaliCalendar defaultMonth={{ year: 2083, month: 6 }} />,
    );
    const root = () => container.firstElementChild as HTMLElement;
    expect(root().getAttribute("data-day-shape")).toBe("circle");
    expect(root().getAttribute("data-numerals")).toBe("latin");
    rerender(
      <NepaliCalendar defaultMonth={{ year: 2083, month: 6 }} dayShape="square" locale="ne" />,
    );
    expect(root().getAttribute("data-day-shape")).toBe("square");
    expect(root().getAttribute("data-numerals")).toBe("devanagari");
  });

  it("passes dayShape through the date picker", async () => {
    const user = userEvent.setup();
    const { NepaliDatePicker } = await import("../src");
    const { container } = render(<NepaliDatePicker aria-label="Date" dayShape="rounded" />);
    await user.click(screen.getByRole("button", { name: "Choose date" }));
    expect(container.querySelector(".nc-calendar")?.getAttribute("data-day-shape")).toBe("rounded");
  });

  it("applies className and id to the root", () => {
    const { container } = render(
      <NepaliCalendar id="cal" className="mine" defaultMonth={{ year: 2083, month: 6 }} />,
    );
    const root = container.firstElementChild;
    expect(root?.className).toBe("nc-calendar mine");
    expect(root?.id).toBe("cal");
    expect(daysInBsMonth(2083, 6)).toBe(days(container).length);
  });
});
