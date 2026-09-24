import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BSDate } from "bikram-sambat-ts";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { NepaliDatePicker, type NepaliDatePickerProps } from "../src";
import { day, focusedKey } from "./helpers";

const today = { year: 2083, month: 6, day: 7 };
const input = () => screen.getByRole<HTMLInputElement>("textbox");
const trigger = () => screen.getByRole("button", { name: /^Choose date/ });
const dialog = () => screen.queryByRole("dialog");

function setup(props: NepaliDatePickerProps = {}) {
  const user = userEvent.setup();
  const view = render(
    <>
      <NepaliDatePicker aria-label="Date" today={today} {...props} />
      <button type="button">after</button>
    </>,
  );
  return { user, ...view };
}

describe("popover", () => {
  it("opens from the trigger and focuses today", async () => {
    const { user } = setup();
    expect(dialog()).toBeNull();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(trigger().getAttribute("aria-haspopup")).toBe("dialog");
    await user.click(trigger());
    expect(dialog()).not.toBeNull();
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(trigger().getAttribute("aria-controls")).toBe(dialog()?.id);
    expect(focusedKey()).toBe("2083-06-07");
  });

  it("focuses the selected date when there is one", async () => {
    const { user } = setup({ defaultValue: { year: 2080, month: 3, day: 12 } });
    await user.click(trigger());
    expect(focusedKey()).toBe("2080-03-12");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const { user } = setup();
    await user.click(trigger());
    await user.keyboard("{ArrowRight}{Escape}");
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it("doesn't let Escape reach surrounding handlers", async () => {
    const outer = vi.fn();
    const user = userEvent.setup();
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div onKeyDown={(e) => e.key === "Escape" && outer()}>
        <NepaliDatePicker aria-label="Date" today={today} />
      </div>,
    );
    await user.click(trigger());
    await user.keyboard("{Escape}");
    expect(outer).not.toHaveBeenCalled();
  });

  it("selects a day, closes, and returns focus to the trigger", async () => {
    const onChange = vi.fn();
    const { user, container } = setup({ onChange });
    await user.click(trigger());
    await user.click(day(container, "2083-06-15"));
    expect(onChange).toHaveBeenCalledWith({ year: 2083, month: 6, day: 15 });
    expect(dialog()).toBeNull();
    expect(input().value).toBe("2083-06-15");
    expect(document.activeElement).toBe(trigger());
    expect(trigger().getAttribute("aria-label")).toBe("Choose date, 2083-06-15");
  });

  it("selects with the keyboard only", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange });
    await user.tab(); // input
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    expect(dialog()).not.toBeNull();
    expect(focusedKey()).toBe("2083-06-07");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledWith({ year: 2083, month: 6, day: 14 });
    expect(input().value).toBe("2083-06-14");
    expect(dialog()).toBeNull();
  });

  it("closes on a click outside", async () => {
    const { user } = setup();
    await user.click(trigger());
    await user.click(document.body);
    expect(dialog()).toBeNull();
  });

  it("closes when focus leaves it (no focus trap)", async () => {
    const { user } = setup();
    await user.click(trigger());
    expect(focusedKey()).toBe("2083-06-07");
    await user.tab(); // past the grid, out of the picker
    expect(document.activeElement?.textContent).toBe("after");
    expect(dialog()).toBeNull();
  });

  it("toggles from the trigger", async () => {
    const { user } = setup();
    await user.click(trigger());
    await user.click(trigger());
    expect(dialog()).toBeNull();
  });

  it("closes on Escape from the input", async () => {
    const { user } = setup();
    await user.click(trigger());
    await user.click(input());
    await user.keyboard("{Escape}");
    expect(dialog()).toBeNull();
  });
});

