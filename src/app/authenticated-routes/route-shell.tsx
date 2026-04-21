"use client";

import { navigate } from "@/app/router";
import { Button } from "@/components/primitives/button";
import { RouteLoadFailureState } from "@/components/states/route-error-states";
import { getErrorMessage } from "@/lib/error-utils";

export { AuthRequiredRouteState } from "@/components/states/auth-required-route-state";
export { EmptyFeedState } from "@/components/states/empty-feed-state";
export { FullPageSpinner } from "@/components/states/full-page-spinner";
export { RouteLoadFailureState, RootAppErrorState } from "@/components/states/route-error-states";
export { StackPageShell } from "@/components/states/stack-page-shell";
export { StatusCard } from "@/components/states/status-card";

export function renderLoadFailure(
  title: string,
  error: unknown,
  fallback: string,
) {
  return (
    <RouteLoadFailureState
      description={getErrorMessage(error, fallback)}
      title={title}
    />
  );
}

export function renderBackHomeButton(label: string) {
  return (
    <Button onClick={() => navigate("/")} variant="secondary">
      {label}
    </Button>
  );
}
