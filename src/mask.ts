import { fromNepaliDigits } from "bikram-sambat-ts";
import { toNumerals } from "./locale";
import type { Numerals } from "./types";

/**
 * Pure text shaping for the date picker's `YYYY-MM-DD` input mask. Nothing
 * here parses or validates dates (that stays with bikram-sambat-ts); it only
 * decides which characters the input shows and where the caret goes.
 *
 * Every function works on ASCII after `fromNepaliDigits`, which maps each
 * Devanagari digit to exactly one ASCII digit, so caret offsets carry over.
 */

/** Masked input text and the caret offset to put back. */
export interface MaskedText {
  text: string;
  caret: number;
}

export interface MaskOptions {
  /** Digits to show the result in. */
  numerals: Numerals;
  /** The edit removed text: don't add a trailing dash. Default `false`. */
  deleting?: boolean;
  /**
   * The text came in all at once (paste, drop, autofill): accept three
   * numeric groups like `2084/9/9` and zero-pad the month and day.
   * Default `false`.
   */
  paste?: boolean;
}

/** `YYYYMMDD`. */
const MAX_DIGITS = 8;
const YEAR_DIGITS = 4;
/** Digit counts after which a dash goes: `YYYY-MM-DD`. */
const DASH_AFTER = new Set([4, 6]);
/** Characters people type between date parts. Typed at a dash, they're a no-op. */
const SEPARATOR = /[-/.\s]/;
/** inputTypes that insert a whole string at once. "" covers autofill and synthetic events. */
const PASTE_INPUT_TYPES = new Set([
  "",
  "insertFromPaste",
  "insertFromPasteAsQuotation",
  "insertFromDrop",
  "insertFromYank",
  "insertReplacementText",
]);

const isDigit = (char: string | undefined): boolean =>
  char !== undefined && char >= "0" && char <= "9";

const countDigits = (ascii: string): number => {
  let count = 0;
  for (const char of ascii) if (isDigit(char)) count++;
  return count;
};

/** Index of the digit with 0-based position `n` among the digits, or -1. */
const nthDigitIndex = (ascii: string, n: number): number => {
  let seen = 0;
  for (let i = 0; i < ascii.length; i++) {
    if (!isDigit(ascii[i])) continue;
    if (seen === n) return i;
    seen++;
  }
  return -1;
};

const clamp = (n: number, min: number, max: number): number => Math.min(Math.max(n, min), max);

/**
 * Formats raw input text as `YYYY-MM-DD` (or a prefix of it) and maps the
 * caret into the result.
 *
 * - Keeps only digits (Latin or Devanagari) and at most eight of them, shown
 *   in `numerals`.
 * - Puts a dash after the 4th and 6th digit when more digits follow, and,
 *   unless `deleting`, as soon as the 4th or 6th digit is typed.
 * - With `paste`, text made of a 4-digit year and 1–2 digit month and day
 *   separated by non-digits (`2084/9/9`) is zero-padded first.
 * - The caret stays after the same number of digits it was after, skipping
 *   past a dash when inserting or when it was just after a separator.
 */
export function formatMaskedInput(
  raw: string,
  caret: number,
  { numerals, deleting = false, paste = false }: MaskOptions,
): MaskedText {
  const ascii = fromNepaliDigits(raw);
  const at = clamp(caret, 0, ascii.length);

  let digits = "";
  let digitsBeforeCaret = 0;
  const groups = paste ? [...ascii.matchAll(/\d+/g)] : [];
  const [year, month, day] = groups;
  if (
    groups.length === 3 &&
    year?.[0].length === 4 &&
    month !== undefined &&
    month[0].length <= 2 &&
    day !== undefined &&
    day[0].length <= 2
  ) {
    for (const group of groups) {
      const part = group[0];
      const padded = part.padStart(group === year ? 4 : 2, "0");
      digits += padded;
      if (at > group.index) {
        digitsBeforeCaret += padded.length - part.length + Math.min(at - group.index, part.length);
      }
    }
  } else {
    for (let i = 0; i < ascii.length; i++) {
      if (!isDigit(ascii[i])) continue;
      digits += ascii[i];
      if (i < at) digitsBeforeCaret++;
    }
  }
  digits = digits.slice(0, MAX_DIGITS);
  digitsBeforeCaret = Math.min(digitsBeforeCaret, digits.length);

  let text = "";
  for (let i = 0; i < digits.length; i++) {
    if (DASH_AFTER.has(i)) text += "-";
    text += digits[i];
  }
  if (!deleting && DASH_AFTER.has(digits.length)) text += "-";

  let position = digitsBeforeCaret;
  for (const after of DASH_AFTER) if (digitsBeforeCaret > after) position++;
  if (text[position] === "-" && (!deleting || (at > 0 && !isDigit(ascii[at - 1])))) position++;

  return { text: toNumerals(text, numerals), caret: position };
}

