import { createEffect, createSignal, type Accessor } from "solid-js";
import { isServer } from "@solidjs/web";

/**
 * DS-owned hydration guard: the Solid equivalent of the React app's
 * `useClientHydrated` hook. Returns `false` during SSR and the first client
 * render, then `true` once effects run on the client. Gate client-only
 * rendering decisions (breakpoint switches, browser measurements) on it
 * instead of touching browser APIs at module scope.
 */
export function createClientHydrated(): Accessor<boolean> {
  const [hydrated, setHydrated] = createSignal(false);
  createEffect(() => {
    if (isServer) return;
    setHydrated(true);
  });
  return hydrated;
}
