import { describe, expect, test } from "bun:test";
import type { HomeFeedItem as ApiHomeFeedItem } from "@pirate/api-contracts";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

import { sortCommunityFeedPosts, sortHomeFeedEntries } from "@/app/authenticated-helpers/feed-sorting";

function createPost(input: {
  body?: string;
  caption?: string;
  commentCount?: number;
  createdAt: string;
  downvotes?: number;
  id: string;
  likes?: number;
  mediaCount?: number;
  title?: string;
  upvotes?: number;
}): ApiPost {
  return {
    post: {
      anonymous_label: null,
      anonymous_scope: null,
      asset: null,
      access_mode: null,
      age_gate_policy: "none",
      analysis_result_ref: null,
      analysis_state: "allow",
      author_user: "usr_test",
      authorship_mode: "human_direct",
      body: input.body ?? "",
      caption: input.caption ?? null,
      community: "cmt_test",
      content_safety_state: "safe",
      created: input.createdAt,
      disclosed_qualifiers_json: null,
      identity_mode: "public",
      label_id: null,
      link_url: null,
      media_refs: Array.from({ length: input.mediaCount ?? 0 }, (_, index) => ({
        alt_text: null,
        blurhash: null,
        duration_seconds: null,
        height: 100,
        media_kind: "image",
        mime_type: "image/jpeg",
        position: index,
        preview_storage_ref: null,
        storage_ref: `media_${input.id}_${index}`,
        width: 100,
      })),
      id: input.id,
      parent_post_id: null,
      post_type: "text",
      rights_basis: "none",
      song_artifact_bundle: null,
      song_mode: null,
      source_language: "en",
      status: "published",
      title: input.title ?? null,
      translation_policy: "none",
      updated: input.createdAt,
      visibility: "public",
    },
    resolved_locale: "en",
    source_hash: `src_${input.id}`,
    thread_snapshot: {
      comment_count: input.commentCount ?? 0,
      created: input.createdAt,
      published_through_comment_created_at: input.createdAt,
      snapshot_seq: 1,
      swarm_feed_ref: null,
      swarm_manifest_ref: `swm_${input.id}`,
      thread_root_post_id: input.id,
    },
    comment_count: input.commentCount ?? 0,
    translated_body: null,
    translated_caption: null,
    translated_title: null,
    translation_state: "same_language",
    upvote_count: input.upvotes ?? 0,
    downvote_count: input.downvotes ?? 0,
    like_count: input.likes ?? 0,
    viewer_reaction_kinds: [],
    viewer_vote: null,
    machine_translated: false,
  } as unknown as ApiPost;
}

function createHomeEntry(post: ApiPost): ApiHomeFeedItem {
  return {
    community: {
      id: "cmt_test",
      object: "home_feed_community_summary",
      avatar_ref: null,
      display_name: "Test Community",
      member_count: null,
      route_slug: "test-community",
    },
    post,
  };
}

describe("feed sorting", () => {
  const now = Date.parse("2026-04-19T12:00:00.000Z");
  const recentPlain = createPost({
    body: "tiny",
    createdAt: "2026-04-19T11:00:00.000Z",
    id: "pst_recent",
    title: "Recent",
  });
  const midRich = createPost({
    body: "This one has a much longer body for richness sorting.",
    createdAt: "2026-04-19T09:00:00.000Z",
    id: "pst_rich",
    mediaCount: 1,
    title: "Rich post",
  });
  const oldEngaged = createPost({
    body: "older engaged",
    commentCount: 2,
    createdAt: "2026-04-18T10:00:00.000Z",
    id: "pst_engaged",
    likes: 1,
    title: "Engaged",
    upvotes: 3,
  });

  test("new sorts by creation time descending", () => {
    const sorted = sortCommunityFeedPosts([oldEngaged, midRich, recentPlain], "new", now);

    expect(sorted.map((post) => post.post.id)).toEqual([
      "pst_recent",
      "pst_rich",
      "pst_engaged",
    ]);
  });

  test("top prioritizes engagement and richness over recency", () => {
    const sorted = sortCommunityFeedPosts([recentPlain, oldEngaged, midRich], "top", now);

    expect(sorted.map((post) => post.post.id)).toEqual([
      "pst_engaged",
      "pst_rich",
      "pst_recent",
    ]);
  });

  test("best applies time decay to the weighted score", () => {
    const sorted = sortCommunityFeedPosts([recentPlain, oldEngaged, midRich], "best", now);

    expect(sorted.map((post) => post.post.id)).toEqual([
      "pst_rich",
      "pst_recent",
      "pst_engaged",
    ]);
  });

  test("home top can filter by time range before sorting", () => {
    const sorted = sortHomeFeedEntries([
      createHomeEntry(oldEngaged),
      createHomeEntry(midRich),
      createHomeEntry(recentPlain),
    ], {
      now,
      sort: "top",
      topTimeRange: "day",
    });

    expect(sorted.map((entry) => entry.post.post.id)).toEqual([
      "pst_rich",
      "pst_recent",
    ]);
  });
});