describe("iconPosition", () => {
  it("puts the calendar button after the input by default, or before it", () => {
    const { container, unmount } = setup();
    const field = container.querySelector(".nc-date-picker-field");
    expect(field?.lastElementChild).toBe(trigger());
    expect(container.firstElementChild?.getAttribute("data-icon-position")).toBe("end");
    unmount();
    const start = setup({ iconPosition: "start" });
    expect(start.container.querySelector(".nc-date-picker-field")?.firstElementChild).toBe(
      trigger(),
    );
  });

  it("with 'none', has no button and the input opens the calendar", async () => {
    const onChange = vi.fn();
    const { user, container } = setup({ iconPosition: "none", onChange });
    expect(screen.queryByRole("button", { name: /^Choose date/ })).toBeNull();
    const combo = screen.getByRole("combobox", { name: "Date" });
    expect(combo.getAttribute("aria-haspopup")).toBe("dialog");
    expect(combo.getAttribute("aria-expanded")).toBe("false");

    // A click opens it but keeps focus in the input, so typing still works.
    await user.click(combo);
    expect(dialog()).not.toBeNull();
    expect(combo.getAttribute("aria-expanded")).toBe("true");
    expect(combo.getAttribute("aria-controls")).toBe(dialog()?.id);
    expect(document.activeElement).toBe(combo);
    await user.type(combo, "2083-06-1");
    expect(document.activeElement).toBe(combo);

    // ArrowDown moves into the calendar; selecting returns focus to the input.
    await user.keyboard("{ArrowDown}");
    expect(focusedKey()).toBe("2083-06-07");
    await user.keyboard("{ArrowRight}{Enter}");
    expect(onChange).toHaveBeenLastCalledWith({ year: 2083, month: 6, day: 8 });
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(combo);
    expect(container.firstElementChild?.getAttribute("data-icon-position")).toBe("none");
  });

  it("with 'none', ArrowDown opens it and Escape closes it", async () => {
    const { user } = setup({ iconPosition: "none" });
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(focusedKey()).toBe("2083-06-07");
    await user.keyboard("{Escape}");
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("combobox"));
  });

  it("with 'none', closes when focus leaves the input", async () => {
    const { user } = setup({ iconPosition: "none" });
    await user.click(screen.getByRole("combobox"));
    expect(dialog()).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "after" }));
    expect(dialog()).toBeNull();
  });
});

describe("typed input", () => {
  it("commits only a complete, valid date", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange });
    await user.type(input(), "2083-06-1");
    expect(onChange).not.toHaveBeenCalled();
    expect(input().getAttribute("aria-invalid")).toBeNull(); // not while typing
    await user.type(input(), "5");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ year: 2083, month: 6, day: 15 });
  });

  it("flags invalid text on blur without producing a date", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange });
    await user.type(input(), "2083-02-32"); // Jestha 2083 has 31 days
    expect(input().getAttribute("aria-invalid")).toBeNull();
    await user.tab();
    expect(input().getAttribute("aria-invalid")).toBe("true");
    expect(onChange).not.toHaveBeenCalled();
    expect(input().value).toBe("2083-02-32"); // the user's text is kept
    await user.type(input(), "{Backspace}1");
    expect(input().getAttribute("aria-invalid")).toBeNull();
    expect(onChange).toHaveBeenCalledWith({ year: 2083, month: 2, day: 31 });
  });

  it("flags garbage on Enter", async () => {
    const { user } = setup();
    await user.type(input(), "hello{Enter}");
    expect(input().getAttribute("aria-invalid")).toBe("true");
  });

  it("accepts Devanagari digits", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange });
    await user.type(input(), "२०८३-०६-१५");
    expect(onChange).toHaveBeenCalledWith({ year: 2083, month: 6, day: 15 });
  });

  it("rejects disabled and out-of-range dates", async () => {
    const onChange = vi.fn();
    const { user } = setup({
      onChange,
      maxDate: { year: 2083, month: 6, day: 30 },
      isDateDisabled: (d) => d.day === 13,
    });
    await user.type(input(), "2083-06-31");
    await user.clear(input());
    await user.type(input(), "2083-06-13");
    await user.tab();
    expect(onChange).not.toHaveBeenCalled();
    expect(input().getAttribute("aria-invalid")).toBe("true");
  });

  it("clears the value when the text is emptied", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange, defaultValue: { year: 2083, month: 6, day: 15 } });
    expect(input().value).toBe("2083-06-15");
    await user.clear(input());
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("reformats equivalent text on blur", async () => {
    const { user } = setup({ locale: "ne", defaultValue: { year: 2083, month: 6, day: 15 } });
    expect(input().value).toBe("२०८३-०६-१५");
    await user.clear(input());
    await user.type(input(), "2083-06-15");
    await user.tab();
    expect(input().value).toBe("२०८३-०६-१५");
  });
});

