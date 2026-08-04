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
const toastErrors: string[] = [];
const selfStarts: unknown[] = [];
const veryStarts: unknown[] = [];
const zkPassportStarts: unknown[] = [];
let connectCalls = 0;
let connectedWallets: Array<{ address: string }> = [];
let walletsReady = true;
let privyConfigured = true;
let passportRefreshResult: Record<string, unknown> | null = null;
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
    refreshPassportWalletScore: async () => passportRefreshResult ?? ({
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
    error: (message: string) => {
      toastErrors.push(message);
    },
  },
}));

mock.module("@/lib/verification/use-very-verification", () => ({
  useVeryVerification: () => ({
    startVerification: async (options?: unknown) => {
      veryStarts.push(options);
      return { started: true };
    },
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
    startVerification: async (options?: unknown) => {
      selfStarts.push(options);
      return { started: true };
    },
  }),
}));

mock.module("@/lib/verification/use-zkpassport-verification", () => ({
  useZkPassportVerification: () => ({
    startVerification: async (options?: unknown) => {
      zkPassportStarts.push(options);
      return { started: true };
    },
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
  toastErrors.length = 0;
  selfStarts.length = 0;
  veryStarts.length = 0;
  zkPassportStarts.length = 0;
  connectCalls = 0;
  connectedWallets = [];
  walletsReady = true;
  passportRefreshResult = null;
  privyConfigured = true;
  privyConnect = () => {
    connectCalls += 1;
  };
});

describe("useCommunityJoinVerification", () => {
  test("binds the proof-of-work action to the canonical community id from eligibility", async () => {
    const { result } = renderHook(() =>
      useCommunityJoinVerification({
        communityId: "dankmeme",
        eligibility: {
          ...eligibility("verification_required"),
          community: "com_cmt_canonical",
        } as JoinEligibility,
        locale: "en",
        refetchEligibility: async () => eligibility("verification_required"),
      })
    );

    expect(result.current.altchaAction).toBe("community:com_cmt_canonical");
  });

  test("falls back to the route segment for the proof-of-work action before eligibility loads", async () => {
    const { result } = renderHook(() =>
      useCommunityJoinVerification({
        communityId: "dankmeme",
        eligibility: null,
        locale: "en",
        refetchEligibility: async () => eligibility("verification_required"),
      })
    );

    expect(result.current.altchaAction).toBe("community:dankmeme");
  });

  test("shows the current and required wallet score when the refresh does not qualify", async () => {
    const belowThreshold = {
      ...eligibility("verification_required"),
      wallet_score_status: {
        current_score_decimal: "7.5",
        last_scored_at: null,
        passing_score: false,
        required_score_decimal: "30",
      },
    } as JoinEligibility;
    passportRefreshResult = { join_eligibility: belowThreshold };
    const { result } = renderHook(() =>
      useCommunityJoinVerification({
        communityId: "com_or",
        eligibility: eligibility("verification_required"),
        locale: "en",
        refetchEligibility: async () => eligibility("verification_required"),
      })
    );

    await act(async () => {
      expect(await result.current.startGateVerification({
        gate_type: "wallet_score",
        minimum_score: 30,
      })).toBe("blocked");
    });

    expect(result.current.joinError).toContain("7.5");
    expect(result.current.joinError).toContain("30");
    expect(toastErrors.some((message) => message.includes("7.5") && message.includes("30"))).toBe(true);
  });

  test("returns the proof-of-work branch without launching another provider", async () => {
    const { result } = renderHook(() =>
      useCommunityJoinVerification({
        communityId: "com_or",
        eligibility: eligibility("verification_required"),
        locale: "en",
        refetchEligibility: async () => eligibility("verification_required"),
      })
    );

    await act(async () => {
      expect(await result.current.startGateVerification({ gate_type: "altcha_pow" })).toBe("altcha");
    });

    expect(selfStarts).toEqual([]);
    expect(veryStarts).toEqual([]);
    expect(zkPassportStarts).toEqual([]);
  });

  test("does not fall back to Self when no verification provider is supported", async () => {
    const unsupportedEligibility = {
      ...eligibility("verification_required"),
      missing_capabilities: ["unique_human"],
      membership_gate_summaries: [{ gate_type: "unique_human", accepted_providers: [] }],
    } as JoinEligibility;
    const { result } = renderHook(() =>
      useCommunityJoinVerification({
        communityId: "com_unsupported",
        eligibility: unsupportedEligibility,
        locale: "en",
        refetchEligibility: async () => unsupportedEligibility,
      })
    );

    await act(async () => {
      expect(await result.current.handleJoin()).toBe("blocked");
    });

    expect(selfStarts).toEqual([]);
    expect(veryStarts).toEqual([]);
    expect(zkPassportStarts).toEqual([]);
    expect(result.current.joinError).toContain("No supported verification provider");
  });

  test("launches the selected palm branch independently", async () => {
    const { result } = renderHook(() =>
      useCommunityJoinVerification({
        communityId: "com_or",
        eligibility: eligibility("verification_required"),
        locale: "en",
        refetchEligibility: async () => eligibility("verification_required"),
      })
    );

    await act(async () => {
      expect(await result.current.startGateVerification({
        accepted_providers: ["very"],
        gate_type: "unique_human",
      })).toBe("started");
    });

    expect(veryStarts).toHaveLength(1);
    expect(selfStarts).toEqual([]);
  });

  test("preserves the Telegram Self to ZKPassport substitution for a selected document branch", async () => {
    (window as Window & { Telegram?: { WebApp: object } }).Telegram = { WebApp: {} };
    const { result } = renderHook(() =>
      useCommunityJoinVerification({
        communityId: "com_or",
        eligibility: eligibility("verification_required"),
        locale: "en",
        refetchEligibility: async () => eligibility("verification_required"),
      })
    );

    await act(async () => {
      await result.current.startGateVerification({
        accepted_providers: ["self", "zkpassport"],
        gate_type: "nationality",
        required_values: ["GE"],
      });
    });
    delete (window as Window & { Telegram?: { WebApp: object } }).Telegram;

    expect(zkPassportStarts).toHaveLength(1);
    expect(selfStarts).toEqual([]);
  });

  test("connects a wallet when that OR branch is selected", async () => {
    const { result } = renderHook(() =>
      useCommunityJoinVerification({
        communityId: "com_or",
        eligibility: walletEligibility(),
        locale: "en",
        refetchEligibility: async () => walletEligibility(),
      })
    );

    await act(async () => {
      await result.current.startGateVerification({
        contract_address: "0x1111111111111111111111111111111111111111",
        gate_type: "erc721_holding",
      });
    });

    expect(connectCalls).toBe(1);
  });

  test("connects a wallet when a balance branch is selected", async () => {
    const { result } = renderHook(() =>
      useCommunityJoinVerification({
        communityId: "com_or",
        eligibility: walletEligibility(),
        locale: "en",
        refetchEligibility: async () => walletEligibility(),
      })
    );

    await act(async () => {
      await result.current.startGateVerification({
        asset_decimals: 18,
        asset_id: "eip155:1/slip44:60",
        asset_symbol: "ETH",
        gate_type: "asset_balance",
        min_amount_atomic: "500000000000000000",
      });
    });

    expect(connectCalls).toBe(1);
    expect(selfStarts).toEqual([]);
  });

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
    expect(result.current.joinError).toBe("Connect a wallet that meets this community's requirement from wallet settings, then try again.");
  });

  test("reports when the connected wallet still does not satisfy the NFT gate", async () => {
    const refetched: string[] = [];
    const { result, rerender } = renderHook(() =>
      useCommunityJoinVerification({
        communityId: "com_nft",
        eligibility: walletEligibility(),
        locale: "en",
        refetchEligibility: async () => {
          refetched.push("eligibility");
          return walletEligibility();
        },
      })
    );

    await act(async () => {
      const joinResult = await result.current.handleJoin();
      expect(joinResult).toBe("blocked");
    });

    connectedWallets = [{ address: "0xabc0000000000000000000000000000000000000" }];
    rerender();

    await waitFor(() => {
      expect(refetched).toEqual(["eligibility"]);
      expect(result.current.joinError).toBe("That wallet still does not meet this community's wallet requirement. Connect another wallet, then try again.");
      expect(toastErrors).toEqual(["That wallet still does not meet this community's wallet requirement. Connect another wallet, then try again."]);
    });
  });
});
