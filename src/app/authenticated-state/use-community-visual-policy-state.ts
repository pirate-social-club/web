"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { submitCommunitySave, type SaveCommunityAction } from "@/app/authenticated-helpers/community-moderation-save";
import {
  adultToplessNonExplicitSettings,
  visualPolicySettingsFromApi,
  visualPolicySettingsToApi,
  type VisualPolicySettings,
} from "@/components/compositions/community/visual-policy/visual-policy-model";

export function useCommunityVisualPolicyState({
  community,
  saveCommunity,
}: {
  community: ApiCommunity | null;
  saveCommunity: SaveCommunityAction;
}) {
  const api = useApi();
  const [visualPolicySettings, setVisualPolicySettings] = React.useState<VisualPolicySettings>(adultToplessNonExplicitSettings);
  const [savingVisualPolicy, setSavingVisualPolicy] = React.useState(false);

  React.useEffect(() => {
    if (!community) {
      return;
    }

    setVisualPolicySettings(visualPolicySettingsFromApi(community.visual_policy_settings));
  }, [community]);

  const handleSaveVisualPolicy = React.useCallback(() => {
    void submitCommunitySave({
      action: (currentCommunity) => api.communities.updateVisualPolicy(currentCommunity.id, {
        visual_policy_settings: visualPolicySettingsToApi(visualPolicySettings),
      }),
      community,
      failureMessage: "Could not save visual policy.",
      saveCommunity,
      saving: savingVisualPolicy,
      savingSetter: setSavingVisualPolicy,
      successMessage: "Visual policy saved.",
    });
  }, [api.communities, community, saveCommunity, savingVisualPolicy, visualPolicySettings]);

  return {
    handleSaveVisualPolicy,
    savingVisualPolicy,
    setVisualPolicySettings,
    visualPolicySettings,
  };
}
