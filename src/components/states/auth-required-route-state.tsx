"use client";

import { Button } from "@/components/primitives/button";
import { PageContainer } from "@/components/primitives/layout-shell";
import { Type } from "@/components/primitives/type";
import { useClientHydrated } from "@/hooks/use-client-hydrated";
import { usePiratePrivyRuntime } from "@/components/auth/privy-provider";
import { logger } from "@/lib/logger";

import { FullPageSpinner } from "./full-page-spinner";
import { StackPageShell } from "./stack-page-shell";
import { StatusCard } from "./status-card";

export function AuthRequiredRouteState({
  title,
  description,
  hideTitleOnMobile = false,
  illustration,
  headline,
  ctaLabel,
}: {
  title: string;
  description: string;
  hideTitleOnMobile?: boolean;
  illustration?: React.ReactNode;
  headline?: string;
  ctaLabel?: string;
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
        {illustration ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-8 px-5 py-10">
            {illustration}
            <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
              <Type as="h2" variant="h2">
                {headline ?? title}
              </Type>
              <p className="max-w-xs text-lg leading-7 text-muted-foreground">
                {description}
              </p>
              {configured && connect ? (
                <Button
                  className="mt-1 h-12 w-full"
                  loading={busy}
                  onClick={connect}
                  size="lg"
                >
                  {ctaLabel ?? "Connect"}
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
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
        )}
      </StackPageShell>
    </PageContainer>
  );
}
