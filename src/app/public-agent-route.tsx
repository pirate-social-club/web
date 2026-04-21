"use client";

import * as React from "react";
import type { ApiPublicAgentResolution } from "@/lib/api/client-api-types";
import { useApi } from "@/lib/api";
import { isApiNotFoundError } from "@/lib/api/client";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { PublicRouteLoadingState, PublicRouteMessageState } from "./public-route-states";

function usePublicAgent(handleLabel: string) {
  const api = useApi();
  const [resolution, setResolution] = React.useState<ApiPublicAgentResolution | null>(null);
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void api.publicAgents.getByHandle(handleLabel)
      .then((result) => {
        if (cancelled) return;
        setResolution(result);
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        setError(nextError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, handleLabel]);

  return { error, loading, resolution };
}

function PublicAgentNotFound({ path }: { path: string }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").publicAgent;
  return (
    <PublicRouteMessageState
      description={copy.notFoundDescription.replace("{path}", path)}
      title={copy.notFoundTitle}
    />
  );
}

function PublicAgentErrorState() {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").publicAgent;
  return <PublicRouteMessageState description={copy.errorDescription} title={copy.errorTitle} />;
}

export function PublicAgentRoutePage({
  appOrigin,
  handleLabel,
}: {
  appOrigin: string;
  handleLabel: string;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").publicAgent;
  const { error, loading, resolution } = usePublicAgent(handleLabel);

  if (loading) {
    return <PublicRouteLoadingState />;
  }

  if (error) {
    if (isApiNotFoundError(error)) {
      return <PublicAgentNotFound path={`${appOrigin}/a/${handleLabel}`} />;
    }
    return <PublicAgentErrorState />;
  }

  if (!resolution) {
    return <PublicAgentNotFound path={`${appOrigin}/a/${handleLabel}`} />;
  }

  const handle = resolution.agent.handle.label_display;
  const displayName = resolution.agent.display_name ?? handle;
  const ownerHandle = resolution.owner.global_handle.label;

  return (
    <div className="mx-auto w-full max-w-[880px] px-4 py-6">
      <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card p-7">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">{displayName}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{handle}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <span className="inline-flex items-center rounded-full border border-border-soft bg-muted/40 px-4 py-2.5 text-base text-muted-foreground">
            <strong className="me-2 text-foreground">{ownerHandle}</strong>
            {copy.ownerLabel}
          </span>
          <span className="inline-flex items-center rounded-full border border-border-soft bg-muted/40 px-4 py-2.5 text-base text-muted-foreground">
            <strong className="me-2 text-foreground">{resolution.agent.ownership_provider ?? "agent"}</strong>
            {copy.providerLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
