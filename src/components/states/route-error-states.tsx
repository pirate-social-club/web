"use client";

import { Button } from "@/components/primitives/button";

import { ErrorState } from "./error-state";

export function RouteLoadFailureState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="flex min-w-0 flex-1 flex-col justify-center">
      <div className="mx-auto w-full max-w-3xl px-1 py-2 md:px-6 md:py-8">
        <ErrorState
          action={(
            <div className="flex w-full flex-row gap-3">
              <Button className="h-12 flex-1" onClick={() => window.location.reload()} size="lg">
                Try Again
              </Button>
              <Button className="h-12 flex-1" onClick={() => window.location.href = "/"} size="lg" variant="secondary">
                Go Home
              </Button>
            </div>
          )}
          description={description}
          title={title}
        />
      </div>
    </section>
  );
}

export function RootAppErrorState({
  title,
  description,
  homeLabel,
}: {
  title: string;
  description: string;
  homeLabel: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <ErrorState
        action={(
          <Button className="h-12 w-full" onClick={() => window.location.href = "/"} size="lg" variant="secondary">
            {homeLabel}
          </Button>
        )}
        description={description}
        title={title}
      />
    </main>
  );
}
