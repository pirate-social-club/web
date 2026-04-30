import * as BunTest from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { installDomGlobals } from "@/test/setup-dom";
import { api } from "@/lib/api";

const { describe, expect, test } = BunTest;
const { afterEach, beforeEach, mock: bunMock } = BunTest as unknown as {
  afterEach: (callback: () => void) => void;
  beforeEach: (callback: () => void) => void;
  mock: {
    <T extends (...args: any[]) => unknown>(implementation: T): T & {
      mock: { calls: unknown[][] };
      mockClear: () => void;
    };
    module: (specifier: string, factory: () => unknown) => void;
    restore: () => void;
  };
};

installDomGlobals();

const WIP_TOKEN_ADDRESS = "0x1514000000000000000000000000000000000000";
const walletAddress = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const batchClaimAllRevenue = bunMock(async () => ({
  txHashes: ["0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
}));
const newClient = bunMock(() => ({
  royalty: {
    batchClaimAllRevenue,
  },
}));
const switchChain = bunMock(async () => undefined);
const getEthereumProvider = bunMock(async () => ({}));
const listClaimable = bunMock(async () => ({
  checked_at: Date.parse("2026-04-26T00:00:00Z"),
  total_claimable_wip_wei: "12450000000000000000",
  items: [
    {
      asset: "ast_one",
      claimable_wip_wei: "10000000000000000000",
      community: "cmt_one",
      ip: "0x1111111111111111111111111111111111111111",
      title: "Paid anthem",
    },
    {
      asset: "ast_two",
      claimable_wip_wei: "2450000000000000000",
      community: "cmt_two",
      ip: "0x2222222222222222222222222222222222222222",
      title: "Basement session",
    },
  ],
}));
const recordClaim = bunMock(async () => ({
  id: "rcl_test",
  object: "royalty_claim_record" as const,
  user: "usr_test",
  tx_hash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  wallet_address: walletAddress,
  chain: 1315,
  claimable_wip_wei_at_submission: "12450000000000000000",
  ip_ids: [
    "0x1111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222",
  ],
  auto_unwrap_ip_tokens: false,
  status: "pending" as const,
  verified_at: null,
  verification_error: null,
  claimed_at: Date.parse("2026-04-26T00:00:00Z"),
  created: Date.parse("2026-04-26T00:00:00Z"),
}));

bunMock.module("@story-protocol/core-sdk", () => ({
  StoryClient: { newClient },
  WIP_TOKEN_ADDRESS,
}));

bunMock.module("@/components/auth/privy-provider", () => ({
  usePiratePrivyWallets: () => ({
    connectedWallets: [{
      address: walletAddress,
      getEthereumProvider,
      switchChain,
    }],
  }),
}));

bunMock.module("@/lib/network-config", () => ({
  getPirateNetworkConfig: () => ({
    story: {
      chainId: 1315,
      label: "Story Aeneid",
      network: "story-aeneid",
      rpcUrl: "https://story-aeneid.test",
    },
    base: {
      chainId: 84532,
      explorerUrl: "https://sepolia.basescan.org",
      label: "Base Sepolia",
      network: "base-sepolia",
      rpcUrl: "https://base-sepolia.test",
    },
  }),
}));

describe("useStoryRoyalties", () => {
  afterEach(() => {
    bunMock.restore();
  });

  beforeEach(() => {
    api.royalties.listClaimable = listClaimable as typeof api.royalties.listClaimable;
    api.royalties.recordClaim = recordClaim as typeof api.royalties.recordClaim;
    batchClaimAllRevenue.mockClear();
    getEthereumProvider.mockClear();
    listClaimable.mockClear();
    newClient.mockClear();
    recordClaim.mockClear();
    switchChain.mockClear();
  });

  test("claims all available WIP royalties and records the on-chain claim transaction", async () => {
    const { useStoryRoyalties } = await import("./use-story-royalties");
    const { result } = renderHook(() => useStoryRoyalties());

    await act(async () => {
      await result.current.claimRoyalties({ autoUnwrapIpTokens: false });
    });

    await waitFor(() => {
      expect(result.current.claimState.status).toBe("success");
    });

    expect(switchChain.mock.calls).toEqual([[1315]]);
    const newClientArg = newClient.mock.calls[0]?.[0] as { account?: string; chainId?: string } | undefined;
    expect(newClientArg?.account).toBe(walletAddress);
    expect(newClientArg?.chainId).toBe("aeneid");
    expect(batchClaimAllRevenue.mock.calls).toEqual([[
      {
      ancestorIps: [
        {
          ipId: "0x1111111111111111111111111111111111111111",
          claimer: "0x1111111111111111111111111111111111111111",
          currencyTokens: [WIP_TOKEN_ADDRESS],
          childIpIds: [],
          royaltyPolicies: [],
        },
        {
          ipId: "0x2222222222222222222222222222222222222222",
          claimer: "0x2222222222222222222222222222222222222222",
          currencyTokens: [WIP_TOKEN_ADDRESS],
          childIpIds: [],
          royaltyPolicies: [],
        },
      ],
      claimOptions: {
        autoTransferAllClaimedTokensFromIp: true,
        autoUnwrapIpTokens: false,
      },
    },
    ]]);
    expect(recordClaim.mock.calls).toEqual([[
      {
      tx_hash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      wallet_address: walletAddress,
      chain: 1315,
      claimable_wip_wei_at_submission: "12450000000000000000",
      ip_ids: [
        "0x1111111111111111111111111111111111111111",
        "0x2222222222222222222222222222222222222222",
      ],
      auto_unwrap_ip_tokens: false,
    },
    ]]);
  });
});
