"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { isApiAuthError, isApiNotFoundError } from "@/lib/api/client";
import { useSession } from "@/lib/api/session-store";

import type { CommunityModerationSection } from "./moderation-helpers";
import { NotFoundPage } from "./misc-routes";
import { getErrorMessage } from "./route-core";
import { getRouteAuthDescription, getRouteFailureDescription, getRouteIncompleteDescription, getRouteString } from "./route-status-copy";
import { AuthRequiredRouteState, FullPageSpinner, RouteLoadFailureState, StackPageShell, StatusCard } from "./route-shell";

export function getCommunityModerationTitle(section: CommunityModerationSection): string {
  switch (section) {
    case "rules":
      return "Rules";
    case "links":
      return "Links";
    case "donations":
      return "Donations";
    case "pricing":
      return "Pricing";
    case "gates":
      return "Gates";
    case "safety":
      return "Safety";
    case "namespace":
    default:
      return "Namespace verification";
  }
}

export function useCommunityRecord(communityId: string) {
  const api = useApi();
  const [community, setCommunity] = React.useState<ApiCommunity | null>(null);
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
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
  }, [api, communityId]);

  return { community, error, loading, setCommunity };
}

export function CommunityModerationGuard({
  community,
  error,
  loading,
  session,
  title,
}: {
  community: ApiCommunity | null;
  error: unknown;
  loading: boolean;
  session: ReturnType<typeof useSession>;
  title: string;
}) {
  if (loading) {
    return <FullPageSpinner />;
  }

  if (error) {
    if (isApiAuthError(error)) {
      return <AuthRequiredRouteState description={getRouteAuthDescription("moderation")} title={title} />;
    }

    if (isApiNotFoundError(error)) {
      return <NotFoundPage path={window.location.pathname} />;
    }

    return (
      <RouteLoadFailureState
        description={getErrorMessage(error, getRouteFailureDescription("moderation"))}
        title={title}
      />
    );
  }

  if (!community) {
    return <RouteLoadFailureState description={getRouteIncompleteDescription("moderation")} title={title} />;
  }

  if (session?.user?.user_id !== community.created_by_user_id) {
    return (
      <StackPageShell title={title}>
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
