"use client";

import * as React from "react";

import { MOBILE_BREAKPOINT_QUERY } from "@/lib/breakpoints";

export function useShellMobileLayout() {
  const [isMobileLayout, setIsMobileLayout] = React.useState(false);

  React.useEffect(() => {
    const mobileWidthQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const update = () => {
      setIsMobileLayout(mobileWidthQuery.matches);
    };

    mobileWidthQuery.addEventListener("change", update);
    update();

    return () => {
      mobileWidthQuery.removeEventListener("change", update);
    };
  }, []);

  return isMobileLayout;
}
