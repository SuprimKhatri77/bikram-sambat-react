import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { NepaliCalendar, NepaliDatePicker } from "../src";

// Color contrast can't be computed in jsdom; everything else runs.
async function violations(container: HTMLElement) {
  const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(", ")}`);
}

describe("automated accessibility checks (axe-core)", () => {
  it("calendar", async () => {
    const { container } = render(
      <NepaliCalendar
        defaultValue={{ year: 2083, month: 6, day: 15 }}
        today={{ year: 2083, month: 6, day: 7 }}
        isDateDisabled={(d) => d.day === 20}
        showGregorianDate
      />,
    );
    expect(await violations(container)).toEqual([]);
  });

  it("calendar in Nepali", async () => {
    const { container } = render(
      <NepaliCalendar locale="ne" defaultValue={{ year: 2083, month: 6, day: 15 }} />,
    );
    expect(await violations(container)).toEqual([]);
  });

  it("date picker, closed and open", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <>
        <label htmlFor="d">Date</label>
        <NepaliDatePicker
          id="d"
          clearable
          defaultValue={{ year: 2083, month: 6, day: 15 }}
          name="d"
        />
      </>,
    );
    expect(await violations(container)).toEqual([]);
    await user.click(screen.getByRole("button", { name: /^Choose date/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(await violations(container)).toEqual([]);
  });
});

describe("combobox mode (iconPosition='none')", () => {
  it("has no violations, closed and open", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <>
        <label htmlFor="c">Date</label>
        <NepaliDatePicker id="c" iconPosition="none" />
      </>,
    );
    expect(await violations(container)).toEqual([]);
    await user.click(screen.getByRole("combobox", { name: "Date" }));
    expect(await violations(container)).toEqual([]);
  });
});

describe("semantics", () => {
  it("exposes the grid, its label and cell states", () => {
    render(
      <NepaliCalendar
        defaultValue={{ year: 2083, month: 6, day: 15 }}
        today={{ year: 2083, month: 6, day: 7 }}
        isDateDisabled={(d) => d.day === 20}
      />,
    );
    const grid = screen.getByRole("grid", { name: "Ashwin 2083" });
    expect(grid).toBeTruthy();
    const selected = screen.getByRole("gridcell", { selected: true });
    expect(selected.querySelector("button")?.getAttribute("aria-label")).toBe(
      "Thursday, 15 Ashwin 2083",
    );
    expect(screen.getAllByRole("gridcell", { selected: true })).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Wednesday, 7 Ashwin 2083" }).getAttribute("aria-current"),
    ).toBe("date");
    expect(
      screen.getByRole("button", { name: "Tuesday, 20 Ashwin 2083" }).getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("labels every button", () => {
    render(<NepaliCalendar defaultMonth={{ year: 2083, month: 6 }} />);
    for (const button of screen.getAllByRole("button")) {
      expect(button.getAttribute("aria-label")).toBeTruthy();
    }
  });

  it("announces the month in a live region", () => {
    render(<NepaliCalendar defaultMonth={{ year: 2083, month: 6 }} />);
    expect(screen.getByRole("heading", { level: 2 }).getAttribute("aria-live")).toBe("polite");
  });
});
