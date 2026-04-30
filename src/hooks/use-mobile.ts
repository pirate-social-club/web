"use client";

import * as React from "react";

import { MOBILE_BREAKPOINT_QUERY } from "@/lib/breakpoints";

function getSnapshot() {
  return window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

function subscribe(callback: () => void) {
  const mql = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
