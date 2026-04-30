"use client";

import { navigate } from "@/app/router";
import { Button } from "@/components/primitives/button";
import { ErrorState } from "@/components/states/error-state";
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

export function NotFoundRouteState({
  path,
  title,
  description,
}: {
  path: string;
  title?: string;
  description?: string;
}) {
  const { copy } = useRouteMessages();
  const resolvedDescription = description ?? interpolateMessage(copy.notFound.description, { path });

  return (
    <section className="flex min-w-0 flex-1 flex-col justify-center">
      <div className="mx-auto w-full max-w-3xl px-1 py-2 md:px-6 md:py-8">
        <ErrorState
          action={(
            <Button className="h-12 w-full" onClick={() => navigate("/")} size="lg" variant="secondary">
              {copy.common.backHome}
            </Button>
          )}
          description={resolvedDescription}
          title={title ?? copy.notFound.title}
        />
      </div>
    </section>
  );
}
