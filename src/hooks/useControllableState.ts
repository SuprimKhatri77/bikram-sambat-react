import { useCallback, useState } from "react";

/**
 * State that is either controlled by a prop or held internally, the usual
 * React `value`/`defaultValue`/`onChange` contract. `controlled` decides which
 * one applies; it should not change for the lifetime of the component.
 *
 * The setter always calls `onChange`, and only updates internal state when
 * uncontrolled, so a controlled parent that ignores a change keeps its value.
 */
export function useControllableState<T>({
  controlled,
  value,
  defaultValue,
  onChange,
}: {
  controlled: boolean;
  value: T;
  defaultValue: T;
  onChange?: ((value: T) => void) | undefined;
}): [T, (next: T) => void] {
  const [internal, setInternal] = useState(defaultValue);
  const setValue = useCallback(
    (next: T) => {
      if (!controlled) setInternal(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );
  return [controlled ? value : internal, setValue];
}
