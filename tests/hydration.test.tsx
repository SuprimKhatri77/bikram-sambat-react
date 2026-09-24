import { act } from "@testing-library/react";
import { adToBs, formatBsDate } from "bikram-sambat-ts";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NepaliCalendar, NepaliDatePicker } from "../src";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("hydration", () => {
  it("hydrates server markup without mismatches, then highlights today", async () => {
    const todayKey = formatBsDate(adToBs(new Date()));
    const today = adToBs(new Date());
    const element = (
      <>
        <NepaliCalendar defaultMonth={{ year: today.year, month: today.month }} />
        <NepaliDatePicker aria-label="Date" />
      </>
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(element);
    document.body.append(container);
    expect(container.querySelector("[data-today]")).toBeNull();

    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, element, {
        onRecoverableError: (error) => console.error(error),
      });
    });
    expect(errors).not.toHaveBeenCalled();
    expect(container.querySelector("[data-today]")?.getAttribute("data-date")).toBe(todayKey);
    act(() => root?.unmount());
  });
});
