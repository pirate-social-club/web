import { beforeEach, describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";

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
const fakeSession = {
  accessToken: "token",
  user: { id: "usr_smoke" },
  profile: null,
  onboarding: null,
  walletAttachments: [],
  storedAt: "2026-05-16T00:00:00.000Z",
};

const fakeApi = {
  communities: {
    getJoinEligibility: async (communityId: string) => {
      apiCalls.push(`eligibility:${communityId}`);
      return eligibility("joinable", {}, [uniqueHumanRequirement]);
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
        membership_gate_summaries: [uniqueHumanRequirement],
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

    expect(actionResult).toBe("blocked");
    expect(apiCalls).toEqual([
      "preview:community-1:en",
      "eligibility:community-1",
    ]);
    expect(result.current.gateModal).not.toBeNull();
    expect(connectCalls).toBe(0);
  });
});
