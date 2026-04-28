import * as React from "react";

export function useResettableTimeout() {
  const timeoutRef = React.useRef<number | null>(null);

  const clear = React.useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const schedule = React.useCallback((callback: () => void, delayMs: number) => {
    clear();
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      callback();
    }, delayMs);
  }, [clear]);

  React.useEffect(() => clear, [clear]);

  return { clear, schedule };
}
