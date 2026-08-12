"use client";

import * as React from "react";

import { useApi } from "@/lib/api";

export function useBoostMenuEligibility(input: {
  authenticated: boolean;
  postIds: readonly string[];
}): ReadonlySet<string> {
  const api = useApi();
  const postIdsKey = [...new Set(input.postIds.filter(Boolean))].sort().join(",");
  const [eligiblePostIds, setEligiblePostIds] = React.useState<ReadonlySet<string>>(() => new Set());

  React.useEffect(() => {
    if (!input.authenticated || !postIdsKey) {
      setEligiblePostIds(new Set());
      return;
    }

    let cancelled = false;
    const postIds = postIdsKey.split(",");
    void Promise.all(postIds.map(async (postId) => {
      try {
        const capabilities = await api.rewards.getCampaignCapabilities(postId);
        return capabilities.enabled && capabilities.post_eligible ? postId : null;
      } catch {
        return null;
      }
    })).then((results) => {
      if (!cancelled) setEligiblePostIds(new Set(results.filter((postId): postId is string => Boolean(postId))));
    });

    return () => { cancelled = true; };
  }, [api.rewards, input.authenticated, postIdsKey]);

  return eligiblePostIds;
}
