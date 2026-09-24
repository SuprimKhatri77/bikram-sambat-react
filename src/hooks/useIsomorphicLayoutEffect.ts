import { useEffect, useLayoutEffect } from "react";

/** useLayoutEffect in the browser, useEffect on the server (avoids React 18's SSR warning). */
export const useIsomorphicLayoutEffect =
  typeof document === "undefined" ? useEffect : useLayoutEffect;
