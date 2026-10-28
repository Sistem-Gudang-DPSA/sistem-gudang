import { useEffect, useState } from "react";

// Returns `value` once it has stopped changing for `ms`. Use it for the part of a search that drives a request.
export function useDebouncedValue<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}
