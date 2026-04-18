import { describe, expect, test } from "bun:test";
import type { HomeFeedItem } from "@pirate/api-contracts";
import type { LocalizedPostResponse } from "@pirate/api-contracts";

import { toHomeFeedItem } from "@/app/authenticated-route-renderer";

function createEntry(): HomeFeedItem {
  return {
    community: {
      avatar_ref: null,
      community_id: "cmt_alpha",
      display_name: "Alpha Crew",
      member_count: null,
      route_slug: "alpha",
      updated_at: "2026-04-18T10:00:00.000Z",
    },
    post: {
      downvote_count: 2,
      like_count: 0,
      machine_translated: false,
      post: {
        anonymous_label: null,
        anonymous_scope: null,
        asset_id: null,
        access_mode: null,
        age_gate_policy: "none",
        analysis_result_ref: null,
        analysis_state: "allow",
        author_user_id: "usr_author",
        authorship_mode: "human_direct",
        body: "Body copy",
        caption: null,
        community_id: "cmt_alpha",
        content_safety_state: "safe",
        created_at: "2026-04-18T10:00:00.000Z",
        disclosed_qualifiers_json: null,
        identity_mode: "public",
        label_id: null,
        link_url: null,
        media_refs: undefined,
        parent_post_id: null,
        post_id: "pst_alpha",
        post_type: "text",
        rights_basis: "none",
        song_artifact_bundle_id: null,
        song_mode: null,
        source_language: "en",
        status: "published",
        title: "Hello world",
        translation_policy: "none",
        updated_at: "2026-04-18T10:00:00.000Z",
      },
      resolved_locale: "en",
      source_hash: "src_test",
      thread_snapshot: {
        comment_count: 5,
        created_at: "2026-04-18T10:30:00.000Z",
        published_through_comment_created_at: "2026-04-18T10:30:00.000Z",
        snapshot_seq: 1,
        swarm_feed_ref: null,
        swarm_manifest_ref: "swm_test",
        thread_root_post_id: "pst_alpha",
      },
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

describe("toHomeFeedItem", () => {
  test("maps server home feed entries into home cards", () => {
    const item = toHomeFeedItem(createEntry(), {});

    expect(item.id).toBe("pst_alpha");
    expect(item.post.byline?.community?.href).toBe("/c/cmt_alpha");
    expect(item.post.byline?.community?.label).toBe("c/alpha");
    expect(item.post.engagement?.commentCount).toBe(5);
    expect(item.post.engagement?.score).toBe(9);
  });
});
