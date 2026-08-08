import { beforeEach, describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import type * as React from "react";
import type { MembershipGateSummary } from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";
import {
  createPreview,
  eligibility,
  uniqueHumanRequirement,
} from "./community-interaction-gate/test-fixtures.test";

installDomGlobals();

const { mock } = await import("bun:test") as unknown as {
  mock: {
    module: (specifier: string, factory: () => unknown) => void;
  };
};

const apiCalls: string[] = [];
let connectCalls = 0;
let reconnectEthereumWalletCalls = 0;
let nextEligibility = eligibility("joinable", {}, [uniqueHumanRequirement]);
let nextPreviewRequirements: MembershipGateSummary[] = [uniqueHumanRequirement];
const fakeSession = {
  accessToken: "token",
  user: { id: "usr_smoke" },
  profile: null,
  onboarding: null,
  walletAttachments: [],
  storedAt: "2026-05-16T00:00:00.000Z",
};

const nftRequirement: MembershipGateSummary = {
  chain_namespace: "eip155:1",
  contract_address: "0x1111111111111111111111111111111111111111",
  gate_type: "erc721_holding",
};

const fakeApi = {
  communities: {
    getJoinEligibility: async (communityId: string) => {
      apiCalls.push(`eligibility:${communityId}`);
      return nextEligibility;
    },
    join: async (communityId: string) => {
      apiCalls.push(`join:${communityId}`);
      return { community: communityId, status: "joined" };
    },
    preview: async (communityId: string, options: { locale: string }) => {
      apiCalls.push(`preview:${communityId}:${options.locale}`);
      return createPreview({
        id: communityId,
        display_name: "Smoke Community",
        membership_gate_summaries: nextPreviewRequirements,
      });
    },
  },
  verification: {
    refreshPassportWalletScore: async () => ({
      join_eligibility: eligibility("already_joined"),
    }),
  },
};

mock.module("@/lib/api", () => ({
  useApi: () => fakeApi,
}));

mock.module("@/lib/api/session-store", () => ({
  getStoredSession: () => fakeSession,
  revalidateSession: async (getUsersMe: () => Promise<unknown>) => {
    await getUsersMe();
    return true;
  },
  updateSessionUser: () => undefined,
  useSession: () => fakeSession,
}));

mock.module("@/components/auth/privy-provider", () => ({
  usePiratePrivyRuntime: () => ({
    connect: () => {
      connectCalls += 1;
    },
    reconnectEthereumWallet: () => {
      reconnectEthereumWalletCalls += 1;
    },
  }),
}));

mock.module("@/lib/verification/use-very-verification", () => ({
  useVeryVerification: () => ({
    startVerification: async () => ({ started: false }),
    verificationError: null,
    verificationLoading: false,
  }),
}));

mock.module("@/lib/verification/use-self-verification", () => ({
  useSelfVerification: () => ({
    handleModalOpenChange: () => undefined,
    handleSelfQrError: () => undefined,
    handleSelfQrSuccess: () => undefined,
    selfError: null,
    selfLoading: false,
    selfModalOpen: false,
    selfPrompt: null,
    startVerification: async () => ({ started: false }),
  }),
}));

const { clearCommunityGateDataCache } = await import("./community-interaction-gate/use-community-gate-data");
const {
  useCommunityInteractionGate,
  verificationIntentForInteraction,
} = await import("./use-community-interaction-gate");

beforeEach(() => {
  apiCalls.length = 0;
  connectCalls = 0;
  reconnectEthereumWalletCalls = 0;
  nextEligibility = eligibility("joinable", {}, [uniqueHumanRequirement]);
  nextPreviewRequirements = [uniqueHumanRequirement];
  clearCommunityGateDataCache();
});

describe("useCommunityInteractionGate", () => {
  test("resolves contribution verification intents from the pending interaction", () => {
    const base = {
      communityId: "community-1",
      gate: {
        eligibility: eligibility("verification_required", {
          suggested_verification_intent: "post_create",
        }, [uniqueHumanRequirement]),
        preview: createPreview({
          id: "community-1",
          display_name: "Smoke Community",
          membership_gate_summaries: [uniqueHumanRequirement],
        }),
      },
      onAllowed: () => undefined,
    } as const;

    expect(verificationIntentForInteraction(null)).toBe("community_join");
    expect(verificationIntentForInteraction({
      ...base,
      action: "reply_post",
      postId: "post-1",
    })).toBe("comment_create");
    expect(verificationIntentForInteraction({
      ...base,
      action: "reply_comment",
      commentId: "comment-1",
    })).toBe("comment_create");
    expect(verificationIntentForInteraction({
      ...base,
      action: "vote_post",
      postId: "post-1",
      voteValue: 1,
    })).toBe("post_create");
  });

  test("wires auth, gate loading, and default modal creation", async () => {
    nextEligibility = eligibility("verification_required", {
      suggested_verification_provider: "self",
    }, [uniqueHumanRequirement]);
    const { result } = renderHook(() =>
      useCommunityInteractionGate({
        previewLocale: "en",
        routeKind: "post",
        uiLocale: "en",
      })
    );

    let actionResult: "allowed" | "blocked" | null = null;
    await act(async () => {
      actionResult = await result.current.runGatedCommunityAction({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => {
          apiCalls.push("allowed");
        },
        postId: "post-1",
        requireMembership: true,
      });
    });

    expect(actionResult).toBe("blocked");
    expect(apiCalls).toEqual([
      "preview:community-1:en",
      "eligibility:community-1",
    ]);
    expect(result.current.gateModal).not.toBeNull();
    expect(connectCalls).toBe(0);
  });

  test("lets the API authorize public-thread replies without forcing the membership gate", async () => {
    nextEligibility = eligibility("verification_required", {
      suggested_verification_provider: "altcha",
    }, [uniqueHumanRequirement]);
    const { result } = renderHook(() =>
      useCommunityInteractionGate({
        previewLocale: "en",
        routeKind: "post",
        uiLocale: "en",
      })
    );

    let actionResult: "allowed" | "blocked" | null = null;
    await act(async () => {
      actionResult = await result.current.runGatedCommunityAction({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => {
          apiCalls.push("allowed");
        },
        postId: "post-1",
      });
    });

    expect(actionResult).toBe("allowed");
    expect(apiCalls).toEqual([
      "preview:community-1:en",
      "eligibility:community-1",
      "allowed",
    ]);
    expect(result.current.gateModal).toBeNull();
  });

  test("uses wallet reconnect for failed NFT gates", async () => {
    nextPreviewRequirements = [nftRequirement];
    nextEligibility = eligibility("gate_failed", {
      failure_reason: "erc721_holding_required",
    }, [nftRequirement]);

    const { result } = renderHook(() =>
      useCommunityInteractionGate({
        previewLocale: "en",
        routeKind: "post",
        uiLocale: "en",
      })
    );

    await act(async () => {
      await result.current.runGatedCommunityAction({
        action: "reply_post",
        communityId: "community-1",
        onAllowed: () => undefined,
        postId: "post-1",
        requireMembership: true,
      });
    });

    const fragment = result.current.gateModal as React.ReactElement<{
      children: React.ReactElement<{
        primaryAction?: { label: string; onClick?: () => Promise<void> | void };
      }>;
    }>;
    const modal = Array.isArray(fragment.props.children)
      ? fragment.props.children[0]
      : fragment.props.children;
    expect(modal.props.primaryAction?.label).toBe("Connect wallet");

    await act(async () => {
      await modal.props.primaryAction?.onClick?.();
    });

    expect(reconnectEthereumWalletCalls).toBe(1);
    expect(connectCalls).toBe(0);
  });
});
