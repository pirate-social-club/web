"use client";

import * as React from "react";

const HANDLE_CLAIM_DISMISSAL_PREFIX = "pirate:handle-claim-dismissed:";

export function communityHandleClaimDismissalKey(communityId: string): string {
  return `${HANDLE_CLAIM_DISMISSAL_PREFIX}${communityId}`;
}

export function readCommunityHandleClaimDismissed(communityId: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(communityHandleClaimDismissalKey(communityId)) === "1";
}

export function writeCommunityHandleClaimDismissed(communityId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(communityHandleClaimDismissalKey(communityId), "1");
}

export function communityHandleFromRouteLabel(routeLabel: string): string {
  return routeLabel
    .replace(/^c\//u, "")
    .replace(/^@/u, "")
    || "community";
}

export function useCommunityHandleClaimDismissal(communityId: string | null | undefined) {
  const resolvedCommunityId = communityId?.trim() || null;

  const isDismissed = React.useCallback(() => {
    return resolvedCommunityId
      ? readCommunityHandleClaimDismissed(resolvedCommunityId)
      : false;
  }, [resolvedCommunityId]);

  const dismiss = React.useCallback(() => {
    if (resolvedCommunityId) {
      writeCommunityHandleClaimDismissed(resolvedCommunityId);
    }
  }, [resolvedCommunityId]);

  return React.useMemo(
    () => ({
      communityId: resolvedCommunityId,
      dismiss,
      isDismissed,
    }),
    [dismiss, isDismissed, resolvedCommunityId],
  );
}
