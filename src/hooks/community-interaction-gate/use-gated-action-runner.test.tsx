import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import * as React from "react";
import type { MembershipGateSummary, User } from "@pirate/api-contracts";

import { ApiError } from "@/lib/api/client";
import { installDomGlobals } from "@/test/setup-dom";
import {
  altchaGateEvaluation,
  altchaRequirement,
  createDeferred,
  gate,
  gatesPanel,
  interactionCopy,
  uniqueHumanRequirement,
} from "./test-fixtures.test";
import type {
  CommunityGateData,
  ModalState,
  PendingInteraction,
} from "@/hooks/use-community-interaction-gate.helpers";

import { useGatedActionRunner } from "./use-gated-action-runner";

installDomGlobals();

const veryRequirement: MembershipGateSummary = {
  accepted_providers: ["very"],
  gate_type: "unique_human",
};

const walletScoreRequirement: MembershipGateSummary = {
  gate_type: "wallet_score",
  minimum_score: 20,
};

const nftRequirement: MembershipGateSummary = {
  chain_namespace: "eip155:1",
  contract_address: "0x1111111111111111111111111111111111111111",
  gate_type: "erc721_holding",
};

const verifiedVeryUser = {
  verification_capabilities: {
    age_over_18: { state: "unverified" },
    gender: { state: "unverified" },
    minimum_age: { state: "unverified" },
    nationality: { state: "unverified" },
    unique_human: { provider: "very", state: "verified" },
    wallet_score: { state: "unverified" },
  },
} as Pick<User, "verification_capabilities">;

const unverifiedUser = {
  verification_capabilities: {
    age_over_18: { state: "unverified" },
    gender: { state: "unverified" },
    minimum_age: { state: "unverified" },
    nationality: { state: "unverified" },
    unique_human: { state: "unverified" },
    wallet_score: { state: "unverified" },
  },
} as Pick<User, "verification_capabilities">;

const passingWalletScoreUser = {
  verification_capabilities: {
    age_over_18: { state: "unverified" },
    gender: { state: "unverified" },
    minimum_age: { state: "unverified" },
    nationality: { state: "unverified" },
    unique_human: { state: "unverified" },
    wallet_score: {
      passing_score: true,
      provider: "passport",
      score_decimal: "25",
      state: "verified",
    },
  },
} as Pick<User, "verification_capabilities">;

function renderRunner({
  connect,
  gateData = gate("already_joined"),
  isAuthOrigin = () => true,
  loadCommunityGate,
  refreshSessionUser,
  sessionAccessToken = "token",
  sessionUser = null,
  startWalletConnection,
  walletConnectionLoading = false,
}: {
  connect?: (() => void) | null;
  gateData?: CommunityGateData;
  isAuthOrigin?: () => boolean;
  loadCommunityGate?: (communityId: string) => Promise<CommunityGateData>;
  refreshSessionUser?: (() => Promise<Pick<User, "verification_capabilities"> | null>) | null;
  sessionAccessToken?: string | null;
  sessionUser?: Pick<User, "verification_capabilities"> | null;
  startWalletConnection?: () => Promise<{ started: boolean }>;
  walletConnectionLoading?: boolean;
} = {}) {
  const calls: string[] = [];
  const errors: string[] = [];
  const infos: Array<{
    message: string;
    options?: { action?: { label: string; onClick: () => void } };
  }> = [];
  let pendingInteraction: PendingInteraction | null = null;
  const altchaCompletions = new Map<string, () => Promise<void> | void>();
  const loadCommunityGateFn = loadCommunityGate ?? (async (communityId) => {
    calls.push(`load:${communityId}`);
    return gateData;
  });

  const hook = renderHook(() => {
    const [modalState, setModalState] = React.useState<ModalState | null>(null);
    const run = useGatedActionRunner({
      altchaLoading: false,
      buildAltchaBody: ({ action, onVerified, scope }) => {
        if (onVerified) {
          altchaCompletions.set(`${action}:${scope}`, onVerified);
        }
        return `altcha:${action}:${scope}`;
      },
      buildAuthUrl: (path) => `auth:${path}`,
      closeModal: () => {
        calls.push("close");
        setModalState(null);
      },
      completeAltchaAction: async () => {
        calls.push("complete-action");
      },
      completeAltchaJoin: async () => {
        calls.push("complete-join");
      },
      connect,
      defaultVerificationLoadingProvider: null,
      interactionCopy,
      invalidateCommunityGate: (communityId) => {
        calls.push(`invalidate:${communityId}`);
      },
      isAuthOrigin,
      loadCommunityGate: loadCommunityGateFn,
      openAuthHref: (href) => {
        calls.push(`href:${href}`);
      },
      openCommunity: (communityId) => {
        calls.push(`open:${communityId}`);
      },
      refreshSessionUser,
      routeKind: "post",
      sessionAccessToken,
      sessionUser,
      setModalState,
      setPendingInteraction: (nextPendingInteraction) => {
        pendingInteraction = nextPendingInteraction;
      },
      showError: (message) => {
        errors.push(message);
      },
      showInfo: (message, options) => {
        infos.push({ message, options });
      },
      startDefaultVerification: async ({ provider }) => {
        calls.push(`verify:${provider}`);
        return { started: true };
      },
      startWalletConnection,
      walletConnectionLoading,
    });
    return { modalState, run };
  });

  return {
    calls,
    altchaCompletions,
    errors,
    hook,
    infos,
    get pendingInteraction() {
      return pendingInteraction;
    },
  };
}

