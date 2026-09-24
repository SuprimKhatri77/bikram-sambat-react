// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("server rendering", () => {
  it("imports without browser globals", async () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    const mod = await import("../src");
    expect(typeof mod.NepaliCalendar).toBe("function");
    expect(typeof mod.NepaliDatePicker).toBe("function");
  });

  it("renders the calendar deterministically", async () => {
    const { NepaliCalendar } = await import("../src");
    const element = (
      <NepaliCalendar
        defaultValue={{ year: 2083, month: 6, day: 15 }}
        locale="ne"
        showGregorianDate
      />
    );
    const html = renderToString(element);
    expect(html).toContain("असोज");
    expect(html).toContain('data-date="2083-06-15"');
    expect(html).not.toContain("data-today"); // today is only known on the client
    expect(renderToString(element)).toBe(html);
  });

  it("renders the date picker", async () => {
    const { NepaliDatePicker } = await import("../src");
    const html = renderToString(
      <NepaliDatePicker
        aria-label="Date"
        defaultValue={{ year: 2083, month: 6, day: 15 }}
        name="d"
      />,
    );
    expect(html).toContain('value="2083-06-15"');
    expect(html).not.toContain('role="dialog"');
  });

  it("renders with no props at all", async () => {
    const { NepaliCalendar, NepaliDatePicker } = await import("../src");
    expect(() => renderToString(<NepaliCalendar />)).not.toThrow();
    expect(() => renderToString(<NepaliDatePicker />)).not.toThrow();
  });
});
