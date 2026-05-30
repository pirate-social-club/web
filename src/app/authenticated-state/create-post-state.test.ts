import { describe, expect, test } from "bun:test";
import { renderHook } from "@testing-library/react";
import type { CommunityPreview, JoinEligibility } from "@pirate/api-contracts";

import { api } from "@/lib/api";
import { installDomGlobals } from "@/test/setup-dom";
import { buildDerivativeSourceSearchOptions, derivativeSourceToComposerReference, useCreatePostState } from "./create-post-state";
import {
  clearCreatePostCommunitySnapshotCacheForTests,
  readCreatePostCommunitySnapshot,
  rememberCreatePostCommunitySnapshot,
} from "./create-post-community-cache";
import type { ApiDerivativeSource } from "@/lib/api/client-api-types";

installDomGlobals();

describe("create post derivative source search", () => {
  test("preserves typed query for server-backed source search", () => {
    expect(buildDerivativeSourceSearchOptions(" Travel Guide ")).toEqual({
      kind: "song",
      scope: "global",
      q: "Travel Guide",
      limit: 25,
    });
  });

  test("normalizes blank source search query to initial load", () => {
    expect(buildDerivativeSourceSearchOptions("   ")).toEqual({
      kind: "song",
      scope: "global",
      q: null,
      limit: 25,
    });
  });

  test("uses direct Story parent refs for remix source search results", () => {
    const source: ApiDerivativeSource = {
      id: "asset_ast_source_song",
      object: "derivative_source",
      community: "com_cmt_source",
      asset: "asset_ast_source_song",
      source_ref: "story:ip:0x1111111111111111111111111111111111111111#licenseTermsId=17",
      title: "Source Song",
      kind: "song",
      story_ip: "0x1111111111111111111111111111111111111111",
      story_license_terms: "17",
      license_preset: "commercial-remix",
      commercial_rev_share_pct: 10,
      creator_user: "usr_artist",
    };

    expect(derivativeSourceToComposerReference(source, { preferDirectStoryRef: true }).id)
      .toBe("story:ip:0x1111111111111111111111111111111111111111#licenseTermsId=17");
    expect(derivativeSourceToComposerReference(source).id).toBe("story:asset:asset_ast_source_song");
  });
});

describe("create post community snapshot cache", () => {
  test("stores the same composer snapshot by route id and slug", () => {
    clearCreatePostCommunitySnapshotCacheForTests();

    const preview = {
      id: "com_123",
      route_slug: "design",
    } as CommunityPreview;
    const eligibility = {
      status: "already_joined",
    } as JoinEligibility;

    rememberCreatePostCommunitySnapshot(["com_123", "design"], { eligibility, preview });

    expect(readCreatePostCommunitySnapshot("com_123")).toEqual({ eligibility, preview });
    expect(readCreatePostCommunitySnapshot("design")).toEqual({ eligibility, preview });
  });

  test("merges eligibility into an existing preview snapshot", () => {
    clearCreatePostCommunitySnapshotCacheForTests();

    const preview = {
      id: "com_456",
      route_slug: "music",
    } as CommunityPreview;
    const eligibility = {
      status: "joinable",
    } as JoinEligibility;

    rememberCreatePostCommunitySnapshot(["com_456", "music"], { preview });
    rememberCreatePostCommunitySnapshot(["com_456", "music"], { eligibility });

    expect(readCreatePostCommunitySnapshot("com_456")).toEqual({ eligibility, preview });
    expect(readCreatePostCommunitySnapshot("music")).toEqual({ eligibility, preview });
  });

  test("scopes snapshots by viewer id", () => {
    clearCreatePostCommunitySnapshotCacheForTests();

    const preview = {
      id: "com_789",
      route_slug: "film",
    } as CommunityPreview;

    rememberCreatePostCommunitySnapshot(["com_789"], { preview }, "usr_alice");

    expect(readCreatePostCommunitySnapshot("com_789", "usr_alice")).toEqual({ eligibility: null, preview });
    expect(readCreatePostCommunitySnapshot("com_789", "usr_bob")).toBeNull();
  });

  test("starts composer without loading when community page warmed preview and eligibility", () => {
    clearCreatePostCommunitySnapshotCacheForTests();

    const preview = {
      id: "com_fast",
      route_slug: "fast",
      display_name: "Fast Community",
      avatar_ref: null,
      owner: null,
      moderators: [],
      membership_gate_summaries: [],
      allowed_disclosed_qualifiers: [],
      allow_anonymous_identity: true,
      anonymous_identity_scope: "community_stable",
      donation_partner: null,
      donation_policy_mode: "none",
    } as unknown as CommunityPreview;
    const eligibility = {
      status: "already_joined",
    } as JoinEligibility;
    const communities = api.communities as unknown as {
      get: (communityId: string) => Promise<unknown>;
      getJoinEligibility: (communityId: string) => Promise<JoinEligibility>;
      getPricingPolicy: (communityId: string) => Promise<unknown>;
      preview: (communityId: string) => Promise<CommunityPreview>;
    };
    const originalGet = communities.get;
    const originalGetJoinEligibility = communities.getJoinEligibility;
    const originalGetPricingPolicy = communities.getPricingPolicy;
    const originalPreview = communities.preview;

    communities.get = () => new Promise<unknown>(() => undefined);
    communities.getJoinEligibility = () => new Promise<JoinEligibility>(() => undefined);
    communities.getPricingPolicy = () => new Promise<unknown>(() => undefined);
    communities.preview = () => new Promise<CommunityPreview>(() => undefined);
    rememberCreatePostCommunitySnapshot(["com_fast", "fast"], { eligibility, preview });

    try {
      const { result } = renderHook(() => useCreatePostState("fast"));

      expect(result.current.loading).toBe(false);
      expect(result.current.community?.id).toBe("com_fast");
      expect(result.current.eligibility?.status).toBe("already_joined");
    } finally {
      communities.get = originalGet;
      communities.getJoinEligibility = originalGetJoinEligibility;
      communities.getPricingPolicy = originalGetPricingPolicy;
      communities.preview = originalPreview;
    }
  });
});
