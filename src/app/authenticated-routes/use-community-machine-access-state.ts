"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import type {
  ApiCommunityMachineAccessPolicy,
  ApiCommunityMachineAccessPolicyUpdate,
} from "@/lib/api/client-api-types";
import { useApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/client";
import { toast } from "@/components/primitives/sonner";
import type {
  CommunityMachineAccessPageProps,
  CommunityMachineAccessSettings,
} from "@/components/compositions/community-machine-access/community-machine-access.types";
import { createDefaultMachineAccessSettings } from "@/components/compositions/community-machine-access/community-machine-access.types";

function policyToSettings(policy: ApiCommunityMachineAccessPolicy): CommunityMachineAccessSettings {
  return {
    policyOrigin: policy.policy_origin,
    includedSurfaces: {
      communityIdentity: true,
      communityStats: policy.included_surfaces.community_stats,
      threadCards: policy.included_surfaces.thread_cards,
      threadBodies: policy.included_surfaces.thread_bodies,
      topComments: policy.included_surfaces.top_comments,
      events: policy.included_surfaces.events,
    },
    topCommentsLimit: policy.operational_limits.top_comments_limit,
    anonymousRateTier: policy.operational_limits.anonymous_rate_tier,
    authenticatedRateTier: policy.operational_limits.authenticated_rate_tier,
  };
}

function settingsToPolicyUpdate(settings: CommunityMachineAccessSettings): ApiCommunityMachineAccessPolicyUpdate {
  return {
    included_surfaces: {
      community_identity: true,
      community_stats: settings.includedSurfaces.communityStats,
      thread_cards: settings.includedSurfaces.threadCards,
      thread_bodies: settings.includedSurfaces.threadBodies,
      top_comments: settings.includedSurfaces.topComments,
      events: settings.includedSurfaces.events,
    },
  };
}

export function useCommunityMachineAccessState({
  community,
}: {
  community: ApiCommunity | null;
}) {
  const api = useApi();
  const [machineAccessSettings, setMachineAccessSettings] =
    React.useState<CommunityMachineAccessSettings>(createDefaultMachineAccessSettings());
  const [savedMachineAccessSettings, setSavedMachineAccessSettings] =
    React.useState<CommunityMachineAccessSettings>(createDefaultMachineAccessSettings());
  const [loadingMachineAccess, setLoadingMachineAccess] = React.useState(false);
  const [savingMachineAccess, setSavingMachineAccess] = React.useState(false);
  const [machineAccessSaveError, setMachineAccessSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    if (!community) {
      const defaults = createDefaultMachineAccessSettings();
      setMachineAccessSettings(defaults);
      setSavedMachineAccessSettings(defaults);
      setLoadingMachineAccess(false);
      return () => {
        cancelled = true;
      };
    }

    setLoadingMachineAccess(true);
    setMachineAccessSaveError(null);
    void api.communities.getMachineAccessPolicy(community.community_id)
      .then((policy) => {
        if (cancelled) {
          return;
        }
        const settings = policyToSettings(policy);
        setMachineAccessSettings(settings);
        setSavedMachineAccessSettings(settings);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMachineAccessSaveError(getApiErrorMessage(error, "Could not load machine access policy."));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingMachineAccess(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api.communities, community]);

  const machineAccessDirty = React.useMemo(
    () => JSON.stringify(machineAccessSettings) !== JSON.stringify(savedMachineAccessSettings),
    [machineAccessSettings, savedMachineAccessSettings],
  );

  const handleSaveMachineAccess = React.useCallback(() => {
    if (!community || savingMachineAccess) {
      return;
    }

    setMachineAccessSaveError(null);
    setSavingMachineAccess(true);
    void api.communities.updateMachineAccessPolicy(
      community.community_id,
      settingsToPolicyUpdate(machineAccessSettings),
    )
      .then((policy) => {
        const settings = policyToSettings(policy);
        setMachineAccessSettings(settings);
        setSavedMachineAccessSettings(settings);
        toast.success("Machine access updated.");
      })
      .catch((error: unknown) => {
        const message = getApiErrorMessage(error, "Failed to save machine access settings.");
        setMachineAccessSaveError(message);
        toast.error(message);
      })
      .finally(() => {
        setSavingMachineAccess(false);
      });
  }, [api.communities, community, machineAccessSettings, savingMachineAccess]);

  const machineAccessSubmitState: CommunityMachineAccessPageProps["submitState"] = savingMachineAccess
    ? { kind: "saving" }
    : machineAccessSaveError
      ? { kind: "error", message: machineAccessSaveError }
      : { kind: "idle" };

  return {
    handleSaveMachineAccess,
    loadingMachineAccess,
    machineAccessDirty,
    machineAccessSettings,
    machineAccessSubmitState,
    savingMachineAccess,
    setMachineAccessSettings,
  };
}
