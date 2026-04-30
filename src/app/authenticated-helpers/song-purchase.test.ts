import { describe, expect, test } from "bun:test";
import type {
  CommunityListing as ApiCommunityListing,
  CommunityPurchaseQuote,
  CommunityPurchaseSettlement,
} from "@pirate/api-contracts";

import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";

import { executeSongPurchase, resolveQuoteDiscountPercent } from "@/app/authenticated-helpers/song-purchase";

function createListing(): ApiCommunityListing {
  return {
    listing: "listing-1",
    community: "community-1",
    status: "active",
    listing_mode: "fixed_price",
    price_cents: 500,
      regional_pricing_enabled: false,
      created_by_user: "user-1",
      created: Date.parse("2026-01-01T00:00:00Z"),
  } as unknown as ApiCommunityListing;
}

function createWallet(address: `0x${string}`): PirateConnectedEvmWallet {
  return {
    address,
    getEthereumProvider: async () => ({}),
    switchChain: async () => undefined,
  };
}

function createCommunities(overrides: {
  quote?: Partial<CommunityPurchaseQuote>;
  settlement?: Partial<CommunityPurchaseSettlement>;
} = {}) {
  const calls = {
    createPurchaseQuote: [] as string[],
    failPurchase: [] as string[],
    settlePurchase: [] as string[],
  };

  return {
    calls,
    communities: {
      createPurchaseQuote: async (_communityId: string) => {
        calls.createPurchaseQuote.push(_communityId);
        return {
          quote: "quote-1",
          community: _communityId,
          listing: "listing-1",
          buyer_user_id: "user-1",
          base_price_cents: 500,
          final_price_cents: 500,
          settlement_mode: "delivery_only_story_settlement",
          allocation_snapshot: [],
          funding_mode: "routed",
          funding_asset: { asset_symbol: "USDC", chain_namespace: "eip155", chain: 84532, display_name: "USDC" },
          source_chain: { chain_namespace: "eip155", chain: 84532, display_name: "Base Sepolia" },
          route_provider: "pirate_checkout",
          route_policy_compliant: true,
          policy_origin: "explicit",
          destination_settlement_chain: { chain_namespace: "story", chain: 1315, display_name: "Story Aeneid" },
          destination_settlement_token: "IP",
          funding_destination_address: null,
          quote_ttl_seconds: 60,
          route_required: true,
          route_status_policy: "fail",
          route_hop_tolerance: 0,
          quoted_at: "2026-01-01T00:00:00Z",
          expires_at: "2026-01-01T00:01:00Z",
          ...overrides.quote,
        } as CommunityPurchaseQuote;
      },
      failPurchase: async (_communityId: string, body: { quote: string }) => {
        calls.failPurchase.push(body.quote);
        return {
          id: "failure-1",
          object: "community_purchase_settlement_failure" as const,
          quote: body.quote,
          community: _communityId,
          status: "failed" as const,
          failed_at: Date.parse("2026-01-01T00:00:00Z"),
          expires_at: Date.parse("2026-01-01T00:01:00Z"),
        };
      },
      settlePurchase: async (_communityId: string, body: { quote: string }) => {
        calls.settlePurchase.push(body.quote);
        return {
          purchase_id: "purchase-1",
          quote: body.quote,
          community: _communityId,
          listing: "listing-1",
          buyer_user_id: "user-1",
          settlement_wallet_attachment_id: "wallet-1",
          purchase_price_cents: 500,
          settlement_mode: "delivery_only_story_settlement",
          settlement_chain: { chain_namespace: "story", chain: 1315, display_name: "Story Aeneid" },
          settlement_chain_ref: "story",
          settlement_token: "IP",
          settlement_tx_ref: "0xabc",
          allocations: [],
          ...overrides.settlement,
        } as CommunityPurchaseSettlement;
      },
    },
  };
}

describe("executeSongPurchase", () => {
  test("requires a settlement wallet attachment before quoting", async () => {
    const { calls, communities } = createCommunities();
    const errors: string[] = [];

    await executeSongPurchase({
      communities,
      communityId: "community-1",
      connectedWallets: [createWallet("0x1111111111111111111111111111111111111111")],
      listing: createListing(),
      onError: (message) => errors.push(message),
      onSuccess: () => undefined,
      refreshSongCommerce: () => undefined,
      settlementWalletAttachmentId: null,
      successMessage: () => "Unlocked.",
      titleText: "Song",
    });

    expect(errors).toEqual(["Connect a primary wallet before buying this song."]);
    expect(calls.createPurchaseQuote).toHaveLength(0);
  });

  test("does not choose a non-primary wallet when primary is disconnected", async () => {
    const { calls, communities } = createCommunities();
    const errors: string[] = [];

    await executeSongPurchase({
      communities,
      communityId: "community-1",
      connectedWallets: [createWallet("0x1111111111111111111111111111111111111111")],
      listing: createListing(),
      onError: (message) => errors.push(message),
      onSuccess: () => undefined,
      primaryWalletAddress: "0x2222222222222222222222222222222222222222",
      refreshSongCommerce: () => undefined,
      settlementWalletAttachmentId: "wallet-1",
      successMessage: () => "Unlocked.",
      titleText: "Song",
    });

    expect(errors).toEqual(["Connect your primary wallet before buying this song."]);
    expect(calls.createPurchaseQuote).toHaveLength(0);
  });

  test("marks the quote failed when checkout fails before funding transaction submission", async () => {
    const { calls, communities } = createCommunities({
      quote: { source_chain: null },
    });
    const errors: string[] = [];

    await executeSongPurchase({
      communities,
      communityId: "community-1",
      connectedWallets: [createWallet("0x1111111111111111111111111111111111111111")],
      listing: createListing(),
      onError: (message) => errors.push(message),
      onSuccess: () => undefined,
      refreshSongCommerce: () => undefined,
      settlementWalletAttachmentId: "wallet-1",
      successMessage: () => "Unlocked.",
      titleText: "Song",
    });

    expect(calls.createPurchaseQuote).toEqual(["community-1"]);
    expect(calls.failPurchase).toEqual(["quote-1"]);
    expect(calls.settlePurchase).toHaveLength(0);
    expect(errors).toEqual(["This quote requires an unsupported checkout chain."]);
  });
});

describe("resolveQuoteDiscountPercent", () => {
  test("computes one-decimal discount percentage from quote prices", () => {
    expect(resolveQuoteDiscountPercent({ base_price_cents: 500, final_price_cents: 400 })).toBe(20);
    expect(resolveQuoteDiscountPercent({ base_price_cents: 399, final_price_cents: 299 })).toBe(25.1);
  });

  test("returns null when quote has no discount", () => {
    expect(resolveQuoteDiscountPercent({ base_price_cents: 500, final_price_cents: 500 })).toBeNull();
    expect(resolveQuoteDiscountPercent({ base_price_cents: 500, final_price_cents: 600 })).toBeNull();
    expect(resolveQuoteDiscountPercent({ base_price_cents: 0, final_price_cents: 0 })).toBeNull();
  });
});
