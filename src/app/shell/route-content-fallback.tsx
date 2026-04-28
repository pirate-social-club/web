"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import type { AppRoute } from "@/app/router";
import { RouteLoadingState } from "@/app/route-loading-states";

export function RouteContentFallback({ route }: { route?: AppRoute }) {
  React.useEffect(() => {
    console.info("[loader-debug][RouteContentFallback] mount", { kind: route?.kind, t: Math.round(performance.now()) });
    return () => console.info("[loader-debug][RouteContentFallback] unmount", { kind: route?.kind, t: Math.round(performance.now()) });
  }, [route?.kind]);

  const isMigratedRoute = route?.kind === "home" || route?.kind === "popular" || route?.kind === "wallet";

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", isMigratedRoute && "pt-[calc(env(safe-area-inset-top)+4.5rem)] pb-24 md:pt-6 md:pb-8")}>
      <RouteLoadingState route={route} />
    </div>
  );
}
