"use client";

import * as React from "react";

import { MOBILE_BREAKPOINT, MOBILE_BREAKPOINT_QUERY } from "@/lib/breakpoints";

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const onChange = () => {
      setIsMobile(mql.matches);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
