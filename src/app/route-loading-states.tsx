"use client";

import type { AppRoute } from "@/app/router";
import { Spinner } from "@/components/primitives/spinner";

export function CommunityRouteLoadingState() {
  return <GenericRouteLoadingState />;
}

function GenericRouteLoadingState() {
  return (
    <div className="flex min-h-[40vh] w-full flex-1 items-center justify-center" aria-busy="true">
      <Spinner className="size-6" />
    </div>
  );
}

export function RouteLoadingState({ route }: { route?: AppRoute }) {
  if (route?.kind === "community") {
    return <CommunityRouteLoadingState />;
  }

  return <GenericRouteLoadingState />;
}
