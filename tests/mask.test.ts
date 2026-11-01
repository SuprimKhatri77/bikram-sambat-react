import { describe, expect, it } from "vitest";
import { applyMaskedEdit, formatMaskedInput, type MaskOptions } from "../src/mask";

/**
 * Text with a `|` marking the caret (or `[...]` marking a selection, for
 * edits), so cases read like what the user sees.
 */
function parse(marked: string): { text: string; caret: number } {
  const caret = marked.indexOf("|");
  if (caret === -1) throw new Error(`no caret in ${marked}`);
  return { text: marked.slice(0, caret) + marked.slice(caret + 1), caret };
}
const mark = ({ text, caret }: { text: string; caret: number }) =>
  `${text.slice(0, caret)}|${text.slice(caret)}`;

const latin: MaskOptions = { numerals: "latin" };
const deva: MaskOptions = { numerals: "devanagari" };

describe("formatMaskedInput", () => {
  const cases: [name: string, raw: string, options: MaskOptions, expected: string][] = [
    // Digits only, shown in the picker's numerals.
    ["empty", "|", latin, "|"],
    ["one digit", "2|", latin, "2|"],
    ["letters are dropped", "2a0b8|", latin, "208|"],
    ["only letters", "abc|", latin, "|"],
    ["Devanagari in, Latin out", "२०८|", latin, "208|"],
    ["Latin in, Devanagari out", "2|", deva, "२|"],
    ["mixed in, Devanagari out", "20८४0९0९|", deva, "२०८४-०९-०९|"],

    // Auto dashes while inserting.
    ["dash after the year", "2084|", latin, "2084-|"],
    ["dash after the month", "208409|", latin, "2084-09-|"],
    ["dash between groups", "20840|", latin, "2084-0|"],
    ["full date", "20840909|", latin, "2084-09-09|"],
    ["reformats existing dashes", "2084-09-09|", latin, "2084-09-09|"],
    ["typed separator at a dash is a no-op", "2084--|", latin, "2084-|"],
    ["slash at a dash", "2084-09/|", latin, "2084-09-|"],
    ["dot and space at a dash", "2084. |", latin, "2084-|"],
    ["separator elsewhere is dropped", "2084-0-|", latin, "2084-0|"],

    // The 8-digit cap.
    ["caps at eight digits", "20843433434|", latin, "2084-34-33|"],
    ["caret past the cap stays at the end", "2084-09-091|", latin, "2084-09-09|"],

    // Caret mapping: counts digits before the caret.
    ["caret at the start", "|20840909", latin, "|2084-09-09"],
    ["caret in the year", "20|840909", latin, "20|84-09-09"],
    ["inserting at a dash skips past it", "2084|0909", latin, "2084-|09-09"],
    ["inserting in the month", "2084-1|9-09", latin, "2084-1|9-09"],
    ["selection replaced in the month", "2084-1|-09", latin, "2084-1|0-9"],
    ["caret after a separator skips the dash", "2084/|0", latin, "2084-|0"],
  ];
  it.each(cases)("%s", (_, raw, options, expected) => {
    const { text, caret } = parse(raw);
    expect(mark(formatMaskedInput(text, caret, options))).toBe(expected);
  });

  const deleting: [name: string, raw: string, expected: string][] = [
    ["no trailing dash after the year", "2084|", "2084|"],
    ["no trailing dash after the month", "208409|", "2084-09|"],
    ["inner dashes stay", "2084-0|", "2084-0|"],
    ["caret before an inner dash stays before it", "2084|09-09", "2084|-09-09"],
    ["caret after a separator stays after the dash", "2084-|9", "2084-|9"],
    ["empty", "|", "|"],
  ];
  it.each(deleting)("deleting: %s", (_, raw, expected) => {
    const { text, caret } = parse(raw);
    expect(mark(formatMaskedInput(text, caret, { ...latin, deleting: true }))).toBe(expected);
  });

  const pasted: [raw: string, expected: string][] = [
    ["2084/9/9|", "2084-09-09|"],
    ["2084.09.09|", "2084-09-09|"],
    ["2084 - 9 - 9|", "2084-09-09|"],
    ["2084-9-19|", "2084-09-19|"],
    [" 2084/12/1 |", "2084-12-01|"],
    ["20840909|", "2084-09-09|"],
    ["२०८४/९/९|", "2084-09-09|"],
    ["२०८४०९०९|", "2084-09-09|"],
    ["2084/9|", "2084-9|"], // two groups: a digit stream
    ["84/9/9|", "8499-|"], // year isn't 4 digits: a digit stream
    ["2084/123/9|", "2084-12-39|"], // month too long: a digit stream
    ["2084-09-09 12:30|", "2084-09-09|"], // four groups: a digit stream, capped
    ["2084/9/9 and more text|", "2084-09-09|"],
    ["2084/9|/9", "2084-09-|09"], // caret maps through the padding
    ["|2084/9/9", "|2084-09-09"],
  ];
  it.each(pasted)("paste %j", (raw, expected) => {
    const { text, caret } = parse(raw);
    expect(mark(formatMaskedInput(text, caret, { ...latin, paste: true }))).toBe(expected);
  });

  it("pads pasted dates in Devanagari", () => {
    expect(formatMaskedInput("2084/9/9", 8, { ...deva, paste: true })).toEqual({
      text: "२०८४-०९-०९",
      caret: 10,
    });
  });

  it("only pads groups on paste, so deleting a month digit sticks", () => {
    expect(mark(formatMaskedInput("2084-|9-09", 5, { ...latin, deleting: true }))).not.toBe(
      "2084-|09-09",
    );
    expect(formatMaskedInput("2084-9-09", 5, { ...latin, deleting: true }).text).toBe("2084-90-9");
  });
});

