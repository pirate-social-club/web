"use client";

import type { CommunityPreview } from "@pirate/api-contracts";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { useApi } from "@/lib/api";

export type InitialPublicCommunity = {
  identifier: string;
  preview: CommunityPreview;
};

const InitialPublicCommunityContext = React.createContext<InitialPublicCommunity | null>(null);

export function InitialPublicCommunityProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value?: InitialPublicCommunity | null;
}) {
  return (
    <InitialPublicCommunityContext.Provider value={value ?? null}>
      {children}
    </InitialPublicCommunityContext.Provider>
  );
}

export function publicCommunityQueryKey(communityId: string | null, locale: string | null) {
  return ["public-community", communityId, locale ?? null] as const;
}

export function usePublicCommunityQuery(communityId: string | null, locale: string | null) {
  const api = useApi();
  const initial = React.useContext(InitialPublicCommunityContext);
  const initialData = communityId && initial?.identifier === communityId ? initial.preview : undefined;
  return useQuery({
    queryKey: publicCommunityQueryKey(communityId, locale),
    queryFn: () => api.publicCommunities.get(communityId!, { locale }),
    enabled: Boolean(communityId),
    initialData,
    staleTime: 60_000,
  });
}
