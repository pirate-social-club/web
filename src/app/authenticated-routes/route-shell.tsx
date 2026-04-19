"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { Button } from "@/components/primitives/button";
import { Spinner } from "@/components/primitives/spinner";
import { usePiratePrivyRuntime } from "@/lib/auth/privy-provider";

import { getErrorMessage, useClientHydrated } from "./route-core";

export function FullPageSpinner() {
  return (
    <section className="flex min-w-0 flex-1 items-center justify-center py-20">
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6" />
      </div>
    </section>
  );
}

export function StackPageShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const showHeader = Boolean(title.trim() || description || actions);

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      {showHeader ? (
        <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5 md:px-6 md:py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-2">
              {title.trim() ? (
                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  {title}
                </h1>
              ) : null}
              {description ? (
                <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
          </div>
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function AuthRequiredRouteState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const hydrated = useClientHydrated();
  const { busy, configured, connect, loadError, loaded } = usePiratePrivyRuntime();

  if (!hydrated || (configured && !loaded)) {
    return <FullPageSpinner />;
  }

  if (configured && loadError) {
    return (
      <StackPageShell title={title}>
        <StatusCard
          title="Authentication unavailable"
          description={`${description} Check the console for Privy loader errors.`}
          tone="warning"
        />
      </StackPageShell>
    );
  }

  return (
    <StackPageShell title={title}>
      <StatusCard
        title="Session expired"
        description={description}
        tone="warning"
        actions={configured && connect ? (
          <Button loading={busy} onClick={connect}>
            Reconnect
          </Button>
        ) : undefined}
      />
    </StackPageShell>
  );
}

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

export function EmptyFeedState({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5">
      <p className="text-base leading-7 text-muted-foreground">{message}</p>
    </div>
  );
}

export function StatusCard({
  title,
  description,
  actions,
  tone = "default",
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  const toneClassName = tone === "success"
    ? "border-emerald-500/20 bg-emerald-500/5"
    : tone === "warning"
      ? "border-amber-500/20 bg-amber-500/5"
      : "border-border-soft bg-card";

  return (
    <div className={`rounded-[var(--radius-3xl)] border px-5 py-5 ${toneClassName}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5">
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="max-w-3xl text-base leading-7 text-muted-foreground">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}

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