describe("value", () => {
  it("works controlled, and follows external changes", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [date, setDate] = useState<BSDate>();
      return (
        <>
          <NepaliDatePicker aria-label="Date" value={date} onChange={setDate} today={today} />
          <button type="button" onClick={() => setDate({ year: 2081, month: 1, day: 1 })}>
            set
          </button>
          <button type="button" onClick={() => setDate(undefined)}>
            reset
          </button>
        </>
      );
    }
    const { container } = render(<Controlled />);
    await user.click(trigger());
    await user.click(day(container, "2083-06-20"));
    expect(input().value).toBe("2083-06-20");
    await user.click(screen.getByRole("button", { name: "set" }));
    expect(input().value).toBe("2081-01-01");
    await user.click(screen.getByRole("button", { name: "reset" }));
    expect(input().value).toBe("");
  });

  it("reverts typed text when a controlled parent rejects the change", async () => {
    const user = userEvent.setup();
    render(<NepaliDatePicker aria-label="Date" value={{ year: 2083, month: 6, day: 15 }} />);
    // Replace the whole text; the partial "2" in between isn't a date, so nothing commits.
    await user.type(input(), "2083-06-16", { initialSelectionStart: 0, initialSelectionEnd: 10 });
    expect(input().value).toBe("2083-06-15");
  });

  it("clears with the clear button", async () => {
    const onChange = vi.fn();
    const { user } = setup({
      onChange,
      clearable: true,
      defaultValue: { year: 2083, month: 6, day: 15 },
    });
    await user.click(screen.getByRole("button", { name: "Clear date" }));
    expect(onChange).toHaveBeenCalledWith(undefined);
    expect(input().value).toBe("");
    expect(document.activeElement).toBe(input());
    expect(screen.queryByRole("button", { name: "Clear date" })).toBeNull();
  });

  it("submits ASCII YYYY-MM-DD through a hidden input", async () => {
    const { container } = setup({
      name: "dob",
      locale: "ne",
      defaultValue: { year: 2083, month: 6, day: 15 },
    });
    const hidden = container.querySelector<HTMLInputElement>('input[type="hidden"][name="dob"]');
    expect(hidden?.value).toBe("2083-06-15");
    expect(input().value).toBe("२०८३-०६-१५");
    expect(input().getAttribute("name")).toBeNull();
  });
});

describe("disabled and read-only", () => {
  it("disabled blocks everything", () => {
    setup({ disabled: true, clearable: true, defaultValue: { year: 2083, month: 6, day: 15 } });
    expect(input().disabled).toBe(true);
    expect(trigger()).toHaveProperty("disabled", true);
    expect(screen.queryByRole("button", { name: "Clear date" })).toBeNull();
  });

  it("readOnly shows the value but can't change it", () => {
    setup({ readOnly: true, clearable: true, defaultValue: { year: 2083, month: 6, day: 15 } });
    expect(input().readOnly).toBe(true);
    expect(input().value).toBe("2083-06-15");
    expect(trigger()).toHaveProperty("disabled", true);
    expect(screen.queryByRole("button", { name: "Clear date" })).toBeNull();
  });

  it("uses the given id and a localized placeholder", () => {
    render(
      <>
        <label htmlFor="dob">Date of birth</label>
        <NepaliDatePicker id="dob" locale="ne" />
      </>,
    );
    const field = screen.getByLabelText("Date of birth");
    expect(field.getAttribute("placeholder")).toBe("वर्ष-महिना-गते");
    expect(screen.getByRole("button", { name: "मिति छान्नुहोस्" })).toBeTruthy();
  });
});
