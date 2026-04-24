"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { isApiAuthError, isApiNotFoundError } from "@/lib/api/client";
import { useSession } from "@/lib/api/session-store";
import { usePiratePrivyRuntime } from "@/lib/auth/privy-provider";

import type { CommunityModerationSection } from "./moderation-helpers";
import { NotFoundPage } from "./misc-routes";
import { getErrorMessage } from "./route-core";
import { getRouteAuthDescription, getRouteFailureDescription, getRouteIncompleteDescription, getRouteString } from "./route-status-copy";
import { AuthRequiredRouteState, FullPageSpinner, RouteLoadFailureState, StackPageShell, StatusCard } from "./route-shell";

export function getCommunityModerationTitle(
  section: CommunityModerationSection,
  copy: { nav: Record<string, string> },
): string {
  switch (section) {
    case "profile":
      return copy.nav.profile;
    case "rules":
      return copy.nav.rules;
    case "links":
      return copy.nav.links;
    case "labels":
      return copy.nav.labels;
    case "donations":
      return copy.nav.donations;
    case "pricing":
      return copy.nav.pricing;
    case "gates":
      return copy.nav.gates;
    case "safety":
      return copy.nav.safety;
    case "agents":
      return copy.nav.agents;
    case "machine-access":
      return copy.nav.machineAccess;
    case "namespace":
    default:
      return copy.nav.namespace;
  }
}

export function useCommunityRecord(communityId: string) {
  const api = useApi();
  const session = useSession();
  const { busy, configured, loaded } = usePiratePrivyRuntime();
  const [community, setCommunity] = React.useState<ApiCommunity | null>(null);
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    if (configured && (!loaded || busy) && !session?.accessToken) {
      setLoading(true);
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);

    void api.communities.get(communityId)
      .then((result) => {
        if (!cancelled) {
          setCommunity(result);
        }
      })
      .catch((nextError: unknown) => {
        if (!cancelled) {
          setError(nextError);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api, busy, communityId, configured, loaded, session?.accessToken]);

  return { community, error, loading, setCommunity };
}

export function CommunityModerationGuard({
  community,
  error,
  loading,
  session,
  showInlineTitle = true,
  title,
}: {
  community: ApiCommunity | null;
  error: unknown;
  loading: boolean;
  session: ReturnType<typeof useSession>;
  showInlineTitle?: boolean;
  title: string;
}) {
  if (loading) {
    return <FullPageSpinner />;
  }

  if (error) {
    if (isApiAuthError(error)) {
      return <AuthRequiredRouteState description={getRouteAuthDescription("moderation")} title={showInlineTitle ? title : ""} />;
    }

    if (isApiNotFoundError(error)) {
      return <NotFoundPage path={window.location.pathname} />;
    }

    return (
      <RouteLoadFailureState
        description={getErrorMessage(error, getRouteFailureDescription("moderation"))}
        title={showInlineTitle ? title : ""}
      />
    );
  }

  if (!community) {
    return <RouteLoadFailureState description={getRouteIncompleteDescription("moderation")} title={showInlineTitle ? title : ""} />;
  }

  if (session?.user?.user_id !== community.created_by_user_id) {
    return (
      <StackPageShell title={showInlineTitle ? title : ""}>
        <StatusCard
          description={getRouteString("moderation", "accessRequiredDescription", "Only community moderators can open this page.")}
          title={getRouteString("moderation", "accessRequiredTitle", "Moderator access required")}
          tone="warning"
        />
      </StackPageShell>
    );
  }

  return null;
}
