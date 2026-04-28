"use client";

import { navigate } from "@/app/router";
import { Button } from "@/components/primitives/button";
import { EmptyFeedState } from "@/components/states/empty-feed-state";
import { RouteLoadFailureState } from "@/components/states/route-error-states";
import { StackPageShell } from "@/components/states/stack-page-shell";
import { getErrorMessage } from "@/lib/error-utils";
import { interpolateMessage } from "@/lib/route-messages";
import { useRouteMessages } from "@/hooks/use-route-messages";

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

export function NotFoundRouteState({ path }: { path: string }) {
  const { copy } = useRouteMessages();

  return (
    <StackPageShell
      title={copy.notFound.title}
      description={interpolateMessage(copy.notFound.description, { path })}
      actions={renderBackHomeButton(copy.common.backHome)}
    >
      <EmptyFeedState message={copy.notFound.body} />
    </StackPageShell>
  );
}