/**
 * One edit: `before` is the text with `[...]` around the selection (or `|`
 * for a caret), and `after` is the browser's result with a `|` caret.
 */
function edit(before: string, after: string, inputType: string, options = latin): string {
  const previous = before.replace(/[[\]|]/g, "");
  const raw = parse(after);
  return mark(applyMaskedEdit(previous, raw.text, raw.caret, inputType, options.numerals));
}

describe("applyMaskedEdit", () => {
  const cases: [
    name: string,
    before: string,
    after: string,
    inputType: string,
    expected: string,
  ][] = [
    // Typing.
    ["types the first digit", "|", "2|", "insertText", "2|"],
    ["adds the dash at four digits", "208|", "2084|", "insertText", "2084-|"],
    ["adds the dash at six digits", "2084-0|", "2084-09|", "insertText", "2084-09-|"],
    ["completes the date", "2084-09-0|", "2084-09-09|", "insertText", "2084-09-09|"],
    ["typed dash at a dash", "2084-|", "2084--|", "insertText", "2084-|"],
    ["typed slash at a dash", "2084-09-|", "2084-09-/|", "insertText", "2084-09-|"],
    ["typed space at a dash", "2084-|", "2084- |", "insertText", "2084-|"],
    ["typed dash re-adds a deleted dash", "2084|", "2084-|", "insertText", "2084-|"],
    ["typed dash before a dash moves past it", "2084|-09", "2084-|-09", "insertText", "2084-|09-"],
    ["typed dash mid-group is dropped", "2084-0|", "2084-0-|", "insertText", "2084-0|"],
    ["a letter is ignored", "2084|", "2084a|", "insertText", "2084|"],
    ["a letter mid-string is ignored", "20|84-09", "20x|84-09", "insertText", "20|84-09"],
    ["a letter on an empty field", "|", "a|", "insertText", "|"],
    ["Devanagari digit", "२०८|", "२०८४|", "insertText", "2084-|"],
    ["Devanagari shown", "२०८|", "२०८४|", "insertText", "२०८४-|"],

    // The cap: a full field ignores inserts that replace no digits.
    ["full, caret at the end", "2084-09-09|", "2084-09-091|", "insertText", "2084-09-09|"],
    ["full, caret at the start", "|2084-09-09", "1|2084-09-09", "insertText", "|2084-09-09"],
    ["full, caret mid-month", "2084-0|9-09", "2084-01|9-09", "insertText", "2084-0|9-09"],
    ["full, caret before a dash", "2084|-09-09", "20841|-09-09", "insertText", "2084|-09-09"],
    ["full, dash selected", "2084[-]09-09", "20841|09-09", "insertText", "2084-|09-09"],
    [
      "full, paste with no selection",
      "2084-09-09|",
      "2084-09-0912|",
      "insertFromPaste",
      "2084-09-09|",
    ],
    ["full, separator is a no-op", "2084-09-0|9", "2084-09-0/|9", "insertText", "2084-09-0|9"],
    [
      "full, digit selected is replaced",
      "2084-[0]9-09",
      "2084-1|9-09",
      "insertText",
      "2084-1|9-09",
    ],
    ["full, month selected, first digit", "2084-[09]-09", "2084-1|-09", "insertText", "2084-1|0-9"],
    [
      "full, month selected, second digit",
      "2084-1|0-9",
      "2084-12|0-9",
      "insertText",
      "2084-12-|09",
    ],
    ["full, select all and type", "[2084-09-09]", "2|", "insertText", "2|"],
    [
      "full, letter over a selected digit deletes it",
      "2084-[0]9-09",
      "2084-x|9-09",
      "insertText",
      "2084-|90-9",
    ],
    [
      "over the cap with a selection",
      "2084-[0]9-09",
      "2084-12|9-09",
      "insertFromPaste",
      "2084-12-|90",
    ],

    // Deleting.
    [
      "backspace a digit leaves no trailing dash",
      "2084-0|",
      "2084-|",
      "deleteContentBackward",
      "2084|",
    ],
    ["backspace a trailing dash", "2084-|", "2084|", "deleteContentBackward", "2084|"],
    ["backspace the last year digit", "2084|", "208|", "deleteContentBackward", "208|"],
    [
      "backspace a second trailing dash",
      "2084-09-|",
      "2084-09|",
      "deleteContentBackward",
      "2084-09|",
    ],
    [
      "backspace after a mid dash",
      "2084-|09-09",
      "2084|09-09",
      "deleteContentBackward",
      "208|0-90-9",
    ],
    [
      "backspace after the second dash",
      "2084-09-|09",
      "2084-09|09",
      "deleteContentBackward",
      "2084-0|0-9",
    ],
    ["backspace in the month", "2084-09|-09", "2084-0|-09", "deleteContentBackward", "2084-0|0-9"],
    [
      "backspace a month digit after a dash",
      "2084-0|9-09",
      "2084-|9-09",
      "deleteContentBackward",
      "2084-|90-9",
    ],
    ["delete before a mid dash", "2084|-09-09", "2084|09-09", "deleteContentForward", "2084|-90-9"],
    ["delete before a trailing dash", "2084|-", "2084|", "deleteContentForward", "2084|"],
    ["delete a digit", "20|84", "20|4", "deleteContentForward", "20|4"],
    ["delete a selection", "2084-[09]-09", "2084-|-09", "deleteContentBackward", "2084-|09"],
    ["delete everything", "[2084-09-09]", "|", "deleteContentBackward", "|"],
    ["cut", "2084-0[9-0]9", "2084-0|9", "deleteByCut", "2084-0|9"],
    [
      "Devanagari backspace after a dash",
      "२०८४-|०९",
      "२०८४|०९",
      "deleteContentBackward",
      "208|0-9",
    ],

    // Paste and autofill.
    ["paste into an empty field", "|", "2084/9/9|", "insertFromPaste", "2084-09-09|"],
    ["paste digits", "|", "20840909|", "insertFromPaste", "2084-09-09|"],
    ["paste the rest", "2084-|", "2084-9/9|", "insertFromPaste", "2084-09-09|"],
    ["paste over everything", "[2083-01-01]", "2084 - 9 - 9|", "insertFromPaste", "2084-09-09|"],
    ["paste Devanagari", "|", "२०८४/९/९|", "insertFromPaste", "2084-09-09|"],
    ["paste too much", "|", "20843433434|", "insertFromPaste", "2084-34-33|"],
    ["paste a letter-only string", "2084|", "2084abc|", "insertFromPaste", "2084|"],
    ["drop", "|", "2084.9.9|", "insertFromDrop", "2084-09-09|"],
    ["autofill (no inputType)", "|", "2084/9/9|", "", "2084-09-09|"],
    ["autofill over a value", "2083-01-01|", "2084/9/9|", "", "2084-09-09|"],
  ];
  it.each(cases)("%s", (_, before, after, inputType, expected) => {
    const numerals = expected.match(/[०-९]/) ? deva : latin;
    expect(edit(before, after, inputType, numerals)).toBe(expected);
  });

  it("keeps the previous text exactly when ignoring an edit", () => {
    expect(applyMaskedEdit("२०८४-०९-०९", "२०८४-०९-०९१", 11, "insertText", "devanagari")).toEqual({
      text: "२०८४-०९-०९",
      caret: 10,
    });
  });

  it("falls back to plain formatting when the edit can't be recovered", () => {
    // The caret isn't after the change (e.g. a browser that moves it to the
    // start), so the before/after suffixes don't line up.
    expect(applyMaskedEdit("2084", "20845", 0, "insertText", "latin")).toEqual({
      text: "2084-5",
      caret: 0,
    });
  });
});
