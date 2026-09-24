import { adToBs, formatBsDate, parseBsDate, type BSDate } from "bikram-sambat-ts";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Snapshots are "YYYY-MM-DD" strings so React can compare them by value.
function clientSnapshot(): string {
  try {
    return formatBsDate(adToBs(new Date()));
  } catch {
    return ""; // The device clock is outside BS 1979–2100: highlight nothing.
  }
}

const serverSnapshot = (): string => "";

/**
 * Today's BS date for highlighting. Returns `today` when given. Otherwise it's
 * the device's local calendar day (`adToBs(new Date())`), except during server
 * rendering and hydration, where it's `undefined` so the server and hydration
 * markup are identical. Components mounted after hydration (such as the date
 * picker's popover) get today on their first render.
 */
export function useToday(today: BSDate | undefined): BSDate | undefined {
  const key = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  if (today !== undefined) return today;
  return key === "" ? undefined : parseBsDate(key);
}
