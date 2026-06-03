import { describe, expect, test } from "bun:test";

import {
  buildAssetListingRequest,
  buildLiveRoomListingRequest,
  resolveComposerSubmitState,
} from "@/app/authenticated-helpers/asset-submit";
import {
  buildSongPostRequest,
} from "@/app/authenticated-helpers/song-submit";
import {
  countUniqueRawAcrMatches,
} from "@/app/authenticated-state/use-song-submit";

function captureErrorMessage(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

describe("song submit payload helpers", () => {
  test("counts unique raw ACR source matches for logging", () => {
    const count = countUniqueRawAcrMatches({
      moderation_result: {
        audio_identification: {
          provider_result: {
            metadata: {
              custom_files: [
                {
                  acrid: "acr_1",
                  user_defined: JSON.stringify({
                    community_id: "com_lane",
                    song_artifact_bundle_id: "sab_unresolved",
                  }),
                },
                {
                  acrid: "acr_2",
                  user_defined: JSON.stringify({
                    community_id: "com_lane",
                    song_artifact_bundle_id: "sab_unresolved",
                  }),
                },
                {
                  acrid: "acr_3",
                  user_defined: JSON.stringify({
                    community_id: "com_lane",
                    song_artifact_bundle_id: "sab_resolved",
                  }),
                },
              ],
            },
          },
        },
      },
    } as never);

    expect(count).toBe(2);
  });

  test("builds a free original song post without a listing", () => {
    const postRequest = buildSongPostRequest({
      bundleId: "sab_free",
      caption: "  Listen through the second chorus.  ",
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
      caption: "Listen through the second chorus.",
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

  test("adds ElasticStage vinyl release metadata to paid song listings", () => {
    const listingRequest = buildAssetListingRequest({
      assetId: "ast_paid_vinyl",
      paidSongPriceUsd: 4.99,
      pricingPolicyRegionalPricingEnabled: false,
      regionalPricingEnabled: false,
      vinylReleaseUrl: "  https://elasticstage.com/saint-pablo/releases/benefit-single  ",
    });

    expect(listingRequest).toEqual({
      asset: "ast_paid_vinyl",
      price_cents: 499,
      regional_pricing_enabled: false,
      donation_partner: null,
      donation_share_bps: null,
      vinyl_release_provider: "elasticstage",
      vinyl_release_url: "https://elasticstage.com/saint-pablo/releases/benefit-single",
      status: "active",
    });
  });

  test("builds a paid live-room ticket listing", () => {
    const listingRequest = buildLiveRoomListingRequest({
      liveRoomId: "lr_paid_room",
      paidLiveRoomPriceUsd: 12,
      pricingPolicyRegionalPricingEnabled: true,
      regionalPricingEnabled: true,
    });

    expect(listingRequest).toEqual({
      live_room: "lr_paid_room",
      price_cents: 1200,
      regional_pricing_enabled: true,
      status: "active",
    });

    expect(buildLiveRoomListingRequest({
      liveRoomId: null,
      paidLiveRoomPriceUsd: 12,
      pricingPolicyRegionalPricingEnabled: true,
      regionalPricingEnabled: true,
    })).toEqual({
      live_room: null,
      price_cents: 1200,
      regional_pricing_enabled: true,
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
      license: { presetId: "commercial-remix", commercialRevSharePct: 15 },
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
      license_preset: "commercial-remix",
      commercial_rev_share_pct: 15,
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
      license: { presetId: "non-commercial" },
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
      license: { presetId: "non-commercial" },
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
      license: { presetId: "non-commercial" },
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

  test("requires ticket price for paid live rooms", () => {
    expect(resolveComposerSubmitState({
      canSubmit: true,
      composerMode: "live",
      derivativeStep: undefined,
      license: undefined,
      monetizationState: { visible: false },
      paidSongPriceInvalid: true,
      submitError: null,
    })).toEqual({
      canContinue: true,
      canPost: false,
      disabled: true,
      submitError: "Enter a valid ticket price before publishing this live room.",
    });
  });

  test("keeps an ACRCloud match prompt blocking even when source refs exist", () => {
    expect(resolveComposerSubmitState({
      canSubmit: true,
      composerMode: "song",
      derivativeStep: {
        required: true,
        references: [{ id: "ast_resolved_source", title: "Resolved source" }],
        sourceTermsAccepted: true,
      },
      license: { presetId: "non-commercial" },
      monetizationState: { visible: false },
      paidSongPriceInvalid: false,
      songMode: "remix",
      submitError: "Your uploaded song is too similar to an existing song.",
    })).toEqual({
      canContinue: true,
      canPost: false,
      disabled: true,
      submitError: "Your uploaded song is too similar to an existing song.",
    });
  });

  test("does not send unresolved ACR fallback references in remix post payloads", () => {
    expect(buildSongPostRequest({
      bundleId: "sab_remix",
      derivativeStep: {
        required: true,
        references: [
          { id: "acr:custom-file:acr_match_1", title: "Matched source 1" },
          { id: "ast_resolved_source", title: "Resolved source" },
        ],
        sourceTermsAccepted: true,
      },
      idempotencyKey: "key-remix",
      license: { presetId: "non-commercial" },
      paidSongPriceUsd: null,
      songMode: "remix",
      title: "Remix",
      visibility: "public",
    }).upstream_asset_refs).toEqual(["ast_resolved_source"]);
  });

  test("requires and sends remix song license payloads", () => {
    expect(captureErrorMessage(() => buildSongPostRequest({
      bundleId: "sab_remix_missing",
      derivativeStep: {
        required: true,
        references: [{ id: "ast_source", title: "Source" }],
        sourceTermsAccepted: true,
      },
      idempotencyKey: "key-remix-missing",
      license: undefined,
      paidSongPriceUsd: null,
      songMode: "remix",
      title: "Missing remix license",
      visibility: "public",
    }))).toBe("Choose license terms before publishing this song.");

    const request = buildSongPostRequest({
      bundleId: "sab_remix_license",
      derivativeStep: {
        required: true,
        references: [{ id: "ast_source", title: "Source" }],
        sourceTermsAccepted: true,
      },
      idempotencyKey: "key-remix-license",
      license: { presetId: "commercial-remix", commercialRevSharePct: 20 },
      paidSongPriceUsd: null,
      songMode: "remix",
      title: "Licensed remix",
      visibility: "public",
    });

    expect(request.license_preset).toBe("commercial-remix");
    expect(request.commercial_rev_share_pct).toBe(20);
    expect(request.rights_basis).toBe("derivative");
    expect(request.upstream_asset_refs).toEqual(["ast_source"]);
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
