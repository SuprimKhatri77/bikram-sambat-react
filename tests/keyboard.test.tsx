import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MAX_BS_YEAR,
  MIN_BS_YEAR,
  daysInBsMonth,
  getBsDayOfWeek,
  parseBsDate,
} from "bikram-sambat-ts";
import { describe, expect, it, vi } from "vitest";
import { NepaliCalendar, type NepaliCalendarProps } from "../src";
import { day, days, focusedKey, keyOf, monthWithDays } from "./helpers";

function setup(props: NepaliCalendarProps, start: string) {
  const user = userEvent.setup();
  const date = parseBsDate(start);
  const view = render(
    <NepaliCalendar defaultMonth={{ year: date.year, month: date.month }} {...props} />,
  );
  act(() => day(view.container, start).focus());
  expect(focusedKey()).toBe(start);
  return { user, ...view };
}

const title = () => screen.getByRole("heading", { level: 2 }).textContent;

describe("roving tabindex", () => {
  it("has exactly one tabbable day, the selected one when shown", () => {
    const { container } = render(
      <NepaliCalendar defaultValue={{ year: 2083, month: 6, day: 15 }} />,
    );
    const tabbable = days(container).filter((d) => d.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]?.getAttribute("data-date")).toBe("2083-06-15");
  });

  it("uses today when nothing is selected, else day 1", () => {
    const { container, rerender } = render(
      <NepaliCalendar today={{ year: 2083, month: 6, day: 7 }} />,
    );
    expect(
      days(container)
        .find((d) => d.tabIndex === 0)
        ?.getAttribute("data-date"),
    ).toBe("2083-06-07");
    rerender(<NepaliCalendar defaultMonth={{ year: 2083, month: 6 }} />);
    expect(days(container).filter((d) => d.tabIndex === 0)).toHaveLength(1);
  });

  it("Tab reaches the grid once", async () => {
    const user = userEvent.setup();
    render(<NepaliCalendar defaultValue={{ year: 2083, month: 6, day: 15 }} />);
    await user.tab(); // previous month
    await user.tab(); // month select
    await user.tab(); // year select
    await user.tab(); // next month
    await user.tab();
    expect(focusedKey()).toBe("2083-06-15");
    await user.tab();
    expect(focusedKey()).toBeNull();
  });

  it("autoFocus focuses the tabbable day", () => {
    render(<NepaliCalendar autoFocus defaultValue={{ year: 2083, month: 6, day: 15 }} />);
    expect(focusedKey()).toBe("2083-06-15");
  });
});

describe("arrow keys", () => {
  it("move by a day and a week", async () => {
    const { user } = setup({}, "2083-06-15");
    await user.keyboard("{ArrowRight}");
    expect(focusedKey()).toBe("2083-06-16");
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(focusedKey()).toBe("2083-06-14");
    await user.keyboard("{ArrowDown}");
    expect(focusedKey()).toBe("2083-06-21");
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(focusedKey()).toBe("2083-06-07");
  });

  it("cross into the previous and next month", async () => {
    const { user } = setup({}, "2083-06-01");
    await user.keyboard("{ArrowLeft}");
    const last = keyOf(2083, 5, daysInBsMonth(2083, 5));
    expect(focusedKey()).toBe(last);
    expect(title()).toBe("Bhadra 2083");
    await user.keyboard("{ArrowRight}");
    expect(focusedKey()).toBe("2083-06-01");
    expect(title()).toBe("Ashwin 2083");
    await user.keyboard("{ArrowUp}");
    expect(focusedKey()).toBe(keyOf(2083, 5, daysInBsMonth(2083, 5) - 6));
  });

  it("cross the BS new year: last day of Chaitra → 1 Baisakh", async () => {
    const lastOfChaitra = keyOf(2082, 12, daysInBsMonth(2082, 12));
    const { user } = setup({}, lastOfChaitra);
    await user.keyboard("{ArrowRight}");
    expect(focusedKey()).toBe("2083-01-01");
    expect(title()).toBe("Baisakh 2083");
    await user.keyboard("{ArrowLeft}");
    expect(focusedKey()).toBe(lastOfChaitra);
    expect(title()).toBe("Chaitra 2082");
  });

  it("stop at the first and last supported day", async () => {
    const first = keyOf(MIN_BS_YEAR, 1, 1);
    const { user, unmount } = setup({}, first);
    await user.keyboard("{ArrowLeft}{ArrowUp}{PageUp}");
    expect(focusedKey()).toBe(first);
    unmount();

    const last = keyOf(MAX_BS_YEAR, 12, daysInBsMonth(MAX_BS_YEAR, 12));
    const second = setup({}, last);
    await second.user.keyboard("{ArrowRight}{ArrowDown}{PageDown}");
    expect(focusedKey()).toBe(last);
  });

  it("stop at minDate and maxDate", async () => {
    const { user } = setup(
      { minDate: { year: 2083, month: 6, day: 10 }, maxDate: { year: 2083, month: 6, day: 20 } },
      "2083-06-12",
    );
    await user.keyboard("{ArrowUp}");
    expect(focusedKey()).toBe("2083-06-10");
    await user.keyboard("{PageDown}");
    expect(focusedKey()).toBe("2083-06-20");
    await user.keyboard("{ArrowRight}");
    expect(focusedKey()).toBe("2083-06-20");
  });

  it("can land on disabled days, which stay unselectable", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange, isDateDisabled: (d) => d.day === 16 }, "2083-06-15");
    await user.keyboard("{ArrowRight}");
    expect(focusedKey()).toBe("2083-06-16");
    await user.keyboard("{Enter}");
    expect(onChange).not.toHaveBeenCalled();
    await user.keyboard("{ArrowRight}{Enter}");
    expect(onChange).toHaveBeenCalledWith({ year: 2083, month: 6, day: 17 });
  });
});

