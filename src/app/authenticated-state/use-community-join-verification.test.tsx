import { beforeEach, describe, expect, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { JoinEligibility } from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";

installDomGlobals();

const { mock } = await import("bun:test") as unknown as {
  mock: {
    module: (specifier: string, factory: () => unknown) => void;
  };
};

const apiCalls: string[] = [];
let connectCalls = 0;
let connectedWallets: Array<{ address: string }> = [];
let walletsReady = true;
let privyConfigured = true;
let privyConnect: (() => void) | null = () => {
  connectCalls += 1;
};

const fakeApi = {
  communities: {
    join: async (communityId: string) => {
      apiCalls.push(`join:${communityId}`);
      return { status: "joined" };
    },
  },
  verification: {
    refreshPassportWalletScore: async () => ({
      join_eligibility: eligibility("joinable"),
    }),
  },
};

mock.module("@/lib/api", () => ({
  useApi: () => fakeApi,
}));

mock.module("@/lib/analytics", () => ({
  trackAnalyticsEvent: () => undefined,
}));

mock.module("@/components/auth/privy-provider", () => ({
  usePiratePrivyRuntime: () => ({
    configured: privyConfigured,
    connect: privyConnect,
  }),
  usePiratePrivyWallets: () => ({
    connectedWallets,
    walletsReady,
  }),
}));

mock.module("@/components/primitives/sonner", () => ({
  toast: {
    error: () => undefined,
  },
}));

mock.module("@/lib/verification/use-very-verification", () => ({
  useVeryVerification: () => ({
    startVerification: async () => undefined,
    verificationError: null,
    verificationHref: null,
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

mock.module("@/lib/verification/use-zkpassport-verification", () => ({
  useZkPassportVerification: () => ({
    startVerification: async () => undefined,
    verificationError: null,
    verificationHref: null,
    verificationLoading: false,
  }),
}));

const { useCommunityJoinVerification } = await import("./use-community-join-verification");

function eligibility(status: JoinEligibility["status"]): JoinEligibility {
  return {
    gate_evaluation: null,
    membership_gate_summaries: [],
    status,
  } as JoinEligibility;
}

function walletEligibility(): JoinEligibility {
  return {
    gate_evaluation: {
      eligible: false,
      mode: "enforce",
      required_action_set: {
        kind: "set",
        mode: "all",
        items: [{
          capability: "erc721_holding",
          kind: "capability",
        }],
      },
    },
    membership_gate_summaries: [{
      contract_address: "0x1111111111111111111111111111111111111111",
      gate_type: "erc721_holding",
    }],
    status: "verification_required",
  } as JoinEligibility;
}

beforeEach(() => {
  apiCalls.length = 0;
  connectCalls = 0;
  connectedWallets = [];
  walletsReady = true;
  privyConfigured = true;
  privyConnect = () => {
    connectCalls += 1;
  };
});

describe("useCommunityJoinVerification", () => {
  test("connects a wallet for NFT-only requirements, then refetches and auto-joins when eligible", async () => {
    const refetched: string[] = [];
    const joined: string[] = [];
    const refetchEligibility = async () => {
      refetched.push("eligibility");
      return eligibility("joinable");
    };
    const { result, rerender } = renderHook(() =>
      useCommunityJoinVerification({
        communityId: "com_nft",
        eligibility: walletEligibility(),
        locale: "en",
        onJoined: () => {
          joined.push("joined");
        },
        refetchEligibility,
      })
    );

    await act(async () => {
      const joinResult = await result.current.handleJoin();
      expect(joinResult).toBe("blocked");
    });

    expect(connectCalls).toBe(1);
    expect(apiCalls).toEqual([]);

    connectedWallets = [{ address: "0xabc0000000000000000000000000000000000000" }];
    rerender();

    await waitFor(() => {
      expect(refetched).toEqual(["eligibility", "eligibility"]);
      expect(apiCalls).toEqual(["join:com_nft"]);
      expect(joined).toEqual(["joined"]);
    });
  });

  test("reports a blocked wallet gate when Privy connect is unavailable", async () => {
    privyConfigured = false;
    privyConnect = null;
    const { result } = renderHook(() =>
      useCommunityJoinVerification({
        communityId: "com_nft",
        eligibility: walletEligibility(),
        locale: "en",
        refetchEligibility: async () => eligibility("verification_required"),
      })
    );

    await act(async () => {
      const joinResult = await result.current.handleJoin();
      expect(joinResult).toBe("blocked");
    });

    expect(connectCalls).toBe(0);
    expect(result.current.joinError).toBe("Connect the wallet that holds the required NFT from wallet settings, then try again.");
  });
});
