import { fireEvent, render, screen } from "@testing-library/react";
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

  it("flags garbage on Enter (mask off)", async () => {
    const { user } = setup({ mask: false });
    await user.type(input(), "hello{Enter}");
    expect(input().getAttribute("aria-invalid")).toBe("true");
  });

  it("never lets garbage in with the mask on", async () => {
    const { user } = setup();
    await user.type(input(), "hello{Enter}");
    expect(input().value).toBe("");
    expect(input().getAttribute("aria-invalid")).toBeNull();
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

describe("input mask", () => {
  it("adds dashes as you type and commits once", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange });
    expect(input().getAttribute("inputmode")).toBe("numeric");
    expect(input().getAttribute("maxlength")).toBeNull();
    await user.type(input(), "2084");
    expect(input().value).toBe("2084-");
    await user.type(input(), "09");
    expect(input().value).toBe("2084-09-");
    await user.type(input(), "09");
    expect(input().value).toBe("2084-09-09");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ year: 2084, month: 9, day: 9 });
  });

  it("accepts typed separators without doubling them", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange });
    await user.type(input(), "2084-09/09");
    expect(input().value).toBe("2084-09-09");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("pads a one-digit month when a separator follows it", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange });
    await user.type(input(), "2084-9-");
    expect(input().value).toBe("2084-09-");
    expect(input().selectionStart).toBe(8);
    await user.type(input(), "9");
    expect(input().value).toBe("2084-09-9");
    expect(onChange).not.toHaveBeenCalled(); // "9" may still become "19"
  });

  it("pads a one-digit day on blur and commits it", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange });
    await user.type(input(), "2084-9-9");
    await user.tab();
    expect(input().value).toBe("2084-09-09");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ year: 2084, month: 9, day: 9 });
    expect(input().getAttribute("aria-invalid")).toBeNull();
  });

  it("pads the day on blur in Devanagari too", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange, locale: "ne" });
    await user.type(input(), "२०८४/९/९");
    await user.tab();
    expect(input().value).toBe("२०८४-०९-०९");
    expect(onChange).toHaveBeenCalledWith({ year: 2084, month: 9, day: 9 });
  });

  it("pads the day on blur but still flags an invalid date", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange });
    await user.type(input(), "2084-13-1");
    expect(input().value).toBe("2084-13-1");
    await user.tab();
    expect(input().value).toBe("2084-13-01");
    expect(input().getAttribute("aria-invalid")).toBe("true");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("pads the day on blur without committing a date the parent already has", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange, defaultValue: { year: 2084, month: 9, day: 9 } });
    await user.type(input(), "{Backspace}{Backspace}9", { initialSelectionStart: 10 });
    expect(input().value).toBe("2084-09-9");
    await user.tab();
    expect(input().value).toBe("2084-09-09");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("caps at eight digits, never commits invalid text, and flags it on blur", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange });
    await user.type(input(), "20843433434");
    expect(input().value).toBe("2084-34-33");
    expect(onChange).not.toHaveBeenCalled();
    expect(input().getAttribute("aria-invalid")).toBeNull();
    await user.tab();
    expect(input().getAttribute("aria-invalid")).toBe("true");
  });

  it("ignores digits typed into a full field, wherever the caret is", async () => {
    const { user } = setup({ defaultValue: { year: 2084, month: 9, day: 9 } });
    await user.type(input(), "1", { initialSelectionStart: 5, initialSelectionEnd: 5 });
    expect(input().value).toBe("2084-09-09");
    expect(input().selectionStart).toBe(5);
  });

  it("backspaces through the dashes without re-adding them", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange });
    await user.type(input(), "20840909");
    const steps = ["2084-09-0", "2084-09", "2084-0", "2084", "208", "20", "2", ""];
    for (const expected of steps) {
      await user.keyboard("{Backspace}");
      expect(input().value).toBe(expected);
    }
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it("backspace just after a mid-string dash deletes the digit before it", async () => {
    const { user } = setup({ defaultValue: { year: 2084, month: 9, day: 9 } });
    await user.type(input(), "{Backspace}", { initialSelectionStart: 5, initialSelectionEnd: 5 });
    expect(input().value).toBe("2080-90-9");
    expect(input().selectionStart).toBe(3);
  });

  it("Delete just before a mid-string dash deletes the digit after it", async () => {
    const { user } = setup({ defaultValue: { year: 2084, month: 9, day: 9 } });
    await user.type(input(), "{Delete}", { initialSelectionStart: 4, initialSelectionEnd: 4 });
    expect(input().value).toBe("2084-90-9");
    expect(input().selectionStart).toBe(4);
  });

  it("keeps the caret when editing the month mid-string", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange, defaultValue: { year: 2084, month: 9, day: 9 } });
    // Select the month and type a new one.
    await user.type(input(), "1", { initialSelectionStart: 5, initialSelectionEnd: 7 });
    expect(input().value).toBe("2084-10-9");
    expect(input().selectionStart).toBe(6);
    await user.keyboard("2");
    expect(input().value).toBe("2084-12-09");
    expect(input().selectionStart).toBe(8);
    expect(onChange).toHaveBeenLastCalledWith({ year: 2084, month: 12, day: 9 });

    // Replace the first month digit; the caret stays right after it.
    await user.type(input(), "0", {
      initialSelectionStart: 5,
      initialSelectionEnd: 6,
      skipClick: true,
    });
    expect(input().value).toBe("2084-02-09");
    expect(input().selectionStart).toBe(6);
  });

  it.each([["2084/9/9"], ["2084.09.09"], ["2084 - 9 - 9"], ["20840909"], ["२०८४/९/९"]])(
    "normalizes a pasted %j",
    async (pasted) => {
      const onChange = vi.fn();
      const { user } = setup({ onChange });
      await user.click(input());
      await user.paste(pasted);
      expect(input().value).toBe("2084-09-09");
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({ year: 2084, month: 9, day: 9 });
    },
  );

  it("shows typed digits in the picker's numerals", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange, numerals: "devanagari" });
    await user.type(input(), "2");
    expect(input().value).toBe("२");
    await user.type(input(), "084");
    expect(input().value).toBe("२०८४-");
    await user.type(input(), "०९०९");
    expect(input().value).toBe("२०८४-०९-०९");
    expect(onChange).toHaveBeenCalledWith({ year: 2084, month: 9, day: 9 });
  });

  it("formats IME input on compositionend, not during composition", () => {
    const onChange = vi.fn();
    setup({ onChange });
    input().focus();
    fireEvent.compositionStart(input());
    fireEvent.input(input(), { target: { value: "२०८४" }, isComposing: true });
    expect(input().value).toBe("२०८४");
    fireEvent.compositionEnd(input());
    expect(input().value).toBe("2084-");
    expect(input().selectionStart).toBe(5);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("with mask={false}, keeps free text and no numeric keypad", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange, mask: false });
    expect(input().getAttribute("inputmode")).toBeNull();
    await user.type(input(), "20843433434");
    expect(input().value).toBe("20843433434");
    await user.clear(input());
    await user.type(input(), "2084");
    expect(input().value).toBe("2084");
    await user.type(input(), "-09-09");
    expect(onChange).toHaveBeenCalledWith({ year: 2084, month: 9, day: 9 });
    await user.clear(input());
    await user.type(input(), "2084-9-9");
    await user.tab();
    expect(input().value).toBe("2084-9-9"); // no padding without the mask
    expect(input().getAttribute("aria-invalid")).toBe("true");
  });

  it("still clears with the clear button, then masks new typing", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange, clearable: true });
    await user.type(input(), "20840909");
    await user.click(screen.getByRole("button", { name: "Clear date" }));
    expect(onChange).toHaveBeenLastCalledWith(undefined);
    expect(input().value).toBe("");
    expect(document.activeElement).toBe(input());
    await user.keyboard("2083");
    expect(input().value).toBe("2083-");
  });

  it("still follows external value changes", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [date, setDate] = useState<BSDate>();
      return (
        <>
          <NepaliDatePicker aria-label="Date" value={date} onChange={setDate} today={today} />
          <button type="button" onClick={() => setDate({ year: 2081, month: 1, day: 1 })}>
            set
          </button>
        </>
      );
    }
    render(<Controlled />);
    await user.type(input(), "2084-0");
    expect(input().value).toBe("2084-0");
    await user.click(screen.getByRole("button", { name: "set" }));
    expect(input().value).toBe("2081-01-01");
    await user.type(input(), "{Backspace}2");
    expect(input().value).toBe("2081-01-02");
  });
});
