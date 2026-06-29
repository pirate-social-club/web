"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import type { ApiCommunityStudyPolicy } from "@/lib/api/client-api-types";
import { useApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import { toast } from "@/components/primitives/sonner";
import type {
  CommunityStudyPolicyPageProps,
  CommunityStudyPolicySettings,
} from "@/components/compositions/community/study-policy/community-study-policy.types";
import { createDefaultStudyPolicySettings } from "@/components/compositions/community/study-policy/community-study-policy.types";

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
  const [studyPolicySettings, setStudyPolicySettings] =
    React.useState<CommunityStudyPolicySettings>(() => communityToSettings(null));
  const [savedStudyPolicySettings, setSavedStudyPolicySettings] =
    React.useState<CommunityStudyPolicySettings>(() => communityToSettings(null));
  const [loadingStudyPolicy, setLoadingStudyPolicy] = React.useState(false);
  const [savingStudyPolicy, setSavingStudyPolicy] = React.useState(false);
  const [studyPolicyError, setStudyPolicyError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    if (!community) {
      const defaults = createDefaultStudyPolicySettings();
      setStudyPolicySettings(defaults);
      setSavedStudyPolicySettings(defaults);
      setLoadingStudyPolicy(false);
      setStudyPolicyError(null);
      return () => {
        cancelled = true;
      };
    }

    const fallback = communityToSettings(community);
    setStudyPolicySettings(fallback);
    setSavedStudyPolicySettings(fallback);
    setLoadingStudyPolicy(true);
    setStudyPolicyError(null);
    void api.communities.getStudyPolicy(community.id)
      .then((policy) => {
        if (cancelled) {
          return;
        }
        const settings = policyToSettings(policy);
        setStudyPolicySettings(settings);
        setSavedStudyPolicySettings(settings);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStudyPolicyError(getErrorMessage(error, "Could not load study policy."));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingStudyPolicy(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api.communities, community]);

  const studyPolicyDirty = React.useMemo(
    () => JSON.stringify(studyPolicySettings) !== JSON.stringify(savedStudyPolicySettings),
    [studyPolicySettings, savedStudyPolicySettings],
  );

  const handleSaveStudyPolicy = React.useCallback(() => {
    if (!community || savingStudyPolicy) {
      return;
    }

    setStudyPolicyError(null);
    setSavingStudyPolicy(true);
    void api.communities.updateStudyPolicy(community.id, {
      study_enabled: studyPolicySettings.studyEnabled,
    })
      .then((policy) => {
        const settings = policyToSettings(policy);
        setStudyPolicySettings(settings);
        setSavedStudyPolicySettings(settings);
        setCommunity?.((current) => current && current.id === community.id
          ? { ...current, study_enabled: policy.study_enabled }
          : current);
        toast.success("Study policy saved.");
      })
      .catch((error: unknown) => {
        const message = getErrorMessage(error, "Could not save study policy.");
        setStudyPolicyError(message);
        toast.error(message);
      })
      .finally(() => {
        setSavingStudyPolicy(false);
      });
  }, [api.communities, community, savingStudyPolicy, setCommunity, studyPolicySettings.studyEnabled]);

  const studyPolicySubmitState: CommunityStudyPolicyPageProps["submitState"] = savingStudyPolicy
    ? { kind: "saving" }
    : loadingStudyPolicy
      ? { kind: "loading" }
      : studyPolicyError
        ? { kind: "error", message: studyPolicyError }
        : { kind: "idle" };

  return {
    handleSaveStudyPolicy,
    loadingStudyPolicy,
    savingStudyPolicy,
    setStudyPolicySettings,
    studyPolicyDirty,
    studyPolicySettings,
    studyPolicySubmitState,
  };
}
