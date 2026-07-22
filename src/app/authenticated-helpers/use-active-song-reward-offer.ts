"use client";

import * as React from "react";

import { useApi } from "@/lib/api";
import type { ApiPublicRewardOffer } from "@/lib/api/client-api-types";

export function useActiveSongRewardOffer(input: {
  communityId: string | null | undefined;
  postId: string | null | undefined;
  song: boolean;
}): [ApiPublicRewardOffer | null, () => void] {
  const api = useApi();
  const [offer, setOffer] = React.useState<ApiPublicRewardOffer | null>(null);
  const requestId = React.useRef(0);

  const refresh = React.useCallback(() => {
    const nextRequestId = ++requestId.current;
    if (
      import.meta.env.VITE_REWARDS_ENABLED !== "true"
      || !input.song
      || !input.communityId
      || !input.postId
    ) {
      setOffer(null);
      return;
    }

    void api.rewards.getActiveCampaignForSong(input.communityId, input.postId)
      .then((nextOffer) => {
        if (requestId.current === nextRequestId) setOffer(nextOffer);
      })
      .catch(() => {
        if (requestId.current === nextRequestId) setOffer(null);
      });
  }, [api.rewards, input.communityId, input.postId, input.song]);

  React.useEffect(() => {
    refresh();
    return () => { requestId.current += 1; };
  }, [refresh]);

  return [offer, refresh];
}
