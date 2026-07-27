import { describe, expect, test } from "bun:test";

import { resolveProfileFollowRelationship } from "./profile-follow-state";

const AVAILABLE_WALLET = {
  status: "available" as const,
  address: "0x0000000000000000000000000000000000000001",
};

describe("resolveProfileFollowRelationship", () => {
  test("preserves an explicit current relationship", () => {
    expect(resolveProfileFollowRelationship({
      target_wallet: AVAILABLE_WALLET,
      relationship: { status: "current", viewer_follows: true },
    })).toEqual({ kind: "current", viewerFollows: true });
  });

  test("does not coerce an unknown current relationship to false", () => {
    expect(resolveProfileFollowRelationship({
      target_wallet: AVAILABLE_WALLET,
      relationship: { status: "current", viewer_follows: null },
    })).toEqual({ kind: "unavailable" });
  });

  test("distinguishes a missing target wallet from projection unavailability", () => {
    expect(resolveProfileFollowRelationship({
      target_wallet: { status: "no_wallet" },
      relationship: { status: "unavailable", viewer_follows: null },
    })).toEqual({ kind: "not_applicable" });
    expect(resolveProfileFollowRelationship({
      target_wallet: AVAILABLE_WALLET,
      relationship: { status: "unavailable", viewer_follows: null },
    })).toEqual({ kind: "unavailable" });
  });

  test("keeps anonymous and walletless viewers actionable", () => {
    expect(resolveProfileFollowRelationship({
      target_wallet: AVAILABLE_WALLET,
      relationship: { status: "viewer_anonymous", viewer_follows: null },
    })).toEqual({ kind: "viewer_absent" });
    expect(resolveProfileFollowRelationship({
      target_wallet: AVAILABLE_WALLET,
      relationship: { status: "viewer_no_wallet", viewer_follows: null },
    })).toEqual({ kind: "viewer_absent" });
  });
});
