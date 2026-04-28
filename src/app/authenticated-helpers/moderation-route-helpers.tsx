"use client";

import type { Community as ApiCommunity } from "@pirate/api-contracts";

import type { useSession } from "@/lib/api/session-store";
import { isApiAuthError, isApiNotFoundError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/error-utils";
import { NotFoundRouteState } from "@/app/authenticated-helpers/route-shell";
import type { CommunityModerationSection } from "@/app/authenticated-helpers/moderation-helpers";
import { AuthRequiredRouteState, FullPageSpinner, RouteLoadFailureState, StackPageShell, StatusCard } from "@/app/authenticated-helpers/route-shell";

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
    case "requests":
      return "Requests";
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

export function CommunityModerationGuard({
  community,
  error,
  loading,
  session,
  showInlineTitle = true,
  title,
  authDescription,
  failureDescription,
  incompleteDescription,
  accessRequiredDescription,
  accessRequiredTitle,
}: {
  community: ApiCommunity | null;
  error: unknown;
  loading: boolean;
  session: ReturnType<typeof useSession>;
  showInlineTitle?: boolean;
  title: string;
  authDescription: string;
  failureDescription: string;
  incompleteDescription: string;
  accessRequiredDescription: string;
  accessRequiredTitle: string;
}) {
  if (loading) {
    return <FullPageSpinner />;
  }

  if (error) {
    if (isApiAuthError(error)) {
      return <AuthRequiredRouteState description={authDescription} title={showInlineTitle ? title : ""} />;
    }

    if (isApiNotFoundError(error)) {
      return <NotFoundRouteState path={window.location.pathname} />;
    }

    return (
      <RouteLoadFailureState
        description={getErrorMessage(error, failureDescription)}
        title={showInlineTitle ? title : ""}
      />
    );
  }

  if (!community) {
    return <RouteLoadFailureState description={incompleteDescription} title={showInlineTitle ? title : ""} />;
  }

  if (session?.user?.user_id !== community.created_by_user_id) {
    return (
      <StackPageShell title={showInlineTitle ? title : ""}>
        <StatusCard
          description={accessRequiredDescription}
          title={accessRequiredTitle}
          tone="warning"
        />
      </StackPageShell>
    );
  }

  return null;
}
