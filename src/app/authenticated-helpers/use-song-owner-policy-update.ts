import * as React from "react";

import type { ApiClient } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/error-utils";

type PolicyUpdateEvent =
  | { type: "update-started" }
  | { type: "update-succeeded" }
  | { type: "update-failed"; message: string };

interface UseSongOwnerPolicyUpdateInput {
  api: Pick<ApiClient, "rewards">;
  communityId: string | null;
  dispatch: (event: PolicyUpdateEvent) => void;
  postId: string;
  setPolicyAllowed: (allowed: boolean) => void;
}

export function useSongOwnerPolicyUpdate({
  api,
  communityId,
  dispatch,
  postId,
  setPolicyAllowed,
}: UseSongOwnerPolicyUpdateInput): (allowed: boolean) => Promise<void> {
  const inFlight = React.useRef(false);
  const ownerKey = `${communityId ?? ""}:${postId}`;
  const ownerKeyRef = React.useRef(ownerKey);
  if (ownerKeyRef.current !== ownerKey) {
    ownerKeyRef.current = ownerKey;
    inFlight.current = false;
  }
  return React.useCallback(async (allowed: boolean) => {
    if (!communityId || inFlight.current) return;
    const requestOwnerKey = ownerKeyRef.current;
    inFlight.current = true;
    dispatch({ type: "update-started" });
    try {
      const policy = await api.rewards.updateSongOwnerPolicy(communityId, postId, {
        third_party_rewards: allowed ? "allowed" : "blocked",
      });
      if (ownerKeyRef.current !== requestOwnerKey) return;
      setPolicyAllowed(policy.third_party_rewards === "allowed");
      dispatch({ type: "update-succeeded" });
    } catch (error) {
      if (ownerKeyRef.current !== requestOwnerKey) return;
      dispatch({
        type: "update-failed",
        message: getErrorMessage(error, "Could not update bounty settings."),
      });
    } finally {
      if (ownerKeyRef.current === requestOwnerKey) inFlight.current = false;
    }
  }, [api.rewards, communityId, dispatch, postId, setPolicyAllowed]);
}
