"use client";

import { Button } from "@/components/primitives/button";

import { StackPageShell } from "./stack-page-shell";
import { StatusCard } from "./status-card";

export function RouteLoadFailureState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <StackPageShell
      title={title}
      actions={(
        <Button onClick={() => window.location.reload()} variant="secondary">
          Try Again
        </Button>
      )}
    >
      <StatusCard
        title="Could not load this page"
        description={description}
        tone="warning"
      />
    </StackPageShell>
  );
}

export function RootAppErrorState({
  title,
  description,
  reloadLabel,
}: {
  title: string;
  description: string;
  reloadLabel: string;
}) {
  return (
    <main className="min-h-screen bg-background px-3 py-4 md:px-5 md:py-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl">
        <StackPageShell
          title={title}
          actions={(
            <Button onClick={() => window.location.reload()} variant="secondary">
              {reloadLabel}
            </Button>
          )}
        >
          <StatusCard
            title="Try again"
            description={description}
            tone="warning"
          />
        </StackPageShell>
      </div>
    </main>
  );
}
