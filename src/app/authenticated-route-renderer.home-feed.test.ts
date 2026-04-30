import { describe, expect, test } from "bun:test";
import type { HomeFeedItem } from "@pirate/api-contracts";
import type { LocalizedPostResponse } from "@pirate/api-contracts";
import type { Profile } from "@pirate/api-contracts";

import { applyPostVote, toCommunityFeedItem, toHomeFeedItem } from "@/app/authenticated-route-renderer";
import { loadProfilesByUserId } from "@/app/authenticated-data/community-data";

function createEntry(): HomeFeedItem {
  return {
    community: {
      avatar_ref: null,
      community: "cmt_alpha",
      display_name: "Alpha Crew",
      member_count: null,
      route_slug: "alpha",
      updated: "2026-04-18T10:00:00.000Z",
    },
    post: {
      downvote_count: 2,
      like_count: 0,
      machine_translated: false,
      post: {
        anonymous_label: null,
        anonymous_scope: null,
        asset: null,
        access_mode: null,
        age_gate_policy: "none",
        analysis_result_ref: null,
        analysis_state: "allow",
        author_user: "usr_author",
        authorship_mode: "human_direct",
        body: "Body copy",
        caption: null,
        community: "cmt_alpha",
        content_safety_state: "safe",
        created: "2026-04-18T10:00:00.000Z",
        disclosed_qualifiers_json: null,
        identity_mode: "public",
        label_id: null,
        link_url: null,
        media_refs: undefined,
        parent_post_id: null,
        post: "pst_alpha",
        post_type: "text",
        rights_basis: "none",
        song_artifact_bundle: null,
        song_mode: null,
        source_language: "en",
        status: "published",
        visibility: "public",
        title: "Hello world",
        translation_policy: "none",
        updated: "2026-04-18T10:00:00.000Z",
      },
      resolved_locale: "en",
      source_hash: "src_test",
      thread_snapshot: {
        comment_count: 5,
        created: "2026-04-18T10:30:00.000Z",
        published_through_comment_created_at: "2026-04-18T10:30:00.000Z",
        snapshot_seq: 1,
        swarm_feed_ref: null,
        swarm_manifest_ref: "swm_test",
        thread_root_post_id: "pst_alpha",
      },
      comment_count: 5,
      translated_body: null,
      translated_caption: null,
      translated_title: null,
      translation_state: "same_language",
      upvote_count: 11,
      viewer_reaction_kinds: [],
      viewer_vote: 1,
    } as LocalizedPostResponse,
  };
}

function createAuthorProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    avatar_ref: null,
    bio: null,
    cover_ref: null,
    created: "2026-04-18T10:00:00.000Z",
    display_name: "Blackbeard",
    global_handle: {
      free_rename_consumed: false,
      global_handle_id: "ghl_blackbeard",
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
    updated: "2026-04-18T10:00:00.000Z",
    user: "usr_author",
    verification_capabilities: null,
    ...overrides,
  };
}

