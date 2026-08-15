import * as React from "react";
import type { Asset as ApiAsset, Post as ApiCreatedPost } from "@pirate/api-contracts";

import { buildAgentActionProof } from "@/lib/agents/browser-agent-action-proof";
import { logger } from "@/lib/logger";
import { toast } from "@/components/primitives/sonner";

import { buildStoryRegistrationCreationWarning } from "./story-registration-warning";

export function useAgentAuthoredBodySigner(
  availableAgent: { agentId: string; privateKeyPem: string } | null,
) {
  return React.useCallback(async <T extends Record<string, unknown>>(path: string, body: T) => {
    if (!availableAgent) throw new Error("No local agent key is available for this post.");
    const proof = await buildAgentActionProof({
      method: "POST",
      url: path,
      body,
      privateKeyPem: availableAgent.privateKeyPem,
    });
    return {
      ...body,
      authorship_mode: "user_agent" as const,
      agent_id: availableAgent.agentId,
      agent_action_proof: proof,
    };
  }, [availableAgent]);
}

export function useStoryRegistrationCreationWarning(input: {
  communityId: string;
  getAsset: (communityId: string, assetId: string) => Promise<ApiAsset>;
}) {
  return React.useCallback(async (
    post: ApiCreatedPost | null,
    postType: "song" | "video",
  ): Promise<ApiAsset | null> => {
    if (!post?.asset) return null;
    try {
      const asset = await input.getAsset(input.communityId, post.asset);
      const warning = buildStoryRegistrationCreationWarning(asset, postType);
      if (warning) toast.warning(warning.title, { description: warning.description });
      return asset;
    } catch (error) {
      logger.warn("[create-post] could not load created asset Story registration status", {
        assetId: post.asset,
        communityId: input.communityId,
        error,
        postId: post.id,
      });
      return null;
    }
  }, [input]);
}
