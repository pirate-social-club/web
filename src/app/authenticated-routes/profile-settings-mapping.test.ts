import { describe, expect, test } from "bun:test";
import type { Profile } from "@pirate/api-contracts";

import { apiProfileToProps } from "../authenticated-helpers/profile-settings-mapping";

function createProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    avatar_ref: null,
    bio: null,
    cover_ref: null,
    created_at: "2026-04-18T10:00:00.000Z",
    display_name: null,
    global_handle: {
      free_rename_consumed: false,
      global_handle_id: "ghd_test",
      issuance_source: "generated_signup",
      issued_at: "2026-04-18T10:00:00.000Z",
      label: "sable-harbor-4143.pirate",
      replaced_at: null,
      status: "active",
      tier: "generated",
    },
    linked_handles: null,
    preferred_locale: null,
    primary_public_handle: null,
    primary_wallet_address: null,
    updated_at: "2026-04-18T10:00:00.000Z",
    user_id: "usr_test",
    verification_capabilities: null,
    ...overrides,
  };
}

const followState = {
  followerCount: 0,
  followingCount: 0,
  followBusy: false,
  followDisabled: false,
  followLoading: false,
  isFollowing: false,
  onToggleFollow: () => {},
};

const labels = {
  followersLabel: "Followers",
  followingLabel: "Following",
};

describe("apiProfileToProps", () => {
  test("uses a generated profile cover when the API profile has no cover", () => {
    const props = apiProfileToProps(createProfile(), false, labels, followState, "en-US");

    expect(props.profile.bannerSrc.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(props.profile.bannerSrc)).toContain("sable-harbor-4143.pirate cover");
  });

  test("preserves a renderable explicit cover ref from the API", () => {
    const props = apiProfileToProps(createProfile({ cover_ref: "/profile-media/cover/cover-ref.png" }), false, labels, followState, "en-US");

    expect(props.profile.bannerSrc).toBe("/profile-media/cover/cover-ref.png");
  });

  test("uses a generated profile cover when the API profile has an unsupported cover ref", () => {
    const props = apiProfileToProps(createProfile({ cover_ref: "ipfs://cover-ref" }), false, labels, followState, "en-US");

    expect(props.profile.bannerSrc.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
  });

  test("does not expose account creation date as a profile stat", () => {
    const props = apiProfileToProps(createProfile(), false, labels, followState, "en-US");

    expect(props.rightRail.stats).toEqual([
      { label: "Followers", value: 0 },
      { label: "Following", value: 0 },
    ]);
  });
});