describe("Home and End", () => {
  it("go to the start and end of the week", async () => {
    const { user } = setup({}, "2083-06-15");
    await user.keyboard("{Home}");
    const start = focusedKey();
    expect(start && getBsDayOfWeek(parseBsDate(start))).toBe(0);
    await user.keyboard("{End}");
    const end = focusedKey();
    expect(end && getBsDayOfWeek(parseBsDate(end))).toBe(6);
  });
});

describe("PageUp and PageDown", () => {
  it("move by a month, keeping the day", async () => {
    const { user } = setup({}, "2083-06-15");
    await user.keyboard("{PageDown}");
    expect(focusedKey()).toBe("2083-07-15");
    expect(title()).toBe("Kartik 2083");
    await user.keyboard("{PageUp}{PageUp}");
    expect(focusedKey()).toBe("2083-05-15");
  });

  it("clamp the day to a shorter month (32 → shorter)", async () => {
    const m32 = monthWithDays(32);
    const nextYear = m32.month === 12 ? m32.year + 1 : m32.year;
    const nextMonth = m32.month === 12 ? 1 : m32.month + 1;
    const { user } = setup({}, keyOf(m32.year, m32.month, 32));
    await user.keyboard("{PageDown}");
    expect(focusedKey()).toBe(
      keyOf(nextYear, nextMonth, Math.min(32, daysInBsMonth(nextYear, nextMonth))),
    );
  });

  it("with Shift move by a year", async () => {
    const { user } = setup({}, "2083-06-15");
    await user.keyboard("{Shift>}{PageDown}{/Shift}");
    expect(focusedKey()).toBe("2084-06-15");
    expect(title()).toBe("Ashwin 2084");
    await user.keyboard("{Shift>}{PageUp}{PageUp}{/Shift}");
    expect(focusedKey()).toBe("2082-06-15");
  });

  it("report the month change when the month is controlled", async () => {
    const onMonthChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <NepaliCalendar month={{ year: 2083, month: 6 }} onMonthChange={onMonthChange} />,
    );
    act(() => day(container, "2083-06-15").focus());
    await user.keyboard("{PageDown}");
    expect(onMonthChange).toHaveBeenCalledWith({ year: 2083, month: 7 });
  });
});

describe("Enter and Space", () => {
  it("select the focused day", async () => {
    const onChange = vi.fn();
    const { user, container } = setup({ onChange }, "2083-06-15");
    await user.keyboard("{ArrowRight}{Enter}");
    expect(onChange).toHaveBeenLastCalledWith({ year: 2083, month: 6, day: 16 });
    await user.keyboard("{ArrowRight}[Space]");
    expect(onChange).toHaveBeenLastCalledWith({ year: 2083, month: 6, day: 17 });
    expect(day(container, "2083-06-17").hasAttribute("data-selected")).toBe(true);
  });
});

describe("focus when changing months with the buttons", () => {
  it("keeps the focused day number, clamped to the new month", async () => {
    const user = userEvent.setup();
    const m32 = monthWithDays(32);
    const { container } = render(<NepaliCalendar defaultMonth={m32} />);
    act(() => day(container, keyOf(m32.year, m32.month, 32)).focus());
    await user.click(screen.getByRole("button", { name: "Next month" }));
    const tabbable = days(container).find((d) => d.tabIndex === 0);
    const next =
      m32.month === 12 ? { year: m32.year + 1, month: 1 } : { ...m32, month: m32.month + 1 };
    expect(tabbable?.getAttribute("data-date")).toBe(
      keyOf(next.year, next.month, Math.min(32, daysInBsMonth(next.year, next.month))),
    );
  });
});
