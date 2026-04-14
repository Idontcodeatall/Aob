import { useState, useEffect } from "react";

/**
 * Debounces a value by `delay` milliseconds.
 * Returns the debounced value — useful for search-as-you-type inputs.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
