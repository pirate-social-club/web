"use client";

import * as React from "react";
import type { PublicAgentResolution } from "@pirate/api-contracts";
import { useApi } from "@/lib/api";
import { isApiNotFoundError } from "@/lib/api/client";
import { buildPublicProfilePath, getProfileHandleLabel } from "@/lib/profile-routing";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { PublicRouteLoadingState, PublicRouteMessageState } from "./public-route-states";
import { PublicAgentPage } from "@/components/compositions/profiles/public-agent-page/public-agent-page";

function usePublicAgent(handleLabel: string) {
  const api = useApi();
  const [resolution, setResolution] = React.useState<PublicAgentResolution | null>(null);
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
  const ownerHandle = getProfileHandleLabel(resolution.owner);

  return (
    <PublicAgentPage
      bio={copy.aboutDescription}
      createdAt={resolution.agent.created}
      avatarSeed={resolution.agent.agent ?? handle}
      displayName={displayName}
      handle={handle}
      openInPirateHref={`${appOrigin}/a/${encodeURIComponent(handle)}`}
      ownerHandle={ownerHandle}
      ownerHref={buildPublicProfilePath(ownerHandle)}
      ownershipProvider={resolution.agent.ownership_provider ?? "agent"}
    />
  );
}
