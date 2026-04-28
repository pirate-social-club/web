"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { usePiratePrivyRuntime } from "@/components/auth/privy-provider";

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
