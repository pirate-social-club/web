import { describe, expect, test } from "bun:test";

import {
  buildRoyaltyAllocationsRequest,
  validateRoyaltySplit,
} from "@/app/authenticated-helpers/asset-submit";
import { buildSongPostRequest } from "@/app/authenticated-helpers/song-submit";
import { defaultAssetRoyaltySplitState } from "@/components/compositions/posts/post-composer/post-composer-config";
import type {
  AssetLicenseState,
  AssetRoyaltySplitState,
} from "@/components/compositions/posts/post-composer/post-composer.types";

const CREATOR = "0x1111111111111111111111111111111111111111";
const PRODUCER = "0x2222222222222222222222222222222222222222";
const commercial: AssetLicenseState = { presetId: "commercial-remix", commercialRevSharePct: 10 };

function split(allocations: AssetRoyaltySplitState["allocations"]): AssetRoyaltySplitState {
  return { allocations };
}

const validSplit = split([
  { id: "c", recipientKind: "creator", walletAddress: CREATOR, sharePct: 90.25 },
  { id: "p", recipientKind: "collaborator", walletAddress: PRODUCER, sharePct: 9.75 },
]);

describe("validateRoyaltySplit", () => {
  test("returns null when there is no split", () => {
    expect(validateRoyaltySplit({ split: undefined, license: commercial, contentLabel: "song" })).toBeNull();
  });

  test("returns null for a creator-only split (treated as single-owner)", () => {
    const creatorOnly = split([{ id: "c", recipientKind: "creator", walletAddress: CREATOR, sharePct: 100 }]);
    expect(validateRoyaltySplit({ split: creatorOnly, license: commercial, contentLabel: "song" })).toBeNull();
  });

  test("accepts a valid 90.25/9.75 split", () => {
    expect(validateRoyaltySplit({ split: validSplit, license: commercial, contentLabel: "song" })).toBeNull();
  });

  test("requires a commercial license", () => {
    const nonCommercial: AssetLicenseState = { presetId: "non-commercial" };
    expect(validateRoyaltySplit({ split: validSplit, license: nonCommercial, contentLabel: "song" })).toMatch(/commercial license/);
  });

  test("requires total of 100%", () => {
    const bad = split([
      { id: "c", recipientKind: "creator", walletAddress: CREATOR, sharePct: 80 },
      { id: "p", recipientKind: "collaborator", walletAddress: PRODUCER, sharePct: 10 },
    ]);
    expect(validateRoyaltySplit({ split: bad, license: commercial, contentLabel: "song" })).toMatch(/total 100/);
  });

  test("rejects zero-share collaborators", () => {
    const bad = split([
      { id: "c", recipientKind: "creator", walletAddress: CREATOR, sharePct: 100 },
      { id: "p", recipientKind: "collaborator", walletAddress: PRODUCER, sharePct: 0 },
    ]);
    expect(validateRoyaltySplit({ split: bad, license: commercial, contentLabel: "song" })).toMatch(/greater than 0/);
  });

  test("rejects duplicate wallets", () => {
    const bad = split([
      { id: "c", recipientKind: "creator", walletAddress: CREATOR, sharePct: 50 },
      { id: "p", recipientKind: "collaborator", walletAddress: CREATOR, sharePct: 50 },
    ]);
    expect(validateRoyaltySplit({ split: bad, license: commercial, contentLabel: "song" })).toMatch(/unique/);
  });

  test("rejects invalid collaborator wallet", () => {
    const bad = split([
      { id: "c", recipientKind: "creator", walletAddress: CREATOR, sharePct: 90 },
      { id: "p", recipientKind: "collaborator", walletAddress: "nope", sharePct: 10 },
    ]);
    expect(validateRoyaltySplit({ split: bad, license: commercial, contentLabel: "song" })).toMatch(/valid wallet/);
  });

  // Finding #4: any supplied (defined) state is validated fully, even creator-only.
  test("rejects empty supplied allocations", () => {
    expect(validateRoyaltySplit({ split: split([]), license: commercial, contentLabel: "song" })).toMatch(/Add your wallet/);
  });

  test("rejects two creators (creator-only)", () => {
    const bad = split([
      { id: "c1", recipientKind: "creator", walletAddress: CREATOR, sharePct: 50 },
      { id: "c2", recipientKind: "creator", walletAddress: PRODUCER, sharePct: 50 },
    ]);
    expect(validateRoyaltySplit({ split: bad, license: commercial, contentLabel: "song" })).toMatch(/exactly one creator/);
  });

  test("rejects a creator-only split that does not total 100%", () => {
    const bad = split([{ id: "c", recipientKind: "creator", walletAddress: CREATOR, sharePct: 50 }]);
    expect(validateRoyaltySplit({ split: bad, license: commercial, contentLabel: "song" })).toMatch(/total 100/);
  });

  // Finding #3: finer-than-bps precision must fail, not silently round.
  test("rejects finer-than-bps precision", () => {
    const bad = split([
      { id: "c", recipientKind: "creator", walletAddress: CREATOR, sharePct: 90.246 },
      { id: "p", recipientKind: "collaborator", walletAddress: PRODUCER, sharePct: 9.754 },
    ]);
    expect(validateRoyaltySplit({ split: bad, license: commercial, contentLabel: "song" })).toMatch(/0\.01%/);
  });

  test("creator-only on non-commercial license is allowed (omitted, single-owner)", () => {
    const creatorOnly = split([{ id: "c", recipientKind: "creator", walletAddress: CREATOR, sharePct: 100 }]);
    expect(validateRoyaltySplit({ split: creatorOnly, license: { presetId: "non-commercial" }, contentLabel: "song" })).toBeNull();
  });
});