/**
 * Applies the mask to one edit of the input. `previous` is the text before
 * the edit, `raw` and `caret` the input's value and caret after it, and
 * `inputType` the `InputEvent.inputType` ("" when unknown).
 *
 * On top of {@link formatMaskedInput}:
 * - Backspace just after a dash with digits after it (or Delete just before
 *   one) also removes the digit on the far side of the dash. Otherwise the
 *   dash would come straight back and the key would seem to do nothing.
 * - Once the text holds eight digits, an insert that doesn't replace any of
 *   them is ignored, wherever the caret is.
 * - An insert of text with no digits or separators (a letter) is ignored.
 * - A separator typed right after a single month digit pads the month:
 *   `2084-9` then `-` gives `2084-09-`. A lone `0` isn't padded.
 *
 * Ignored edits return `previous` with the caret where it was.
 */
export function applyMaskedEdit(
  previous: string,
  raw: string,
  caret: number,
  inputType: string,
  numerals: Numerals,
): MaskedText {
  const before = fromNepaliDigits(previous);
  let after = fromNepaliDigits(raw);
  let at = clamp(caret, 0, after.length);
  let deleting = inputType.startsWith("delete");
  const paste = PASTE_INPUT_TYPES.has(inputType);

  // Recover the edit, assuming the caret ends up right after what was
  // inserted: before[start, end) was replaced by after[start, at).
  const end = before.length - (after.length - at);
  let start = 0;
  while (start < end && start < at && before[start] === after[start]) start++;
  const known = end >= 0 && before.slice(end) === after.slice(at);

  if (known) {
    const removed = before.slice(start, end);
    const inserted = after.slice(start, at);
    const removedDigits = countDigits(removed);
    const unchanged = { text: previous, caret: end };

    if (!deleting && inserted !== "") {
      const meaningful = [...inserted].some((char) => isDigit(char) || SEPARATOR.test(char));
      if (!meaningful) {
        if (removedDigits === 0) return unchanged;
        deleting = true; // a letter typed over digits just deletes them
      } else if (
        removedDigits === 0 &&
        countDigits(before) >= MAX_DIGITS &&
        countDigits(after) > MAX_DIGITS
      ) {
        return unchanged;
      } else if (![...inserted].some(isDigit)) {
        // A separator typed right after a single month digit ("2084-9" + "-")
        // ends the month: pad it, so the result is "2084-09-".
        const monthDigit = nthDigitIndex(after, YEAR_DIGITS);
        if (
          monthDigit !== -1 &&
          monthDigit < at &&
          countDigits(after) === YEAR_DIGITS + 1 &&
          after[monthDigit] !== "0"
        ) {
          after = `${after.slice(0, monthDigit)}0${after.slice(monthDigit)}`;
          at++;
        }
      }
    }

    const singleDelete =
      inputType === "deleteContentBackward" || inputType === "deleteContentForward";
    if (singleDelete && removed !== "" && removedDigits === 0 && countDigits(after.slice(at)) > 0) {
      if (inputType === "deleteContentBackward") {
        let i = at - 1;
        while (i >= 0 && !isDigit(after[i])) i--;
        if (i >= 0) {
          after = after.slice(0, i) + after.slice(i + 1);
          at = i;
        }
      } else {
        let i = at;
        while (i < after.length && !isDigit(after[i])) i++;
        after = after.slice(0, i) + after.slice(i + 1);
      }
    }
  }

  return formatMaskedInput(after, at, { numerals, deleting, paste });
}

/**
 * Pads a single-digit day once typing is over (on blur): a complete year
 * and month plus one day digit, `2084-09-9`, becomes `2084-09-09`, in
 * `numerals`. Anything else is returned unchanged. While typing the day
 * can't be padded, because `1` may still become `12`.
 */
export function padMaskedDay(text: string, numerals: Numerals): string {
  const match = /^(\d{4}-\d{2}-)(\d)$/.exec(fromNepaliDigits(text));
  return match ? toNumerals(`${match[1]}0${match[2]}`, numerals) : text;
}