describe("useGatedActionRunner", () => {
  test("blocks unauthenticated actions with an Open in Pirate auth link off canonical origin", async () => {
    const runner = renderRunner({
      isAuthOrigin: () => false,
      sessionAccessToken: null,
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
      });
      expect(result).toBe("blocked");
    });

    expect(runner.infos[0]?.message).toBe(interactionCopy.connectToContinue);
    expect(runner.infos[0]?.options?.action?.label).toBe(interactionCopy.openInPirate);

    runner.infos[0]?.options?.action?.onClick();
    expect(runner.calls).toEqual(["href:auth:/p/post-1"]);
  });

  test("uses Privy connect for unauthenticated actions on canonical origin", async () => {
    const runner = renderRunner({
      connect: () => {
        runner.calls.push("connect");
      },
      isAuthOrigin: () => true,
      sessionAccessToken: null,
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
      });
      expect(result).toBe("blocked");
    });

    expect(runner.calls).toEqual(["connect"]);
    expect(runner.infos).toEqual([]);
  });

  test("runs allowed actions immediately when no Altcha action gate applies", async () => {
    const runner = renderRunner();
    const allowedCalls: string[] = [];

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        onAllowed: () => {
          allowedCalls.push("allowed");
        },
      });
      expect(result).toBe("allowed");
    });

    expect(allowedCalls).toEqual(["allowed"]);
    expect(runner.pendingInteraction).toBe(null);
    expect(runner.hook.result.current.modalState).toBe(null);
  });

  test("invalidates the gate cache when an allowed write is rejected for membership", async () => {
    const runner = renderRunner();
    const rejection = new ApiError(
      "eligibility_failed",
      "Join this community to comment",
      403,
      false,
      { community_id: "community-1", reason: "membership_required" },
    );

    await act(async () => {
      await expect(runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => {
          throw rejection;
        },
        postId: "post-1",
      })).rejects.toBe(rejection);
    });

    expect(runner.calls).toContain("invalidate:community-1");
  });

  test("does not invalidate the gate cache for unrelated write failures", async () => {
    const runner = renderRunner();
    const rejection = new ApiError("comment_media_rejected", "This image cannot be posted.", 422);

    await act(async () => {
      await expect(runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => {
          throw rejection;
        },
        postId: "post-1",
      })).rejects.toBe(rejection);
    });

    expect(runner.calls.filter((call) => call.startsWith("invalidate:"))).toEqual([]);
  });

  test("blocks Altcha-gated post votes for a vote-bound proof", async () => {
    const runner = renderRunner({
      gateData: gate("already_joined", {}, [altchaRequirement]),
    });
    const allowedCalls: string[] = [];

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        onAllowed: () => {
          allowedCalls.push("allowed");
        },
        postId: "post-1",
        voteValue: 1,
      });
      expect(result).toBe("blocked");
    });

    expect(allowedCalls).toEqual([]);
    expect(runner.pendingInteraction?.action).toBe("vote_post");
    expect(runner.pendingInteraction?.voteValue).toBe(1);
    expect(runner.hook.result.current.modalState?.title).toBe("Browser anti-bot check required");
    expect(runner.hook.result.current.modalState?.body).toBe("altcha:post:post-1:1:vote");
    expect(runner.hook.result.current.modalState?.description).toBe(gatesPanel.powOnlyDescription);
    expect(runner.hook.result.current.modalState?.primaryAction).toBeNull();
    expect(runner.hook.result.current.modalState?.secondaryAction).toBeUndefined();

    await act(async () => {
      await runner.altchaCompletions.get("post:post-1:1:vote")?.();
    });
    expect(runner.calls).toEqual(["load:community-1", "complete-action"]);
  });

  test("uses a vote-bound proof for verification-required PoW-only post votes", async () => {
    const runner = renderRunner({
      gateData: gate("verification_required", {
        gate_evaluation: altchaGateEvaluation(),
        missing_capabilities: ["altcha_pow"],
      }, [altchaRequirement]),
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
        voteValue: 1,
      });
      expect(result).toBe("blocked");
    });

    expect(runner.pendingInteraction?.action).toBe("vote_post");
    expect(runner.hook.result.current.modalState?.body).toBe("altcha:post:post-1:1:vote");
    expect(runner.hook.result.current.modalState?.primaryAction).toBeNull();
  });

  test("blocks Altcha-gated comment votes for a vote-bound proof", async () => {
    const runner = renderRunner({
      gateData: gate("already_joined", {}, [altchaRequirement]),
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_comment",
        commentId: "cmt-1",
        communityId: "community-1",
        onAllowed: () => undefined,
        voteValue: -1,
      });
      expect(result).toBe("blocked");
    });

    expect(runner.pendingInteraction?.action).toBe("vote_comment");
    expect(runner.pendingInteraction?.commentId).toBe("cmt-1");
    expect(runner.pendingInteraction?.voteValue).toBe(-1);
    expect(runner.hook.result.current.modalState?.body).toBe("altcha:comment:cmt-1:-1:vote");
  });

  test("runs actions immediately for community staff roles even when gates include Altcha", async () => {
    const gateData = gate("verification_required", {}, [altchaRequirement]);
    gateData.preview.viewer_community_role = "moderator";
    const runner = renderRunner({ gateData, sessionUser: unverifiedUser });
    const allowedCalls: string[] = [];

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        onAllowed: () => {
          allowedCalls.push("allowed");
        },
        postId: "post-1",
        voteValue: 1,
      });
      expect(result).toBe("allowed");
    });

    expect(allowedCalls).toEqual(["allowed"]);
    expect(runner.pendingInteraction).toBe(null);
    expect(runner.hook.result.current.modalState).toBe(null);
  });

  test("runs mixed Very-or-PoW post votes immediately for a Very-verified user", async () => {
    const runner = renderRunner({
      gateData: gate("already_joined", {}, [veryRequirement, altchaRequirement]),
      sessionUser: verifiedVeryUser,
    });
    const allowedCalls: string[] = [];

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        onAllowed: () => {
          allowedCalls.push("allowed");
        },
        postId: "post-1",
        voteValue: 1,
      });
      expect(result).toBe("allowed");
    });

    expect(allowedCalls).toEqual(["allowed"]);
    expect(runner.pendingInteraction).toBe(null);
    expect(runner.hook.result.current.modalState).toBe(null);
  });

  test("keeps PoW available as the fallback action for mixed Very-or-PoW gates when Very is not satisfied", async () => {
    const runner = renderRunner({
      gateData: gate("already_joined", {}, [veryRequirement, altchaRequirement]),
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
        voteValue: 1,
      });
      expect(result).toBe("blocked");
    });

    expect(runner.pendingInteraction?.action).toBe("vote_post");
    expect(runner.hook.result.current.modalState?.title).toBe("Browser anti-bot check required");
    expect(runner.hook.result.current.modalState?.body).toBe("altcha:post:post-1:1:vote");
    expect(runner.hook.result.current.modalState?.description).toContain("verified identity or wallet gate can skip this check");
    expect(runner.hook.result.current.modalState?.requirements).toEqual([]);
  });

  test("shows mixed Very-or-PoW post vote fallback immediately while refreshing stale capabilities", async () => {
    const refreshDeferred = createDeferred<Pick<User, "verification_capabilities"> | null>();
    const runner = renderRunner({
      gateData: gate("already_joined", {}, [veryRequirement, altchaRequirement]),
      refreshSessionUser: () => {
        runner.calls.push("refresh-user");
        return refreshDeferred.promise;
      },
      sessionUser: unverifiedUser,
    });
    const allowedCalls: string[] = [];

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        onAllowed: () => {
          allowedCalls.push("allowed");
        },
        postId: "post-1",
        voteValue: 1,
      });
      expect(result).toBe("blocked");
    });

    expect(runner.calls).toEqual(["load:community-1", "refresh-user"]);
    expect(allowedCalls).toEqual([]);
    expect(runner.pendingInteraction?.action).toBe("vote_post");
    expect(runner.hook.result.current.modalState?.title).toBe("Browser anti-bot check required");

    await act(async () => {
      refreshDeferred.resolve(verifiedVeryUser);
      await refreshDeferred.promise;
      await Promise.resolve();
    });

    expect(runner.calls).toEqual(["load:community-1", "refresh-user", "close"]);
    expect(allowedCalls).toEqual(["allowed"]);
    expect(runner.pendingInteraction).toBe(null);
    expect(runner.hook.result.current.modalState).toBe(null);
  });

  test("shows mixed Very-or-PoW post vote fallback when refreshed capabilities are still unverified", async () => {
    const runner = renderRunner({
      gateData: gate("already_joined", {}, [veryRequirement, altchaRequirement]),
      refreshSessionUser: async () => {
        runner.calls.push("refresh-user");
        return unverifiedUser;
      },
      sessionUser: unverifiedUser,
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
        voteValue: 1,
      });
      expect(result).toBe("blocked");
    });

    expect(runner.calls).toEqual(["load:community-1", "refresh-user"]);
    expect(runner.pendingInteraction?.action).toBe("vote_post");
    expect(runner.hook.result.current.modalState?.title).toBe("Browser anti-bot check required");
    expect(runner.hook.result.current.modalState?.body).toBe("altcha:post:post-1:1:vote");
    expect(runner.hook.result.current.modalState?.description).toContain("verified identity or wallet gate can skip this check");
    expect(runner.hook.result.current.modalState?.requirements).toEqual([]);
  });

  test("runs mixed wallet-score-or-PoW post votes immediately for a passing Passport score", async () => {
    const runner = renderRunner({
      gateData: gate("already_joined", {}, [walletScoreRequirement, altchaRequirement]),
      sessionUser: passingWalletScoreUser,
    });
    const allowedCalls: string[] = [];

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        onAllowed: () => {
          allowedCalls.push("allowed");
        },
        postId: "post-1",
        voteValue: 1,
      });
      expect(result).toBe("allowed");
    });

    expect(allowedCalls).toEqual(["allowed"]);
    expect(runner.pendingInteraction).toBe(null);
    expect(runner.hook.result.current.modalState).toBe(null);
  });

  test("does not build an invalid vote Altcha challenge when vote value is missing", async () => {
    const runner = renderRunner({
      gateData: gate("already_joined", {}, [altchaRequirement]),
    });
    const allowedCalls: string[] = [];

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        onAllowed: () => {
          allowedCalls.push("allowed");
        },
        postId: "post-1",
      });
      expect(result).toBe("allowed");
    });

    expect(allowedCalls).toEqual(["allowed"]);
    expect(runner.pendingInteraction).toBe(null);
    expect(runner.hook.result.current.modalState).toBe(null);
  });

  test("blocks allowed reply actions for an action Altcha proof", async () => {
    const runner = renderRunner({
      gateData: gate("already_joined", {}, [altchaRequirement]),
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
      });
      expect(result).toBe("blocked");
    });

    expect(runner.pendingInteraction?.action).toBe("reply_post");
    expect(runner.hook.result.current.modalState?.title).toBe("Browser anti-bot check required");
    expect(runner.hook.result.current.modalState?.body).toBe("altcha:post:post-1:comment_create");
    expect(runner.hook.result.current.modalState?.primaryAction).toBeNull();
    expect(runner.hook.result.current.modalState?.secondaryAction).toBeUndefined();
  });

  test("uses an action proof for verification-required PoW-only replies", async () => {
    const runner = renderRunner({
      gateData: gate("verification_required", {
        gate_evaluation: altchaGateEvaluation(),
        missing_capabilities: ["altcha_pow"],
      }, [altchaRequirement]),
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
      });
      expect(result).toBe("blocked");
    });

    expect(runner.pendingInteraction?.action).toBe("reply_post");
    expect(runner.hook.result.current.modalState?.title).toBe("Browser anti-bot check required");
    expect(runner.hook.result.current.modalState?.body).toBe("altcha:post:post-1:comment_create");
    expect(runner.hook.result.current.modalState?.description).toBe(gatesPanel.powOnlyDescription);
    expect(runner.hook.result.current.modalState?.primaryAction).toBeNull();
    expect(runner.hook.result.current.modalState?.secondaryAction).toBeUndefined();
  });

  test("routes verification-required non-Altcha gates through the default modal", async () => {
    const runner = renderRunner({
      gateData: gate("verification_required", {
        missing_capabilities: ["unique_human"],
        suggested_verification_provider: "self",
      }, [uniqueHumanRequirement]),
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
      });
      expect(result).toBe("blocked");
    });

    expect(runner.pendingInteraction?.action).toBe("reply_post");
    expect(runner.hook.result.current.modalState?.icon).toBe("self");
    expect(runner.hook.result.current.modalState?.primaryAction?.label).toBe("Verify with ID");

    await act(async () => {
      await runner.hook.result.current.modalState?.primaryAction?.onClick?.();
    });
    expect(runner.calls).toEqual(["load:community-1", "verify:self"]);
  });

  test("routes joinable gates through the default join modal", async () => {
    const runner = renderRunner({
      gateData: gate("joinable"),
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
      });
      expect(result).toBe("blocked");
    });

    expect(runner.pendingInteraction?.action).toBe("reply_post");
    expect(runner.hook.result.current.modalState?.icon).toBe("join");
    expect(runner.hook.result.current.modalState?.primaryAction?.label).toBe("Join");
  });

  test("routes pending request gates through the default pending modal", async () => {
    const runner = renderRunner({
      gateData: gate("pending_request"),
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
      });
      expect(result).toBe("blocked");
    });

    expect(runner.pendingInteraction?.action).toBe("reply_post");
    expect(runner.hook.result.current.modalState?.icon).toBe("pending");
  });

  test("routes gate failed gates through the default blocked modal", async () => {
    const runner = renderRunner({
      gateData: gate("gate_failed", {
        failure_reason: "minimum_age_mismatch",
      }, [uniqueHumanRequirement]),
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
      });
      expect(result).toBe("blocked");
    });

    expect(runner.pendingInteraction?.action).toBe("reply_post");
    expect(runner.hook.result.current.modalState?.icon).toBe("blocked");
  });

  test("offers wallet connection for failed NFT gates", async () => {
    const runner = renderRunner({
      gateData: gate("gate_failed", {
        failure_reason: "erc721_holding_required",
      }, [nftRequirement]),
      startWalletConnection: async () => {
        runner.calls.push("connect-wallet");
        return { started: true };
      },
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
      });
      expect(result).toBe("blocked");
    });

    expect(runner.pendingInteraction?.action).toBe("reply_post");
    expect(runner.hook.result.current.modalState?.icon).toBe("blocked");
    expect(runner.hook.result.current.modalState?.primaryAction?.label).toBe("Connect wallet");

    await act(async () => {
      await runner.hook.result.current.modalState?.primaryAction?.onClick?.();
    });

    expect(runner.calls).toEqual(["load:community-1", "connect-wallet"]);
  });

  test("routes banned gates through the default blocked modal", async () => {
    const runner = renderRunner({
      gateData: gate("banned"),
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
      });
      expect(result).toBe("blocked");
    });

    expect(runner.pendingInteraction?.action).toBe("reply_post");
    expect(runner.hook.result.current.modalState?.icon).toBe("blocked");
  });

  test("reports gate loading failures as blocked actions", async () => {
    const runner = renderRunner({
      loadCommunityGate: async () => {
        throw new Error("lookup failed");
      },
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
      });
      expect(result).toBe("blocked");
    });

    expect(runner.errors).toEqual([interactionCopy.couldNotCheckRequirements]);
    expect(runner.hook.result.current.modalState).toBe(null);
  });
});
