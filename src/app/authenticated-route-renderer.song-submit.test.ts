import { describe, expect, test } from "bun:test";

import {
  buildAssetListingRequest,
  resolveComposerSubmitState,
} from "@/app/authenticated-helpers/asset-submit";
import {
  buildSongPostRequest,
} from "@/app/authenticated-helpers/song-submit";

function captureErrorMessage(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

describe("song submit payload helpers", () => {
  test("builds a free original song post without a listing", () => {
    const postRequest = buildSongPostRequest({
      bundleId: "sab_free",
      derivativeStep: undefined,
      idempotencyKey: "key-free",
      license: { presetId: "non-commercial" },
      paidSongPriceUsd: null,
      songMode: "original",
      title: "  Free song  ",
      visibility: "public",
    });
    const listingRequest = buildAssetListingRequest({
      assetId: "ast_free",
      paidSongPriceUsd: null,
      pricingPolicyRegionalPricingEnabled: true,
      regionalPricingEnabled: true,
      charityContributionPct: 10,
      charityPartnerId: "don_charity_water",
    });

    expect(postRequest).toEqual({
      access_mode: "public",
      identity_mode: "public",
      idempotency_key: "key-free",
      license_preset: "non-commercial",
      commercial_rev_share_pct: undefined,
      post_type: "song",
      rights_basis: "original",
      song_artifact_bundle: "sab_free",
      song_mode: "original",
      title: "Free song",
      translation_policy: "machine_allowed",
      upstream_asset_refs: undefined,
      visibility: "public",
    });
    expect(listingRequest).toBeNull();
  });

  test("builds a paid original song post and regional-pricing listing", () => {
    const postRequest = buildSongPostRequest({
      bundleId: "sab_paid",
      derivativeStep: undefined,
      idempotencyKey: "key-paid",
      license: { presetId: "commercial-use" },
      paidSongPriceUsd: 4.99,
      songMode: "original",
      title: "Paid song",
      visibility: "members_only",
    });
    const listingRequest = buildAssetListingRequest({
      assetId: "ast_paid",
      paidSongPriceUsd: 4.99,
      pricingPolicyRegionalPricingEnabled: true,
      regionalPricingEnabled: true,
      charityContributionPct: 10,
      charityPartnerId: "don_charity_water",
    });

    expect(postRequest.access_mode).toBe("locked");
    expect(postRequest.license_preset).toBe("commercial-use");
    expect(postRequest.commercial_rev_share_pct).toBe(undefined);
    expect(postRequest.rights_basis).toBe("original");
    expect(postRequest.song_mode).toBe("original");
    expect(postRequest.upstream_asset_refs).toBe(undefined);
    expect(postRequest.visibility).toBe("members_only");
    expect(listingRequest).toEqual({
      asset: "ast_paid",
      price_cents: 499,
      regional_pricing_enabled: true,
      donation_partner: "don_charity_water",
      donation_share_bps: 1000,
      status: "active",
    });
  });

  test("builds a paid remix song post with derivative refs and no unsupported regional pricing", () => {
    const postRequest = buildSongPostRequest({
      bundleId: "sab_remix",
      derivativeStep: {
        sourceTermsAccepted: true,
        references: [
          { id: "ast_upstream_1", title: "Midnight Waves" },
          { id: "ast_upstream_2", title: "Signal Drift" },
        ],
      },
      idempotencyKey: "key-remix",
      license: undefined,
      paidSongPriceUsd: 1,
      songMode: "remix",
      title: "Paid remix",
      visibility: "public",
    });
    const listingRequest = buildAssetListingRequest({
      assetId: "ast_remix",
      paidSongPriceUsd: 1,
      pricingPolicyRegionalPricingEnabled: false,
      regionalPricingEnabled: true,
      charityContributionPct: 0,
      charityPartnerId: "don_charity_water",
    });

    expect(postRequest).toEqual({
      access_mode: "locked",
      identity_mode: "public",
      idempotency_key: "key-remix",
      license_preset: undefined,
      commercial_rev_share_pct: undefined,
      post_type: "song",
      rights_basis: "derivative",
      song_artifact_bundle: "sab_remix",
      song_mode: "remix",
      title: "Paid remix",
      translation_policy: "machine_allowed",
      upstream_asset_refs: ["ast_upstream_1", "ast_upstream_2"],
      visibility: "public",
    });
    expect(listingRequest).toEqual({
      asset: "ast_remix",
      price_cents: 100,
      regional_pricing_enabled: false,
      donation_partner: null,
      donation_share_bps: null,
      status: "active",
    });
  });

  test("builds original song license payloads", () => {
    const nonCommercialRequest = buildSongPostRequest({
      bundleId: "sab_nc",
      derivativeStep: undefined,
      idempotencyKey: "key-nc",
      license: { presetId: "non-commercial" },
      paidSongPriceUsd: null,
      songMode: "original",
      title: "NC",
      visibility: "public",
    });
    expect(nonCommercialRequest.license_preset).toBe("non-commercial");
    expect(nonCommercialRequest.commercial_rev_share_pct).toBe(undefined);

    const commercialUseRequest = buildSongPostRequest({
      bundleId: "sab_cu",
      derivativeStep: undefined,
      idempotencyKey: "key-cu",
      license: { presetId: "commercial-use" },
      paidSongPriceUsd: null,
      songMode: "original",
      title: "CU",
      visibility: "public",
    });
    expect(commercialUseRequest.license_preset).toBe("commercial-use");
    expect(commercialUseRequest.commercial_rev_share_pct).toBe(undefined);

    const commercialRemixRequest = buildSongPostRequest({
      bundleId: "sab_cr",
      derivativeStep: undefined,
      idempotencyKey: "key-cr",
      license: { presetId: "commercial-remix", commercialRevSharePct: 10 },
      paidSongPriceUsd: null,
      songMode: "original",
      title: "CR",
      visibility: "public",
    });
    expect(commercialRemixRequest.license_preset).toBe("commercial-remix");
    expect(commercialRemixRequest.commercial_rev_share_pct).toBe(10);
  });

  test("rejects invalid original song license payloads", () => {
    expect(captureErrorMessage(() => buildSongPostRequest({
      bundleId: "sab_missing",
      derivativeStep: undefined,
      idempotencyKey: "key-missing",
      license: undefined,
      paidSongPriceUsd: null,
      songMode: "original",
      title: "Missing",
      visibility: "public",
    }))).toBe("Choose license terms before publishing this song.");

    expect(captureErrorMessage(() => buildSongPostRequest({
      bundleId: "sab_missing_rev",
      derivativeStep: undefined,
      idempotencyKey: "key-missing-rev",
      license: { presetId: "commercial-remix" },
      paidSongPriceUsd: null,
      songMode: "original",
      title: "Missing rev",
      visibility: "public",
    }))).toBe("Choose a valid remix revenue share before publishing this song.");

    expect(captureErrorMessage(() => buildSongPostRequest({
      bundleId: "sab_bad_rev",
      derivativeStep: undefined,
      idempotencyKey: "key-bad-rev",
      license: { presetId: "commercial-remix", commercialRevSharePct: 10.5 },
      paidSongPriceUsd: null,
      songMode: "original",
      title: "Bad rev",
      visibility: "public",
    }))).toBe("Choose a valid remix revenue share before publishing this song.");

    expect(captureErrorMessage(() => buildSongPostRequest({
      bundleId: "sab_extra_rev",
      derivativeStep: undefined,
      idempotencyKey: "key-extra-rev",
      license: { presetId: "commercial-use", commercialRevSharePct: 10 },
      paidSongPriceUsd: null,
      songMode: "original",
      title: "Extra rev",
      visibility: "public",
    }))).toBe("Revenue share is only available for commercial remix licenses.");
  });

  test("derives song submit validation from the route state", () => {
    expect(resolveComposerSubmitState({
      canSubmit: true,
      composerMode: "song",
      derivativeStep: { required: true, references: [] },
      license: undefined,
      monetizationState: { visible: true },
      paidSongPriceInvalid: false,
      songMode: "remix",
      submitError: null,
    })).toEqual({
      canContinue: false,
      canPost: false,
      disabled: true,
      submitError: "Attach a source track before publishing this remix.",
    });

    expect(resolveComposerSubmitState({
      canSubmit: true,
      composerMode: "song",
      derivativeStep: { required: true, references: [{ id: "ast_1", title: "Source" }] },
      license: undefined,
      monetizationState: { visible: true },
      paidSongPriceInvalid: false,
      songMode: "remix",
      submitError: null,
    })).toEqual({
      canContinue: false,
      canPost: false,
      disabled: true,
      submitError: "Accept the source license terms before publishing this remix.",
    });

    expect(resolveComposerSubmitState({
      canSubmit: true,
      composerMode: "song",
      derivativeStep: { required: true, references: [{ id: "ast_1", title: "Source" }], sourceTermsAccepted: true },
      license: undefined,
      monetizationState: { visible: true },
      paidSongPriceInvalid: false,
      songMode: "remix",
      submitError: null,
    })).toEqual({
      canContinue: true,
      canPost: true,
      disabled: false,
      submitError: null,
    });
  });

  test("derives original song license validation from the route state", () => {
    expect(resolveComposerSubmitState({
      canSubmit: true,
      composerMode: "song",
      derivativeStep: undefined,
      license: undefined,
      monetizationState: { visible: false },
      paidSongPriceInvalid: false,
      songMode: "original",
      submitError: null,
    })).toEqual({
      canContinue: true,
      canPost: false,
      disabled: true,
      submitError: "Choose license terms before publishing this song.",
    });

    expect(resolveComposerSubmitState({
      canSubmit: true,
      composerMode: "song",
      derivativeStep: undefined,
      license: { presetId: "commercial-remix", commercialRevSharePct: 101 },
      monetizationState: { visible: false },
      paidSongPriceInvalid: false,
      songMode: "original",
      submitError: null,
    })).toEqual({
      canContinue: true,
      canPost: false,
      disabled: true,
      submitError: "Choose a valid remix revenue share before publishing this song.",
    });

    expect(resolveComposerSubmitState({
      canSubmit: true,
      composerMode: "song",
      derivativeStep: undefined,
      license: { presetId: "commercial-remix", commercialRevSharePct: 25 },
      monetizationState: { visible: false },
      paidSongPriceInvalid: false,
      songMode: "original",
      submitError: null,
    })).toEqual({
      canContinue: true,
      canPost: true,
      disabled: false,
      submitError: null,
    });
  });
});
