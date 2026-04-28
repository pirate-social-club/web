"use client";

import { navigate } from "@/app/router";
import { Button } from "@/components/primitives/button";
import { EmptyFeedState } from "@/components/states/empty-feed-state";
import { RouteLoadFailureState } from "@/components/states/route-error-states";
import { StackPageShell } from "@/components/states/stack-page-shell";
import { Type } from "@/components/primitives/type";
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
    <section className="flex min-w-0 flex-1 flex-col gap-6 px-1 py-2 md:max-w-3xl md:px-6 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <Type as="h1" variant="h1" className="text-2xl md:text-3xl">
            {copy.notFound.title}
          </Type>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            {interpolateMessage(copy.notFound.description, { path })}
          </p>
        </div>
        {renderBackHomeButton(copy.common.backHome)}
      </div>
      <EmptyFeedState message={copy.notFound.body} />
    </section>
  );
}
