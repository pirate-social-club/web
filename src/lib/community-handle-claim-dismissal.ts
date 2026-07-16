"use client";

import * as React from "react";

const HANDLE_CLAIM_DISMISSAL_PREFIX = "pirate:handle-claim-dismissed:";

export function communityHandleClaimDismissalKey(
  communityId: string,
  namespaceVerification?: string | null,
): string {
  return `${HANDLE_CLAIM_DISMISSAL_PREFIX}${communityId}${namespaceVerification ? `:${namespaceVerification}` : ""}`;
}

export function readCommunityHandleClaimDismissed(
  communityId: string,
  namespaceVerification?: string | null,
): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(
    communityHandleClaimDismissalKey(communityId, namespaceVerification),
  ) === "1";
}

export function writeCommunityHandleClaimDismissed(
  communityId: string,
  namespaceVerification?: string | null,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    communityHandleClaimDismissalKey(communityId, namespaceVerification),
    "1",
  );
}

export function communityHandleFromRouteLabel(routeLabel: string): string {
  return routeLabel
    .replace(/^c\//u, "")
    .replace(/^@/u, "")
    || "community";
}

export function useCommunityHandleClaimDismissal(
  communityId: string | null | undefined,
  namespaceVerification?: string | null,
) {
  const resolvedCommunityId = communityId?.trim() || null;

  const isDismissed = React.useCallback(() => {
    return resolvedCommunityId
      ? readCommunityHandleClaimDismissed(resolvedCommunityId, namespaceVerification)
      : false;
  }, [namespaceVerification, resolvedCommunityId]);

  const dismiss = React.useCallback(() => {
    if (resolvedCommunityId) {
      writeCommunityHandleClaimDismissed(resolvedCommunityId, namespaceVerification);
    }
  }, [namespaceVerification, resolvedCommunityId]);

  return React.useMemo(
    () => ({
      communityId: resolvedCommunityId,
      dismiss,
      isDismissed,
    }),
    [dismiss, isDismissed, resolvedCommunityId],
  );
}
