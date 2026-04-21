import { describe, expect, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { parseHTML } from "linkedom";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import { api } from "@/lib/api";

import type { SaveCommunityAction } from "./community-moderation-save";
import { useCommunityAgentPolicyState } from "./use-community-agent-policy-state";

const { document, window } = parseHTML("<!DOCTYPE html><html><body></body></html>");
(globalThis as any).document = document;
(globalThis as any).window = window;
(globalThis as any).navigator = window.navigator;

type AgentBody = {
  agent_posting_policy: "disallow" | "allow";
  agent_posting_scope: "replies_only" | "top_level_and_replies";
  accepted_agent_ownership_providers: Array<"self_agent_id" | "clawkey">;
  agent_daily_post_cap: number | null;
  agent_daily_reply_cap: number | null;
};

function createCommunity(overrides: Partial<ApiCommunity> = {}): ApiCommunity {
  return {
    community_id: "community-1",
    display_name: "Test Community",
    agent_posting_policy: "disallow",
    agent_posting_scope: "top_level_and_replies",
    accepted_agent_ownership_providers: ["self_agent_id"],
    agent_daily_post_cap: 3,
    agent_daily_reply_cap: 12,
    ...overrides,
  } as ApiCommunity;
}

function installCommunityApiMocks() {
  const calls = {
    update: [] as Array<{ communityId: string; body: AgentBody }>,
  };

  const communities = api.communities as unknown as {
    update: (communityId: string, body: AgentBody) => Promise<ApiCommunity>;
  };

  communities.update = async (communityId, body) => {
    calls.update.push({ communityId, body });
    return createCommunity({
      agent_posting_policy: body.agent_posting_policy,
      agent_posting_scope: body.agent_posting_scope,
      accepted_agent_ownership_providers: body.accepted_agent_ownership_providers,
      agent_daily_post_cap: body.agent_daily_post_cap,
      agent_daily_reply_cap: body.agent_daily_reply_cap,
    });
  };

  return calls;
}

function createSaveCommunityMock() {
  const calls: Array<{ successMessage: string; failureMessage: string }> = [];
  const saveCommunity: SaveCommunityAction = async (
    action,
    savingSetter,
    successMessage,
    failureMessage,
  ) => {
    calls.push({ successMessage, failureMessage });
    savingSetter(true);
    try {
      return await action();
    } finally {
      savingSetter(false);
    }
  };

  return { calls, saveCommunity };
}

function renderAgentsHook({
  community = createCommunity(),
  saveCommunity = createSaveCommunityMock().saveCommunity,
}: {
  community?: ApiCommunity | null;
  saveCommunity?: SaveCommunityAction;
} = {}) {
  return renderHook(() => useCommunityAgentPolicyState({ community, saveCommunity }));
}

describe("useCommunityAgentPolicyState", () => {
  test("initializes agent policy settings from the community record", async () => {
    installCommunityApiMocks();
    const { result } = renderAgentsHook();

    await waitFor(() => expect(result.current.agentSettings.agentPostingPolicy).toBe("disallow"));

    expect(result.current.agentSettings.agentPostingScope).toBe("top_level_and_replies");
    expect(result.current.agentSettings.acceptedAgentOwnershipProviders).toEqual(["self_agent_id"]);
    expect(result.current.agentSettings.dailyPostCap).toBe(3);
    expect(result.current.agentSubmitState).toEqual({ kind: "idle" });
  });

  test("saves agent settings through the injected save boundary", async () => {
    const calls = installCommunityApiMocks();
    const save = createSaveCommunityMock();
    const { result } = renderAgentsHook({ saveCommunity: save.saveCommunity });

    await waitFor(() => expect(result.current.agentSettings.agentPostingPolicy).toBe("disallow"));

    act(() => {
      result.current.setAgentSettings({
        agentPostingPolicy: "allow",
        agentPostingScope: "replies_only",
        acceptedAgentOwnershipProviders: ["clawkey"],
        dailyPostCap: null,
        dailyReplyCap: 20,
      });
    });
    act(() => {
      result.current.handleSaveAgents();
    });

    await waitFor(() => expect(calls.update).toHaveLength(1));

    expect(save.calls).toEqual([{
      successMessage: "Agents saved.",
      failureMessage: "Could not save agents.",
    }]);
    expect(calls.update[0]).toEqual({
      communityId: "community-1",
      body: {
        agent_posting_policy: "allow",
        agent_posting_scope: "replies_only",
        accepted_agent_ownership_providers: ["clawkey"],
        agent_daily_post_cap: null,
        agent_daily_reply_cap: 20,
      },
    });
  });
});
