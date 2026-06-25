"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import type { ApiCommunityKaraokePolicy } from "@/lib/api/client-api-types";
import { useApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import { toast } from "@/components/primitives/sonner";
import type {
  CommunityKaraokePolicyPageProps,
  CommunityKaraokePolicySettings,
} from "@/components/compositions/community/karaoke-policy/community-karaoke-policy.types";
import { createDefaultKaraokePolicySettings } from "@/components/compositions/community/karaoke-policy/community-karaoke-policy.types";

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
  const [karaokePolicySettings, setKaraokePolicySettings] =
    React.useState<CommunityKaraokePolicySettings>(() => communityToSettings(null));
  const [savedKaraokePolicySettings, setSavedKaraokePolicySettings] =
    React.useState<CommunityKaraokePolicySettings>(() => communityToSettings(null));
  const [loadingKaraokePolicy, setLoadingKaraokePolicy] = React.useState(false);
  const [savingKaraokePolicy, setSavingKaraokePolicy] = React.useState(false);
  const [karaokePolicyError, setKaraokePolicyError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    if (!community) {
      const defaults = createDefaultKaraokePolicySettings();
      setKaraokePolicySettings(defaults);
      setSavedKaraokePolicySettings(defaults);
      setLoadingKaraokePolicy(false);
      setKaraokePolicyError(null);
      return () => {
        cancelled = true;
      };
    }

    const fallback = communityToSettings(community);
    setKaraokePolicySettings(fallback);
    setSavedKaraokePolicySettings(fallback);
    setLoadingKaraokePolicy(true);
    setKaraokePolicyError(null);
    void api.communities.getKaraokePolicy(community.id)
      .then((policy) => {
        if (cancelled) {
          return;
        }
        const settings = policyToSettings(policy);
        setKaraokePolicySettings(settings);
        setSavedKaraokePolicySettings(settings);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setKaraokePolicyError(getErrorMessage(error, "Could not load karaoke policy."));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingKaraokePolicy(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api.communities, community]);

  const karaokePolicyDirty = React.useMemo(
    () => JSON.stringify(karaokePolicySettings) !== JSON.stringify(savedKaraokePolicySettings),
    [karaokePolicySettings, savedKaraokePolicySettings],
  );

  const handleSaveKaraokePolicy = React.useCallback(() => {
    if (!community || savingKaraokePolicy) {
      return;
    }

    setKaraokePolicyError(null);
    setSavingKaraokePolicy(true);
    void api.communities.updateKaraokePolicy(community.id, {
      karaoke_enabled: karaokePolicySettings.karaokeEnabled,
    })
      .then((policy) => {
        const settings = policyToSettings(policy);
        setKaraokePolicySettings(settings);
        setSavedKaraokePolicySettings(settings);
        setCommunity?.((current) => current && current.id === community.id
          ? { ...current, karaoke_enabled: policy.karaoke_enabled }
          : current);
        toast.success("Karaoke policy saved.");
      })
      .catch((error: unknown) => {
        const message = getErrorMessage(error, "Could not save karaoke policy.");
        setKaraokePolicyError(message);
        toast.error(message);
      })
      .finally(() => {
        setSavingKaraokePolicy(false);
      });
  }, [api.communities, community, karaokePolicySettings.karaokeEnabled, savingKaraokePolicy, setCommunity]);

  const karaokePolicySubmitState: CommunityKaraokePolicyPageProps["submitState"] = savingKaraokePolicy
    ? { kind: "saving" }
    : loadingKaraokePolicy
      ? { kind: "loading" }
      : karaokePolicyError
        ? { kind: "error", message: karaokePolicyError }
        : { kind: "idle" };

  return {
    handleSaveKaraokePolicy,
    karaokePolicyDirty,
    karaokePolicySettings,
    karaokePolicySubmitState,
    loadingKaraokePolicy,
    savingKaraokePolicy,
    setKaraokePolicySettings,
  };
}