describe("buildRoyaltyAllocationsRequest", () => {
  test("returns undefined for a creator-only split", () => {
    const creatorOnly = split([{ id: "c", recipientKind: "creator", walletAddress: CREATOR, sharePct: 100 }]);
    expect(buildRoyaltyAllocationsRequest(creatorOnly)).toBeUndefined();
  });

  test("maps 2-decimal percent to basis points", () => {
    expect(buildRoyaltyAllocationsRequest(validSplit)).toEqual([
      { recipient_kind: "creator", wallet_address: CREATOR, share_bps: 9025 },
      { recipient_kind: "collaborator", wallet_address: PRODUCER, share_bps: 975 },
    ]);
  });
});

// Integration: the route→controller default→editor edit→submit sequence. This
// would have caught findings #1 (route omitted the wiring) and #2 (empty initial
// state suppressed the creator default).
describe("route-to-request propagation", () => {
  test("untouched (undefined) -> creator default -> add collaborator -> request carries allocations", () => {
    // 1. create-post-route passes royaltySplit: undefined; the composer controller
    //    creates the creator's 100% default using the current user wallet.
    const initial = defaultAssetRoyaltySplitState(undefined, CREATOR);
    expect(initial.allocations).toEqual([
      { id: "creator", recipientKind: "creator", walletAddress: CREATOR, sharePct: 100 },
    ]);

    // 2. user rebalances and adds a collaborator (editor onChange -> setRoyaltySplit -> draft).
    const edited: AssetRoyaltySplitState = {
      allocations: [
        { ...initial.allocations[0], sharePct: 90.25 },
        { id: "p", recipientKind: "collaborator", walletAddress: PRODUCER, sharePct: 9.75 },
      ],
    };

    // 3. submission reads draft.royaltySplit and serializes into the create-post request.
    const request = buildSongPostRequest({
      bundleId: "bundle",
      derivativeStep: undefined,
      idempotencyKey: "key",
      license: commercial,
      paidSongPriceUsd: null,
      royaltySplit: edited,
      songMode: "original",
      title: "Title",
      visibility: "public",
    });
    expect(request.royalty_allocations).toEqual([
      { recipient_kind: "creator", wallet_address: CREATOR, share_bps: 9025 },
      { recipient_kind: "collaborator", wallet_address: PRODUCER, share_bps: 975 },
    ]);
  });

  test("untouched split publishes as single-owner (no allocations)", () => {
    const request = buildSongPostRequest({
      bundleId: "bundle",
      derivativeStep: undefined,
      idempotencyKey: "key",
      license: commercial,
      paidSongPriceUsd: null,
      royaltySplit: undefined,
      songMode: "original",
      title: "Title",
      visibility: "public",
    });
    expect(request.royalty_allocations).toBeUndefined();
  });
});
