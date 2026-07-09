import { describe, expect, test } from "bun:test";
import type {
  CommentListItem,
  CommunityPreview,
  LocalizedPostResponse,
  Profile,
  ProfileActivityResponse,
} from "@pirate/api-contracts";

import { mapProfileActivityProps } from "./profile-activity-mapping";

const community = {
  id: "cmt_test",
  object: "community_preview",
  display_name: "Test Builders",
  owner: {
    avatar_ref: "https://example.test/avatar.png",
    display_name: "Swift Fox",
    handle: "swift-fox-7721.pirate",
    role: "owner",
    user: "usr_swift",
  },
  route_slug: "test-builders",
} as CommunityPreview;

const authorProfile = {
  avatar_ref: "https://example.test/profile-avatar.png",
  display_name: "Swift Fox",
  global_handle: { label: "swift-fox-7721.pirate" },
  id: "prf_swift",
  object: "profile",
  primary_public_handle: { label: "swift-fox-7721.pirate" },
  user: "usr_swift",
} as Profile;

function makePost(overrides: Partial<LocalizedPostResponse["post"]> = {}): LocalizedPostResponse {
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
      ...overrides,
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

function makeComment(overrides: Partial<CommentListItem["comment"]> = {}): CommentListItem {
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
      ...overrides,
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

    const props = mapProfileActivityProps(activity, { usr_swift: authorProfile });

    expect(props.posts).toHaveLength(1);
    expect(props.posts[0]?.post.title).toBe("Profile activity post");
    expect(props.posts[0]?.post.byline?.author?.href).toBe("/u/swift-fox-7721.pirate");
    expect(props.posts[0]?.post.byline?.author?.avatarSrc).toBe("https://example.test/profile-avatar.png");
    expect(props.comments).toHaveLength(1);
    expect(props.comments[0]?.body).toBe("Profile activity comment");
    expect(props.comments[0]?.authorHref).toBe("/u/swift-fox-7721.pirate");
    expect(props.comments[0]?.authorAvatarSrc).toBe("https://example.test/profile-avatar.png");
    expect(props.comments[0]?.postHref).toBe("/p/pst_profile");
    expect(props.overviewItems).toHaveLength(1);
  });

  test("does not infer missing author handles or avatars from the community owner", () => {
    const post = makePost({ author_public_handle: null });
    const comment = makeComment({ author_public_handle: null });
    const activity: Pick<ProfileActivityResponse, "comments" | "overview_items" | "posts"> = {
      comments: [{
        comment,
        community,
        created: comment.comment.created,
        kind: "comment",
        thread_root_post: post,
      }],
      overview_items: [],
      posts: [{
        community,
        created: post.post.created,
        kind: "post",
        post,
      }],
    };

    const props = mapProfileActivityProps(activity);

    expect(props.posts[0]?.post.byline?.author?.label).toBe("usr_swif");
    expect(props.posts[0]?.post.byline?.author?.href).toBeUndefined();
    expect(props.posts[0]?.post.byline?.author?.avatarSrc).toBeUndefined();
    expect(props.comments[0]?.authorLabel).toBe("usr_swif");
    expect(props.comments[0]?.authorHref).toBeUndefined();
    expect(props.comments[0]?.authorAvatarSrc).toBeUndefined();
  });

  test("uses profile avatars without falling back to the community owner avatar", () => {
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
      overview_items: [],
      posts: [{
        community,
        created: post.post.created,
        kind: "post",
        post,
      }],
    };

    const props = mapProfileActivityProps(activity, { usr_swift: authorProfile });

    expect(props.posts[0]?.post.byline?.author?.avatarSrc).toBe("https://example.test/profile-avatar.png");
    expect(props.posts[0]?.post.byline?.author?.avatarSrc).not.toBe("https://example.test/avatar.png");
    expect(props.comments[0]?.authorAvatarSrc).toBe("https://example.test/profile-avatar.png");
  });
});
