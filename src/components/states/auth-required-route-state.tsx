"use client";

import { Button } from "@/components/primitives/button";
import { useClientHydrated } from "@/hooks/use-client-hydrated";
import { usePiratePrivyRuntime } from "@/lib/auth/privy-provider";

import { FullPageSpinner } from "./full-page-spinner";
import { StackPageShell } from "./stack-page-shell";
import { StatusCard } from "./status-card";

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
