import { describe, expect, test } from "bun:test";
import type {
  CommentListItem,
  CommunityPreview,
  LocalizedPostResponse,
  ProfileActivityResponse,
} from "@pirate/api-contracts";

import { mapProfileActivityProps } from "./profile-activity-mapping";

const community = {
  id: "cmt_test",
  object: "community_preview",
  display_name: "Test Builders",
  route_slug: "test-builders",
} as CommunityPreview;

function makePost(): LocalizedPostResponse {
  return {
    comment_count: 2,
    community,
    downvote_count: 1,
    like_count: 0,
    machine_translated: false,
    post: {
      age_gate_policy: "none",
      analysis_state: "allow",
      author_public_handle: "swift-fox-7721.pirate",
      author_user: "usr_swift",
      authorship_mode: "human_direct",
      community: "cmt_test",
      content_safety_state: "safe",
      created: 1_782_000_000,
      id: "pst_profile",
      identity_mode: "public",
      object: "post",
      post_type: "text",
      status: "published",
      title: "Profile activity post",
      visibility: "public",
    },
    resolved_locale: "en",
    source_hash: "post-hash",
    thread_snapshot: null,
    translation_state: "same_language",
    upvote_count: 6,
    viewer_is_author: true,
    viewer_reaction_kinds: [],
    viewer_vote: null,
  } as LocalizedPostResponse;
}

function makeComment(): CommentListItem {
  return {
    comment: {
      anonymous_label: null,
      anonymous_scope: null,
      author_public_handle: "swift-fox-7721.pirate",
      author_user: "usr_swift",
      authorship_mode: "human_direct",
      body: "Profile activity comment",
      community: "cmt_test",
      content_hash: null,
      created: 1_782_000_100,
      depth: 0,
      descendant_count: 0,
      direct_reply_count: 0,
      downvote_count: 0,
      id: "cmt_profile",
      identity_mode: "public",
      idempotency_key: null,
      last_reply_at: null,
      object: "comment",
      parent_comment: null,
      replies_locked: false,
      score: 4,
      status: "published",
      swarm_body_ref: null,
      thread_root_post: "pst_profile",
      upvote_count: 4,
    },
    id: "cli_profile",
    machine_translated: false,
    object: "comment_list_item",
    resolved_locale: "en",
    source_hash: "comment-hash",
    translation_state: "same_language",
    viewer_vote: 1,
  } as CommentListItem;
}

describe("mapProfileActivityProps", () => {
  test("maps public posts and comments into non-empty profile page props", () => {
    const post = makePost();
    const comment = makeComment();
    const activity: Pick<ProfileActivityResponse, "comments" | "overview_items" | "posts"> = {
      comments: [{
        comment,
        community,
        created: comment.comment.created,
        kind: "comment",
        thread_root_post: post,
      }],
      overview_items: [{
        community,
        created: post.post.created,
        kind: "post",
        post,
      }],
      posts: [{
        community,
        created: post.post.created,
        kind: "post",
        post,
      }],
    };

    const props = mapProfileActivityProps(activity);

    expect(props.posts).toHaveLength(1);
    expect(props.posts[0]?.post.title).toBe("Profile activity post");
    expect(props.posts[0]?.post.byline?.author?.href).toBe("/u/swift-fox-7721.pirate");
    expect(props.comments).toHaveLength(1);
    expect(props.comments[0]?.body).toBe("Profile activity comment");
    expect(props.comments[0]?.authorHref).toBe("/u/swift-fox-7721.pirate");
    expect(props.comments[0]?.postHref).toBe("/p/pst_profile");
    expect(props.overviewItems).toHaveLength(1);
  });
});
