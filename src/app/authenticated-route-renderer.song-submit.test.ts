import { describe, expect, test } from "bun:test";

import {
  buildSongListingRequest,
  buildSongPostRequest,
} from "@/app/authenticated-route-renderer";

describe("song submit payload helpers", () => {
  test("builds a free original song post without a listing", () => {
    const postRequest = buildSongPostRequest({
      bundleId: "sab_free",
      derivativeStep: undefined,
      idempotencyKey: "key-free",
      paidSongPriceUsd: null,
      songMode: "original",
      title: "  Free song  ",
    });
    const listingRequest = buildSongListingRequest({
      assetId: "ast_free",
      paidSongPriceUsd: null,
      pricingPolicyRegionalPricingEnabled: true,
      regionalPricingEnabled: true,
    });

    expect(postRequest).toEqual({
      access_mode: "public",
      identity_mode: "public",
      idempotency_key: "key-free",
      post_type: "song",
      rights_basis: "original",
      song_artifact_bundle_id: "sab_free",
      song_mode: "original",
      title: "Free song",
      translation_policy: "machine_allowed",
      upstream_asset_refs: undefined,
    });
    expect(listingRequest).toBeNull();
  });

  test("builds a paid original song post and regional-pricing listing", () => {
    const postRequest = buildSongPostRequest({
      bundleId: "sab_paid",
      derivativeStep: undefined,
      idempotencyKey: "key-paid",
      paidSongPriceUsd: 4.99,
      songMode: "original",
      title: "Paid song",
    });
    const listingRequest = buildSongListingRequest({
      assetId: "ast_paid",
      paidSongPriceUsd: 4.99,
      pricingPolicyRegionalPricingEnabled: true,
      regionalPricingEnabled: true,
    });

    expect(postRequest.access_mode).toBe("locked");
    expect(postRequest.rights_basis).toBe("original");
    expect(postRequest.song_mode).toBe("original");
    expect(postRequest.upstream_asset_refs).toBe(undefined);
    expect(listingRequest).toEqual({
      asset_id: "ast_paid",
      price_usd: 4.99,
      regional_pricing_enabled: true,
      status: "active",
    });
  });

  test("builds a paid remix song post with derivative refs and no unsupported regional pricing", () => {
    const postRequest = buildSongPostRequest({
      bundleId: "sab_remix",
      derivativeStep: {
        references: [
          { id: "ast_upstream_1", title: "Midnight Waves" },
          { id: "ast_upstream_2", title: "Signal Drift" },
        ],
      },
      idempotencyKey: "key-remix",
      paidSongPriceUsd: 1,
      songMode: "remix",
      title: "Paid remix",
    });
    const listingRequest = buildSongListingRequest({
      assetId: "ast_remix",
      paidSongPriceUsd: 1,
      pricingPolicyRegionalPricingEnabled: false,
      regionalPricingEnabled: true,
    });

    expect(postRequest).toEqual({
      access_mode: "locked",
      identity_mode: "public",
      idempotency_key: "key-remix",
      post_type: "song",
      rights_basis: "derivative",
      song_artifact_bundle_id: "sab_remix",
      song_mode: "remix",
      title: "Paid remix",
      translation_policy: "machine_allowed",
      upstream_asset_refs: ["ast_upstream_1", "ast_upstream_2"],
    });
    expect(listingRequest).toEqual({
      asset_id: "ast_remix",
      price_usd: 1,
      regional_pricing_enabled: false,
      status: "active",
    });
  });
});
