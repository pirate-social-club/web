"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";

import type { SaveCommunityAction } from "./community-moderation-save";
import {
  getCommunityAdultContentPolicyState,
  getCommunityCivilityPolicyState,
  getCommunityGraphicContentPolicyState,
  getCommunityOpenAIModerationSettingsState,
} from "./moderation-helpers";

export function useCommunitySafetyState({
  community,
  saveCommunity,
}: {
  community: ApiCommunity | null;
  saveCommunity: SaveCommunityAction;
}) {
  const api = useApi();
  const [providerSettings, setProviderSettings] = React.useState(() => getCommunityOpenAIModerationSettingsState({} as ApiCommunity));
  const [adultContentPolicy, setAdultContentPolicy] = React.useState(() => getCommunityAdultContentPolicyState({} as ApiCommunity));
  const [graphicContentPolicy, setGraphicContentPolicy] = React.useState(() => getCommunityGraphicContentPolicyState({} as ApiCommunity));
  const [civilityPolicy, setCivilityPolicy] = React.useState(() => getCommunityCivilityPolicyState({} as ApiCommunity));
  const [savingSafety, setSavingSafety] = React.useState(false);

  React.useEffect(() => {
    if (!community) {
      return;
    }

    setProviderSettings(getCommunityOpenAIModerationSettingsState(community));
    setAdultContentPolicy(getCommunityAdultContentPolicyState(community));
    setGraphicContentPolicy(getCommunityGraphicContentPolicyState(community));
    setCivilityPolicy(getCommunityCivilityPolicyState(community));
  }, [community]);

  const handleSaveSafety = React.useCallback(() => {
    if (!community || savingSafety) return;
    void saveCommunity(
      () => api.communities.updateSafety(community.community_id, {
        adult_content_policy: { ...adultContentPolicy },
        civility_policy: { ...civilityPolicy },
        graphic_content_policy: { ...graphicContentPolicy },
        openai_moderation_settings: {
          scan_titles: providerSettings.scanTitles,
          scan_post_bodies: providerSettings.scanPostBodies,
          scan_captions: providerSettings.scanCaptions,
          scan_link_preview_text: providerSettings.scanLinkPreviewText,
          scan_images: providerSettings.scanImages,
        },
      }),
      setSavingSafety,
      "Safety settings saved.",
      "Could not save safety settings.",
    );
  }, [adultContentPolicy, api.communities, civilityPolicy, community, graphicContentPolicy, providerSettings, saveCommunity, savingSafety]);

  return {
    adultContentPolicy,
    civilityPolicy,
    graphicContentPolicy,
    handleSaveSafety,
    providerSettings,
    savingSafety,
    setAdultContentPolicy,
    setCivilityPolicy,
    setGraphicContentPolicy,
    setProviderSettings,
  };
}
