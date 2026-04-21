"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import type {
  CommunityAgentPolicyPageProps,
  CommunityAgentPolicySettings,
} from "@/components/compositions/community-agent-policy/community-agent-policy.types";
import { useApi } from "@/lib/api";

import type { SaveCommunityAction } from "./community-moderation-save";
import { getErrorMessage } from "./route-core";

export function getCommunityAgentPolicySettings(
  community: ApiCommunity | null,
): CommunityAgentPolicySettings {
  return {
    agentPostingPolicy: community?.agent_posting_policy === "disallow" ? "disallow" : "allow",
    agentPostingScope: community?.agent_posting_scope === "top_level_and_replies"
      ? "top_level_and_replies"
      : "replies_only",
    acceptedAgentOwnershipProviders: community?.accepted_agent_ownership_providers ?? [],
    dailyPostCap: community?.agent_daily_post_cap ?? null,
    dailyReplyCap: community?.agent_daily_reply_cap ?? null,
  };
}

export function useCommunityAgentPolicyState({
  community,
  saveCommunity,
}: {
  community: ApiCommunity | null;
  saveCommunity: SaveCommunityAction;
}) {
  const api = useApi();
  const [agentSettings, setAgentSettings] = React.useState<CommunityAgentPolicySettings>(
    getCommunityAgentPolicySettings(null),
  );
  const [savingAgents, setSavingAgents] = React.useState(false);
  const [agentSaveError, setAgentSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!community) {
      return;
    }

    setAgentSettings(getCommunityAgentPolicySettings(community));
    setAgentSaveError(null);
  }, [community]);

  const handleSaveAgents = React.useCallback(() => {
    if (!community || savingAgents) return;
    setAgentSaveError(null);
    void saveCommunity(
      () => api.communities.update(community.community_id, {
        agent_posting_policy: agentSettings.agentPostingPolicy,
        agent_posting_scope: agentSettings.agentPostingScope,
        accepted_agent_ownership_providers: agentSettings.acceptedAgentOwnershipProviders,
        agent_daily_post_cap: agentSettings.dailyPostCap,
        agent_daily_reply_cap: agentSettings.dailyReplyCap,
      }),
      setSavingAgents,
      "Agents saved.",
      "Could not save agents.",
    ).then((updatedCommunity) => {
      setAgentSettings(getCommunityAgentPolicySettings(updatedCommunity));
    }).catch((nextError: unknown) => {
      setAgentSaveError(getErrorMessage(nextError, "Could not save agents."));
    });
  }, [agentSettings, api.communities, community, saveCommunity, savingAgents]);

  const agentSubmitState: CommunityAgentPolicyPageProps["submitState"] = savingAgents
    ? { kind: "saving" }
    : agentSaveError
      ? { kind: "error", message: agentSaveError }
      : { kind: "idle" };

  return {
    agentSettings,
    agentSubmitState,
    handleSaveAgents,
    savingAgents,
    setAgentSettings,
  };
}
