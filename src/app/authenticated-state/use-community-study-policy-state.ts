"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import type { ApiCommunityStudyPolicy } from "@/lib/api/client-api-types";
import { useApi } from "@/lib/api";
import type {
  CommunityStudyPolicyPageProps,
  CommunityStudyPolicySettings,
} from "@/components/compositions/community/study-policy/community-study-policy.types";
import { createDefaultStudyPolicySettings } from "@/components/compositions/community/study-policy/community-study-policy.types";
import { useCommunityPolicyLifecycle } from "./use-community-policy-lifecycle";

function policyToSettings(policy: ApiCommunityStudyPolicy): CommunityStudyPolicySettings {
  return {
    studyEnabled: policy.study_enabled,
    updatedAt: policy.updated_at,
  };
}

function communityToSettings(community: ApiCommunity | null): CommunityStudyPolicySettings {
  return {
    ...createDefaultStudyPolicySettings(),
    studyEnabled: (community as (ApiCommunity & { study_enabled?: boolean }) | null)?.study_enabled === true,
  };
}

export function useCommunityStudyPolicyState({
  community,
  setCommunity,
}: {
  community: ApiCommunity | null;
  setCommunity?: React.Dispatch<React.SetStateAction<ApiCommunity | null>>;
}) {
  const api = useApi();
  const loadPolicy = React.useCallback(
    (communityId: string) => api.communities.getStudyPolicy(communityId),
    [api.communities],
  );
  const savePolicy = React.useCallback(
    (communityId: string, settings: CommunityStudyPolicySettings) =>
      api.communities.updateStudyPolicy(communityId, { study_enabled: settings.studyEnabled }),
    [api.communities],
  );
  const updateCommunity = React.useCallback(
    (communityId: string, policy: ApiCommunityStudyPolicy) => {
      setCommunity?.((current) => current && current.id === communityId
        ? { ...current, study_enabled: policy.study_enabled }
        : current);
    },
    [setCommunity],
  );
  const state = useCommunityPolicyLifecycle({
    community,
    createDefaults: createDefaultStudyPolicySettings,
    fallbackFromCommunity: communityToSettings,
    loadPolicy,
    loadErrorMessage: "Could not load study policy.",
    policyToSettings,
    savePolicy,
    saveErrorMessage: "Could not save study policy.",
    saveSuccessMessage: "Study policy saved.",
    updateCommunity,
  });

  const studyPolicySubmitState: CommunityStudyPolicyPageProps["submitState"] = state.submitState;

  return {
    handleSaveStudyPolicy: state.save,
    loadingStudyPolicy: state.loading,
    savingStudyPolicy: state.saving,
    setStudyPolicySettings: state.setSettings,
    studyPolicyDirty: state.dirty,
    studyPolicySettings: state.settings,
    studyPolicySubmitState,
  };
}
