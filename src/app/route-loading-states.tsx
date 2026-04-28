"use client";

import * as React from "react";

import type { AppRoute } from "@/app/router";
import { Spinner } from "@/components/primitives/spinner";

export function CommunityRouteLoadingState() {
  return <GenericRouteLoadingState />;
}

function GenericRouteLoadingState() {
  React.useEffect(() => {
    console.info("[loader-debug][GenericRouteLoadingState] mount", { t: Math.round(performance.now()) });
    return () => console.info("[loader-debug][GenericRouteLoadingState] unmount", { t: Math.round(performance.now()) });
  }, []);

  return (
    <div className="flex min-h-[40vh] w-full flex-1 items-center justify-center" aria-busy="true">
      <Spinner className="size-6" debugLabel="route-loading" />
    </div>
  );
}

export function RouteLoadingState({ route }: { route?: AppRoute }) {
  if (route?.kind === "community") {
    return <CommunityRouteLoadingState />;
  }

  return <GenericRouteLoadingState />;
}
