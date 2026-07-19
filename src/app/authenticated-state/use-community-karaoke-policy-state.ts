"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import type { ApiCommunityKaraokePolicy } from "@/lib/api/client-api-types";
import { useApi } from "@/lib/api";
import type {
  CommunityKaraokePolicyPageProps,
  CommunityKaraokePolicySettings,
} from "@/components/compositions/community/karaoke-policy/community-karaoke-policy.types";
import { createDefaultKaraokePolicySettings } from "@/components/compositions/community/karaoke-policy/community-karaoke-policy.types";
import { useCommunityPolicyLifecycle } from "./use-community-policy-lifecycle";

function policyToSettings(policy: ApiCommunityKaraokePolicy): CommunityKaraokePolicySettings {
  return {
    karaokeEnabled: policy.karaoke_enabled,
    updatedAt: policy.updated_at,
  };
}

function communityToSettings(community: ApiCommunity | null): CommunityKaraokePolicySettings {
  return {
    ...createDefaultKaraokePolicySettings(),
    karaokeEnabled: (community as (ApiCommunity & { karaoke_enabled?: boolean }) | null)?.karaoke_enabled === true,
  };
}

export function useCommunityKaraokePolicyState({
  community,
  setCommunity,
}: {
  community: ApiCommunity | null;
  setCommunity?: React.Dispatch<React.SetStateAction<ApiCommunity | null>>;
}) {
  const api = useApi();
  const loadPolicy = React.useCallback(
    (communityId: string) => api.communities.getKaraokePolicy(communityId),
    [api.communities],
  );
  const savePolicy = React.useCallback(
    (communityId: string, settings: CommunityKaraokePolicySettings) =>
      api.communities.updateKaraokePolicy(communityId, {
        karaoke_enabled: settings.karaokeEnabled,
      }),
    [api.communities],
  );
  const updateCommunity = React.useCallback(
    (communityId: string, policy: ApiCommunityKaraokePolicy) => {
      setCommunity?.((current) => current && current.id === communityId
        ? { ...current, karaoke_enabled: policy.karaoke_enabled }
        : current);
    },
    [setCommunity],
  );
  const state = useCommunityPolicyLifecycle({
    community,
    createDefaults: createDefaultKaraokePolicySettings,
    fallbackFromCommunity: communityToSettings,
    loadPolicy,
    loadErrorMessage: "Could not load karaoke policy.",
    policyToSettings,
    savePolicy,
    saveErrorMessage: "Could not save karaoke policy.",
    saveSuccessMessage: "Karaoke policy saved.",
    updateCommunity,
  });

  const karaokePolicySubmitState: CommunityKaraokePolicyPageProps["submitState"] = state.submitState;

  return {
    handleSaveKaraokePolicy: state.save,
    karaokePolicyDirty: state.dirty,
    karaokePolicySettings: state.settings,
    karaokePolicySubmitState,
    loadingKaraokePolicy: state.loading,
    savingKaraokePolicy: state.saving,
    setKaraokePolicySettings: state.setSettings,
  };
}
