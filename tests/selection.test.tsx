import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BSDate } from "bikram-sambat-ts";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { NepaliCalendar } from "../src";
import { day } from "./helpers";

const ashwin = { year: 2083, month: 6 };

describe("selection", () => {
  it("selects a clicked day (uncontrolled)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<NepaliCalendar defaultMonth={ashwin} onChange={onChange} />);
    await user.click(day(container, "2083-06-15"));
    expect(onChange).toHaveBeenCalledWith({ year: 2083, month: 6, day: 15 });
    expect(day(container, "2083-06-15").hasAttribute("data-selected")).toBe(true);
    expect(day(container, "2083-06-15").closest("td")?.getAttribute("aria-selected")).toBe("true");
    await user.click(day(container, "2083-06-16"));
    expect(day(container, "2083-06-15").hasAttribute("data-selected")).toBe(false);
    expect(day(container, "2083-06-16").hasAttribute("data-selected")).toBe(true);
    expect(container.querySelectorAll("[data-selected]")).toHaveLength(1);
  });

  it("starts from defaultValue and shows its month", () => {
    const { container } = render(
      <NepaliCalendar defaultValue={{ year: 2080, month: 2, day: 3 }} />,
    );
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Jestha 2080");
    expect(day(container, "2080-02-03").hasAttribute("data-selected")).toBe(true);
  });

  it("works controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [date, setDate] = useState<BSDate>();
      return (
        <>
          <NepaliCalendar value={date} onChange={setDate} defaultMonth={ashwin} />
          <output>{date ? `${date.year}-${date.month}-${date.day}` : "none"}</output>
        </>
      );
    }
    const { container } = render(<Controlled />);
    expect(screen.getByRole("status").textContent).toBe("none");
    await user.click(day(container, "2083-06-20"));
    expect(screen.getByRole("status").textContent).toBe("2083-6-20");
    expect(day(container, "2083-06-20").hasAttribute("data-selected")).toBe(true);
  });

  it("keeps a controlled value the parent doesn't update", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <NepaliCalendar value={{ year: 2083, month: 6, day: 5 }} onChange={onChange} />,
    );
    await user.click(day(container, "2083-06-20"));
    expect(onChange).toHaveBeenCalledWith({ year: 2083, month: 6, day: 20 });
    expect(day(container, "2083-06-05").hasAttribute("data-selected")).toBe(true);
    expect(day(container, "2083-06-20").hasAttribute("data-selected")).toBe(false);
  });

  it("treats value={undefined} as controlled and empty", async () => {
    const user = userEvent.setup();
    const { container } = render(<NepaliCalendar value={undefined} defaultMonth={ashwin} />);
    await user.click(day(container, "2083-06-20"));
    expect(container.querySelector("[data-selected]")).toBeNull();
  });

  it("follows an external value change, including to another month", () => {
    const { container, rerender } = render(
      <NepaliCalendar value={{ year: 2083, month: 6, day: 5 }} />,
    );
    rerender(<NepaliCalendar value={{ year: 2083, month: 6, day: 9 }} />);
    expect(day(container, "2083-06-09").hasAttribute("data-selected")).toBe(true);
    rerender(<NepaliCalendar value={{ year: 2084, month: 2, day: 1 }} />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Jestha 2084");
    expect(day(container, "2084-02-01").hasAttribute("data-selected")).toBe(true);
  });

  it("ignores an invalid value", () => {
    const { container } = render(
      <NepaliCalendar value={{ year: 2083, month: 2, day: 40 }} defaultMonth={ashwin} />,
    );
    expect(container.querySelector("[data-selected]")).toBeNull();
  });
});

describe("disabled days", () => {
  it("doesn't select days rejected by isDateDisabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <NepaliCalendar
        defaultMonth={ashwin}
        onChange={onChange}
        isDateDisabled={(date) => date.day === 1}
      />,
    );
    const first = day(container, "2083-06-01");
    expect(first.getAttribute("aria-disabled")).toBe("true");
    expect(first.hasAttribute("data-disabled")).toBe(true);
    await user.click(first);
    expect(onChange).not.toHaveBeenCalled();
    expect(first.hasAttribute("data-selected")).toBe(false);
    expect(day(container, "2083-06-02").hasAttribute("aria-disabled")).toBe(false);
  });

  it("disables days before minDate and after maxDate", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <NepaliCalendar
        defaultMonth={ashwin}
        onChange={onChange}
        minDate={{ year: 2083, month: 6, day: 10 }}
        maxDate={{ year: 2083, month: 6, day: 20 }}
      />,
    );
    expect(day(container, "2083-06-09").getAttribute("aria-disabled")).toBe("true");
    expect(day(container, "2083-06-10").hasAttribute("aria-disabled")).toBe(false);
    expect(day(container, "2083-06-20").hasAttribute("aria-disabled")).toBe(false);
    expect(day(container, "2083-06-21").getAttribute("aria-disabled")).toBe("true");
    await user.click(day(container, "2083-06-09"));
    await user.click(day(container, "2083-06-21"));
    expect(onChange).not.toHaveBeenCalled();
    await user.click(day(container, "2083-06-10"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
