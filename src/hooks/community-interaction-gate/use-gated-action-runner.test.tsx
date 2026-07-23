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
  invalidateCommunityGate,
  isAuthOrigin = () => true,
  loadCommunityGate,
  refreshSessionUser,
  sessionAccessToken = "token",
  sessionUser = null,
  solveActionAltcha,
  startWalletConnection,
  showSuccess,
  walletConnectionLoading = false,
}: {
  connect?: (() => void) | null;
  gateData?: CommunityGateData;
  invalidateCommunityGate?: (communityId: string) => void;
  isAuthOrigin?: () => boolean;
  loadCommunityGate?: (communityId: string) => Promise<CommunityGateData>;
  refreshSessionUser?: (() => Promise<Pick<User, "verification_capabilities"> | null>) | null;
  sessionAccessToken?: string | null;
  sessionUser?: Pick<User, "verification_capabilities"> | null;
  solveActionAltcha?: ((input: { action: string; scope: string }) => Promise<string>) | null;
  startWalletConnection?: () => Promise<{ started: boolean }>;
  showSuccess?: (message: string) => void;
  walletConnectionLoading?: boolean;
} = {}) {
  const calls: string[] = [];
  const errors: string[] = [];
  const successes: string[] = [];
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
      invalidateCommunityGate: invalidateCommunityGate ?? ((communityId) => {
        calls.push(`invalidate:${communityId}`);
      }),
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
      showSuccess: showSuccess ?? ((message) => {
        successes.push(message);
      }),
      solveActionAltcha,
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
    successes,
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

  test("solves PoW headlessly for a non-member vote in a PoW-only community and toasts the auto-follow", async () => {
    const solves: Array<{ action: string; scope: string }> = [];
    const allowedContexts: Array<{ altchaPayload?: string | null } | undefined> = [];
    const loadedFollowing: Array<boolean | null | undefined> = [];
    const followedGate = gate(
      "verification_required",
      { gate_evaluation: altchaGateEvaluation() },
      [altchaRequirement],
      { viewerFollowing: true },
    );
    const runner = renderRunner({
      gateData: gate(
        "verification_required",
        { gate_evaluation: altchaGateEvaluation() },
        [altchaRequirement],
        { viewerFollowing: false },
      ),
      loadCommunityGate: async () => {
        loadedFollowing.push(followedGate.preview.viewer_following);
        return followedGate;
      },
      solveActionAltcha: async (input) => {
        solves.push(input);
        return "solved-payload";
      },
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        gateData: gate(
          "verification_required",
          { gate_evaluation: altchaGateEvaluation() },
          [altchaRequirement],
          { viewerFollowing: false },
        ),
        onAllowed: (context) => {
          allowedContexts.push(context);
        },
        postId: "post-1",
        voteValue: 1,
      });
      expect(result).toBe("allowed");
    });

    expect(solves).toEqual([{ action: "post:post-1:1", scope: "vote" }]);
    expect(allowedContexts).toEqual([{ altchaPayload: "solved-payload" }]);
    expect(loadedFollowing).toEqual([true]);
    expect(runner.successes).toEqual(["Following Test Community"]);
    expect(runner.calls).toContain("invalidate:community-1");
    expect(runner.hook.result.current.modalState).toBe(null);
    expect(runner.pendingInteraction).toBe(null);
  });

  test("does not reopen verification or retry when the headless write fails", async () => {
    const runner = renderRunner({
      gateData: gate(
        "verification_required",
        { gate_evaluation: altchaGateEvaluation() },
        [altchaRequirement],
      ),
      solveActionAltcha: async () => "solved-payload",
    });
    let allowedCalls = 0;
    let thrown: unknown;

    await act(async () => {
      try {
        await runner.hook.result.current.run({
          action: "vote_post",
          communityId: "community-1",
          onAllowed: () => {
            allowedCalls += 1;
            throw new Error("write failed");
          },
          postId: "post-1",
          voteValue: 1,
        });
      } catch (error) {
        thrown = error;
      }
    });

    expect((thrown as Error).message).toBe("write failed");
    expect(allowedCalls).toBe(1);
    expect(runner.hook.result.current.modalState).toBe(null);
    expect(runner.pendingInteraction).toBe(null);
  });

  test("does not reopen verification or retry after post-write bookkeeping fails", async () => {
    const runner = renderRunner({
      gateData: gate(
        "verification_required",
        { gate_evaluation: altchaGateEvaluation() },
        [altchaRequirement],
        { viewerFollowing: false },
      ),
      invalidateCommunityGate: () => {
        throw new Error("cache invalidation failed");
      },
      solveActionAltcha: async () => "solved-payload",
    });
    let allowedCalls = 0;

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        onAllowed: () => {
          allowedCalls += 1;
        },
        postId: "post-1",
        voteValue: 1,
      });
      expect(result).toBe("allowed");
    });

    expect(allowedCalls).toBe(1);
    expect(runner.hook.result.current.modalState).toBe(null);
    expect(runner.pendingInteraction).toBe(null);
  });

  test("does not reopen verification or retry when the follow toast fails", async () => {
    const followedGate = gate(
      "verification_required",
      { gate_evaluation: altchaGateEvaluation() },
      [altchaRequirement],
      { viewerFollowing: true },
    );
    const runner = renderRunner({
      gateData: gate(
        "verification_required",
        { gate_evaluation: altchaGateEvaluation() },
        [altchaRequirement],
        { viewerFollowing: false },
      ),
      loadCommunityGate: async () => followedGate,
      showSuccess: () => {
        throw new Error("toast failed");
      },
      solveActionAltcha: async () => "solved-payload",
    });
    let allowedCalls = 0;

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        onAllowed: () => {
          allowedCalls += 1;
        },
        postId: "post-1",
        voteValue: 1,
      });
      expect(result).toBe("allowed");
    });

    expect(allowedCalls).toBe(1);
    expect(runner.hook.result.current.modalState).toBe(null);
    expect(runner.pendingInteraction).toBe(null);
  });

  test("does not repeat the follow toast after the first confirmed transition", async () => {
    const staleUnfollowedGate = gate(
      "verification_required",
      { gate_evaluation: altchaGateEvaluation() },
      [altchaRequirement],
      { viewerFollowing: false },
    );
    let followReads = 0;
    const runner = renderRunner({
      gateData: staleUnfollowedGate,
      loadCommunityGate: async () => {
        followReads += 1;
        return gate(
          "verification_required",
          { gate_evaluation: altchaGateEvaluation() },
          [altchaRequirement],
          { viewerFollowing: true },
        );
      },
      solveActionAltcha: async () => "solved-payload",
    });

    await act(async () => {
      await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        gateData: staleUnfollowedGate,
        onAllowed: () => undefined,
        postId: "post-1",
        voteValue: 1,
      });
      await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        gateData: staleUnfollowedGate,
        onAllowed: () => undefined,
        postId: "post-2",
        voteValue: 1,
      });
    });

    expect(followReads).toBe(1);
    expect(runner.successes).toEqual(["Following Test Community"]);
  });

  test("does not toast when the authoritative follow state remains inactive", async () => {
    const unfollowedGate = gate(
      "verification_required",
      { gate_evaluation: altchaGateEvaluation() },
      [altchaRequirement],
      { viewerFollowing: false },
    );
    const runner = renderRunner({
      gateData: unfollowedGate,
      loadCommunityGate: async () => unfollowedGate,
      solveActionAltcha: async () => "solved-payload",
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        gateData: unfollowedGate,
        onAllowed: () => undefined,
        postId: "post-1",
        voteValue: 1,
      });
      expect(result).toBe("allowed");
    });

    expect(runner.successes).toEqual([]);
  });

  test("falls back to the widget modal when headless solving fails", async () => {
    const runner = renderRunner({
      gateData: gate(
        "verification_required",
        { gate_evaluation: altchaGateEvaluation() },
        [altchaRequirement],
      ),
      solveActionAltcha: async () => {
        throw new Error("challenge rate limited");
      },
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

    expect(runner.successes).toEqual([]);
    expect(runner.hook.result.current.modalState).not.toBe(null);
    expect(runner.pendingInteraction?.altchaAction).toBe("post:post-1:1");
    expect(runner.pendingInteraction?.altchaScope).toBe("vote");
  });

  test("open-participates an OR gate that PoW alone satisfies, without joining", async () => {
    // The dankmeme shape: or(altcha_pow, unique_human). A browser check
    // clears it, so the API takes the write and follows the actor.
    const solves: string[] = [];
    const allowedContexts: Array<{ altchaPayload?: string | null } | undefined> = [];
    const runner = renderRunner({
      gateData: gate(
        "verification_required",
        undefined,
        [altchaRequirement, uniqueHumanRequirement],
        { gateMatchMode: "any", viewerFollowing: false },
      ),
      loadCommunityGate: async () => gate(
        "verification_required",
        undefined,
        [altchaRequirement, uniqueHumanRequirement],
        { gateMatchMode: "any", viewerFollowing: true },
      ),
      sessionUser: unverifiedUser,
      solveActionAltcha: async (input) => {
        solves.push(input.action);
        return "solved-payload";
      },
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        gateData: gate(
          "verification_required",
          undefined,
          [altchaRequirement, uniqueHumanRequirement],
          { gateMatchMode: "any", viewerFollowing: false },
        ),
        onAllowed: (context) => {
          allowedContexts.push(context);
        },
        postId: "post-1",
        voteValue: 1,
      });
      expect(result).toBe("allowed");
    });

    expect(solves).toEqual(["post:post-1:1"]);
    expect(allowedContexts).toEqual([{ altchaPayload: "solved-payload" }]);
    expect(runner.successes).toEqual(["Following Test Community"]);
    expect(runner.hook.result.current.modalState).toBe(null);
  });

  test("open-participates instead of joining when another OR branch is already satisfied", async () => {
    const solves: string[] = [];
    const allowedContexts: Array<{ altchaPayload?: string | null } | undefined> = [];
    const initialGate = gate(
      "joinable",
      undefined,
      [altchaRequirement, veryRequirement],
      { gateMatchMode: "any", viewerFollowing: false },
    );
    const runner = renderRunner({
      gateData: initialGate,
      loadCommunityGate: async () => gate(
        "joinable",
        undefined,
        [altchaRequirement, veryRequirement],
        { gateMatchMode: "any", viewerFollowing: true },
      ),
      sessionUser: verifiedVeryUser,
      solveActionAltcha: async (input) => {
        solves.push(input.action);
        return "solved-payload";
      },
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        gateData: initialGate,
        onAllowed: (context) => {
          allowedContexts.push(context);
        },
        postId: "post-1",
        voteValue: 1,
      });
      expect(result).toBe("allowed");
    });

    expect(solves).toEqual(["post:post-1:1"]);
    expect(allowedContexts).toEqual([{ altchaPayload: "solved-payload" }]);
    expect(runner.successes).toEqual(["Following Test Community"]);
    expect(runner.calls).not.toContain("open:community-1");
    expect(runner.hook.result.current.modalState).toBe(null);
  });

  test("falls back to the action-bound browser check for a joinable mixed OR gate", async () => {
    const runner = renderRunner({
      gateData: gate(
        "joinable",
        undefined,
        [altchaRequirement, veryRequirement],
        { gateMatchMode: "any" },
      ),
      sessionUser: verifiedVeryUser,
      solveActionAltcha: async () => {
        throw new Error("challenge rate limited");
      },
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

    expect(runner.pendingInteraction?.altchaAction).toBe("post:post-1:1");
    expect(runner.pendingInteraction?.altchaScope).toBe("vote");
    expect(runner.hook.result.current.modalState?.title).toBe("Quick browser check");
    expect(runner.hook.result.current.modalState?.body).toBe("altcha:post:post-1:1:vote");
    expect(runner.hook.result.current.modalState?.requirements).toEqual([]);
  });

  test("does not add a PoW step to public replies when a joinable identity branch is satisfied", async () => {
    const solves: string[] = [];
    const runner = renderRunner({
      gateData: gate(
        "joinable",
        undefined,
        [altchaRequirement, veryRequirement],
        { gateMatchMode: "any" },
      ),
      sessionUser: verifiedVeryUser,
      solveActionAltcha: async (input) => {
        solves.push(input.action);
        return "solved-payload";
      },
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
      });
      expect(result).toBe("allowed");
    });

    expect(solves).toEqual([]);
    expect(runner.hook.result.current.modalState).toBe(null);
  });

  test("does not open-participate when identity is required alongside PoW", async () => {
    const solves: string[] = [];
    const runner = renderRunner({
      gateData: gate(
        "verification_required",
        undefined,
        [altchaRequirement, uniqueHumanRequirement],
        { gateMatchMode: "all" },
      ),
      sessionUser: unverifiedUser,
      solveActionAltcha: async (input) => {
        solves.push(input.action);
        return "solved-payload";
      },
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

    expect(solves).toEqual([]);
    expect(runner.successes).toEqual([]);
    expect(runner.hook.result.current.modalState).not.toBe(null);
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
    expect(runner.hook.result.current.modalState?.title).toBe("Quick browser check");
    expect(runner.hook.result.current.modalState?.body).toBe("altcha:post:post-1:1:vote");
    expect(runner.hook.result.current.modalState?.description).toBe(gatesPanel.powOnlyDescription);
    expect(runner.hook.result.current.modalState?.primaryAction).toBeNull();
    expect(runner.hook.result.current.modalState?.secondaryAction).toBeUndefined();

    await act(async () => {
      await runner.altchaCompletions.get("post:post-1:1:vote")?.();
    });
    expect(runner.calls).toEqual(["load:community-1", "complete-action"]);
  });

  test("binds verification-required PoW-only post votes to an action proof instead of joining", async () => {
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
    expect(runner.pendingInteraction?.altchaScope).toBe("vote");
    expect(runner.hook.result.current.modalState?.body).toBe("altcha:post:post-1:1:vote");
  });

  test("binds cleared post votes to the clear action proof", async () => {
    const runner = renderRunner({
      gateData: gate("already_joined", {}, [altchaRequirement]),
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
        voteValue: "clear",
      });
      expect(result).toBe("blocked");
    });

    expect(runner.pendingInteraction?.altchaScope).toBe("vote");
    expect(runner.hook.result.current.modalState?.body).toBe("altcha:post:post-1:clear:vote");
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

  test("binds cleared comment votes to the clear action proof", async () => {
    const runner = renderRunner({
      gateData: gate("already_joined", {}, [altchaRequirement]),
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "vote_comment",
        commentId: "cmt-1",
        communityId: "community-1",
        onAllowed: () => undefined,
        voteValue: "clear",
      });
      expect(result).toBe("blocked");
    });

    expect(runner.pendingInteraction?.altchaScope).toBe("vote");
    expect(runner.hook.result.current.modalState?.body).toBe("altcha:comment:cmt-1:clear:vote");
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

  test("requires fresh PoW from a member when an AND gate also contains identity", async () => {
    const runner = renderRunner({
      gateData: gate(
        "already_joined",
        {},
        [veryRequirement, altchaRequirement],
        { gateMatchMode: "all" },
      ),
      sessionUser: verifiedVeryUser,
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
    expect(runner.hook.result.current.modalState?.title).toBe("Quick browser check");
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
    expect(runner.hook.result.current.modalState?.title).toBe("Quick browser check");
    expect(runner.hook.result.current.modalState?.body).toBe("altcha:post:post-1:1:vote");
    expect(runner.hook.result.current.modalState?.description).toContain("verified identity or wallet can skip this check");
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
    expect(runner.hook.result.current.modalState?.title).toBe("Quick browser check");

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

  test("retries a solved proof after a concurrent refreshed-session action fails", async () => {
    const refreshDeferred = createDeferred<Pick<User, "verification_capabilities"> | null>();
    const firstAttempt = createDeferred<void>();
    const contexts: Array<import("@/hooks/use-community-interaction-gate.helpers").InteractionAllowedContext | undefined> = [];
    const runner = renderRunner({
      gateData: gate("already_joined", {}, [veryRequirement, altchaRequirement]),
      refreshSessionUser: () => refreshDeferred.promise,
      sessionUser: unverifiedUser,
    });

    await act(async () => {
      await runner.hook.result.current.run({
        action: "vote_post",
        communityId: "community-1",
        onAllowed: async (context) => {
          contexts.push(context);
          if (contexts.length === 1) await firstAttempt.promise;
        },
        postId: "post-1",
        voteValue: 1,
      });
    });

    refreshDeferred.resolve(verifiedVeryUser);
    await act(async () => {
      await refreshDeferred.promise;
      await Promise.resolve();
    });
    const proofAttempt = runner.pendingInteraction?.onAllowed({ altchaPayload: "proof" });
    firstAttempt.reject(new Error("transient failure"));
    await act(async () => {
      await proofAttempt;
    });

    expect(contexts).toEqual([undefined, { altchaPayload: "proof" }]);
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
    expect(runner.hook.result.current.modalState?.title).toBe("Quick browser check");
    expect(runner.hook.result.current.modalState?.body).toBe("altcha:post:post-1:1:vote");
    expect(runner.hook.result.current.modalState?.description).toContain("verified identity or wallet can skip this check");
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
    expect(runner.hook.result.current.modalState?.title).toBe("Quick browser check");
    expect(runner.hook.result.current.modalState?.body).toBe("altcha:post:post-1:comment_create");
    expect(runner.hook.result.current.modalState?.primaryAction).toBeNull();
    expect(runner.hook.result.current.modalState?.secondaryAction).toBeUndefined();
  });

  test("routes verification-required PoW-only public replies through an action proof", async () => {
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
    expect(runner.hook.result.current.modalState?.title).toBe("Quick browser check");
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
        requireMembership: true,
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

  test("allows replies on public threads without joining", async () => {
    const runner = renderRunner({
      gateData: gate("joinable"),
    });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => {
          runner.calls.push("allowed");
        },
        postId: "post-1",
      });
      expect(result).toBe("allowed");
    });

    expect(runner.pendingInteraction).toBeNull();
    expect(runner.hook.result.current.modalState).toBeNull();
    expect(runner.calls).toEqual(["load:community-1", "allowed"]);
  });

  test("allows replies while a community membership request is pending", async () => {
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
      expect(result).toBe("allowed");
    });

    expect(runner.pendingInteraction).toBeNull();
    expect(runner.hook.result.current.modalState).toBeNull();
  });

  test("keeps votes membership-gated", async () => {
    const runner = renderRunner({ gateData: gate("joinable") });

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

    expect(runner.hook.result.current.modalState?.icon).toBe("join");
  });

  test("forces the join flow when the API identifies a members-only thread", async () => {
    const runner = renderRunner({ gateData: gate("joinable") });

    await act(async () => {
      const result = await runner.hook.result.current.run({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
        requireMembership: true,
      });
      expect(result).toBe("blocked");
    });

    expect(runner.hook.result.current.modalState?.icon).toBe("join");
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
        requireMembership: true,
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
        requireMembership: true,
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
        requireMembership: true,
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