describe("toHomeFeedItem", () => {
  test("maps server home feed entries into home cards", () => {
    const item = toHomeFeedItem(createEntry(), {});

    expect(item.id).toBe("pst_alpha");
    expect(item.post.byline?.community?.href).toBe("/c/cmt_alpha");
    expect(item.post.byline?.community?.label).toBe("c/alpha");
    expect(item.post.engagement?.commentCount).toBe(5);
    expect(item.post.engagement?.score).toBe(9);
  });

  test("uses live comment_count when the thread snapshot lags", () => {
    const entry = createEntry();
    entry.post.comment_count = 1;
    if (entry.post.thread_snapshot) {
      entry.post.thread_snapshot.comment_count = 0;
    }

    const item = toHomeFeedItem(entry, {});

    expect(item.post.engagement?.commentCount).toBe(1);
  });

  test("prefers disclosed qualifier snapshots over the label badge", () => {
    const entry = createEntry();
    entry.post.post.disclosed_qualifiers_json = [
      {
        qualifier_kind: "verification_capability",
        qualifier_source: "community_post",
        qualifier_template_id: "unique_human",
        redundancy_key: null,
        rendered_label: "Unique Human",
        sensitivity_level: null,
      },
      {
        qualifier_kind: "verification_capability",
        qualifier_source: "community_post",
        qualifier_template_id: "age_over_18",
        redundancy_key: null,
        rendered_label: "18+",
        sensitivity_level: null,
      },
    ];
    entry.post.label = { label: "Legacy Label", label_id: "lbl_legacy", status: "active" };

    const item = toHomeFeedItem(entry, {});

    expect(item.post.qualifierLabels).toEqual(["Unique Human", "18+"]);
  });

  test("uses hydrated public handles before raw user id fallback", () => {
    const entry = createEntry();
    const authorProfile = createAuthorProfile();

    const item = toHomeFeedItem(entry, { usr_author: authorProfile });

    expect(item.post.byline?.author?.label).toBe("sable-harbor-4143.pirate");
  });

  test("prefers the primary public handle when one is selected", () => {
    const entry = createEntry();
    const authorProfile = createAuthorProfile({
      primary_public_handle: {
        kind: "ens",
        label: "blackbeard.eth",
        linked_handle: "lnk_blackbeard_ens",
        verification_state: "verified",
      },
    });

    const item = toHomeFeedItem(entry, { usr_author: authorProfile });

    expect(item.post.byline?.author?.label).toBe("blackbeard.eth");
  });

  test("renders an ENS primary byline after author profile hydration", async () => {
    const entry = createEntry();
    const authorProfile = createAuthorProfile({
      primary_public_handle: {
        kind: "ens",
        label: "blackbeard.eth",
        linked_handle: "lnk_blackbeard_ens",
        verification_state: "verified",
      },
    });
    const api = {
      profiles: {
        getByUserId: async (userId: string) => {
          expect(userId).toBe("usr_author");
          return authorProfile;
        },
      },
    } as unknown as Parameters<typeof loadProfilesByUserId>[0];

    const hydratedProfiles = await loadProfilesByUserId(api, [entry.post.post.author_user ?? ""]);
    const item = toHomeFeedItem(entry, hydratedProfiles);

    expect(item.post.byline?.author?.label).toBe("blackbeard.eth");
    expect(item.post.byline?.author?.href).toBe("/u/blackbeard.eth");
  });

  test("passes through an onVote handler when the container provides one", () => {
    const onVote = () => undefined;

    const item = toHomeFeedItem(createEntry(), {}, undefined, { onVote });

    expect(item.post.onVote).toBe(onVote);
  });

  test("passes through an onComment handler when the container provides one", () => {
    const onComment = () => undefined;

    const item = toHomeFeedItem(createEntry(), {}, undefined, { onComment });

    expect(item.post.onComment).toBe(onComment);
  });

  test("maps link post title and body onto the card", () => {
    const entry = createEntry();
    entry.post.post.post_type = "link";
    entry.post.post.title = "A real link title";
    entry.post.post.body = "My commentary on the link.";
    entry.post.post.link_url = "https://example.com/story";
    entry.post.post.link_og_title = "Publisher preview title";

    const item = toHomeFeedItem(entry, {});

    expect(item.post.title).toBe("A real link title");
    expect(item.post.content.type).toBe("link");
    if (item.post.content.type !== "link") throw new Error("expected link content");
    expect(item.post.content.body).toBe("My commentary on the link.");
    expect(item.post.content.previewTitle).toBe("Publisher preview title");
  });
});

describe("toCommunityFeedItem", () => {
  test("keeps community thread counts and comment actions on feed cards", () => {
    const onComment = () => undefined;

    const item = toCommunityFeedItem(createEntry().post, {}, undefined, { onComment });

    expect(item.post.engagement?.commentCount).toBe(5);
    expect(item.post.onComment).toBe(onComment);
  });

  test("uses live comment_count for community cards when the snapshot lags", () => {
    const entry = createEntry();
    entry.post.comment_count = 1;
    if (entry.post.thread_snapshot) {
      entry.post.thread_snapshot.comment_count = 0;
    }

    const item = toCommunityFeedItem(entry.post, {});

    expect(item.post.engagement?.commentCount).toBe(1);
  });
});

describe("applyPostVote", () => {
  test("moves counts when changing an upvote into a downvote", () => {
    const entry = createEntry();

    const updated = applyPostVote(entry.post, -1);

    expect(updated.viewer_vote).toBe(-1);
    expect(updated.upvote_count).toBe(10);
    expect(updated.downvote_count).toBe(3);
  });

  test("supports clearing a local vote snapshot for rollback", () => {
    const entry = createEntry();

    const updated = applyPostVote(entry.post, null);

    expect(updated.viewer_vote).toBe(null);
    expect(updated.upvote_count).toBe(10);
    expect(updated.downvote_count).toBe(2);
  });
});
import "@/test/setup-runtime";
