"use client";

import { Button } from "@/components/primitives/button";
import { PageContainer } from "@/components/primitives/layout-shell";
import { useClientHydrated } from "@/hooks/use-client-hydrated";
import { usePiratePrivyRuntime } from "@/lib/auth/privy-provider";
import { logger } from "@/lib/logger";

import { FullPageSpinner } from "./full-page-spinner";
import { StackPageShell } from "./stack-page-shell";
import { StatusCard } from "./status-card";

export function AuthRequiredRouteState({
  title,
  description,
  hideTitleOnMobile = false,
}: {
  title: string;
  description: string;
  hideTitleOnMobile?: boolean;
}) {
  const hydrated = useClientHydrated();
  const { busy, configured, connect, loadError, loaded } = usePiratePrivyRuntime();

  logger.info("[auth-required] render", { hydrated, configured, loaded, busy, hasConnect: !!connect, title });

  if (!hydrated || (configured && !loaded)) {
    return <FullPageSpinner />;
  }

  if (configured && loadError) {
    return (
      <PageContainer className="min-w-0 flex-1">
        <StackPageShell headerVariant="plain" hideTitleOnMobile={hideTitleOnMobile} title={title}>
          <StatusCard
            title="Authentication unavailable"
            description={`${description} Check the console for Privy loader errors.`}
            flatOnMobile
            tone="warning"
          />
        </StackPageShell>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="min-w-0 flex-1">
      <StackPageShell headerVariant="plain" hideTitleOnMobile={hideTitleOnMobile} title={title}>
        <StatusCard
          title="Sign in"
          description={description}
          flatOnMobile
          tone="warning"
          actions={configured && connect ? (
            <Button loading={busy} onClick={connect}>
              Sign in
            </Button>
          ) : undefined}
        />
      </StackPageShell>
    </PageContainer>
  );
}
