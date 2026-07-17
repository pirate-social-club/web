import { describe, expect, test } from "bun:test";
import type {
  CommunityPurchaseQuote,
  CommunityPurchaseSettlement,
} from "@pirate/api-contracts";

import {
  resolveQuoteDiscountPercent,
  waitForPurchaseSettlement,
} from "@/app/authenticated-helpers/song-purchase";

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
          id: "quote-1",
          object: "community_purchase_quote",
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

describe("waitForPurchaseSettlement", () => {
  test("polls the same settlement until the coordinator reaches finality", async () => {
    const settlement = createCommunities().communities.settlePurchase("community-1", { quote: "quote-1" });
    let calls = 0;
    const waits: number[] = [];
    const result = await waitForPurchaseSettlement({
      settle: async () => {
        calls += 1;
        if (calls < 3) {
          return {
            object: "community_purchase_settlement_pending" as const,
            community: "com_community-1",
            quote: "pq_quote-1",
            purchase: "pur_purchase-1",
            coordinator_plan_ref: `0x${"11".repeat(32)}`,
            status: "settlement_pending" as const,
          };
        }
        return settlement;
      },
      wait: async (delayMs) => { waits.push(delayMs); },
    });
    expect(calls).toBe(3);
    expect(waits).toEqual([1_000, 2_000]);
    expect(result.settlement_tx_ref).toBe("0xabc");
  });

  test("keeps a still-pending purchase retryable instead of treating it as failed", async () => {
    await expect(waitForPurchaseSettlement({
      settle: async () => ({
        object: "community_purchase_settlement_pending" as const,
        community: "com_community-1",
        quote: "pq_quote-1",
        purchase: "pur_purchase-1",
        coordinator_plan_ref: `0x${"11".repeat(32)}`,
        status: "settlement_pending" as const,
      }),
      maxAttempts: 2,
      wait: async () => undefined,
    })).rejects.toThrow("still processing");
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
