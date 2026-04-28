import { describe, expect, test } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";
import { installDomGlobals } from "@/test/setup-dom";

import type { CommunityPreview, LocalizedPostResponse } from "@pirate/api-contracts";

import { api } from "@/lib/api";
import { __resetSessionStoreForTests } from "@/lib/api/session-store";

import { usePost } from "./post-state";

installDomGlobals();
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
});
Object.defineProperty(window, "location", {
  configurable: true,
  value: new URL("https://app.pirate.sc/post/pst_test"),
});

const labels = {
  cancelReplyLabel: "Cancel",
  loadMoreRepliesLabel: "Load more replies",
  loadRepliesLabel: "Load replies",
  loadingRepliesLabel: "Loading replies",
  replyActionLabel: "Reply",
  replyPlaceholder: "Write a reply",
  showOriginalLabel: "Show original",
  showTranslationLabel: "Show translation",
  submitReplyLabel: "Post reply",
};

function createPostResponse(): LocalizedPostResponse {
  return {
    post: {
      post_id: "pst_test",
      community_id: "cmt_test",
      post_type: "text",
      title: "Post title",
      body: "Post body",
      caption: null,
      status: "published",
      visibility: "public",
      identity_mode: "anonymous",
      author_user_id: null,
      anonymous_label: "anon",
      authorship_mode: "human",
      agent_display_name_snapshot: null,
      agent_owner_handle_snapshot: null,
      source_language: "en",
      translation_policy: "machine_allowed",
      label_id: null,
      disclosed_qualifiers_json: null,
      media_refs: [],
      embeds: [],
      link_url: null,
      asset_id: null,
      access_mode: "public",
      created_at: "2026-04-24T00:00:00.000Z",
      updated_at: "2026-04-24T00:00:00.000Z",
      score: 0,
    } as unknown as LocalizedPostResponse["post"],
    thread_snapshot: {
      thread_root_post_id: "pst_test",
      snapshot_seq: 1,
      published_through_comment_created_at: "2026-04-24T00:00:00.000Z",
      comment_count: 0,
      swarm_manifest_ref: "swarm://comments/pst_test",
      swarm_feed_ref: null,
      created_at: "2026-04-24T00:00:00.000Z",
    },
    label: null,
    upvote_count: 0,
    downvote_count: 0,
    like_count: 0,
    viewer_vote: null,
    viewer_reaction_kinds: [],
    resolved_locale: "es",
    translation_state: "same_language",
    machine_translated: false,
    translated_title: null,
    translated_body: null,
    translated_caption: null,
    source_hash: "hash",
  };
}

function createPreview(): CommunityPreview {
  return {
    community_id: "cmt_test",
    display_name: "Preview Community",
    description: "Localized preview source",
    localized_text: null,
    avatar_ref: null,
    banner_ref: null,
    membership_mode: "open",
    human_verification_lane: "self",
    member_count: 2,
    follower_count: 3,
    donation_policy_mode: "none",
    donation_partner_id: null,
    donation_partner: null,
    moderator: {
      user_id: "usr_owner",
      display_name: "Owner Person",
      handle: "owner.pirate",
      avatar_ref: null,
      nationality_badge_country: null,
    },
    reference_links: [],
    membership_gate_summaries: [],
    rules: [],
    viewer_membership_status: "member",
    viewer_following: true,
    created_at: "2026-04-24T00:00:00.000Z",
  };
}

describe("usePost", () => {
  test("loads authenticated post sidebar data through localized community preview", async () => {
    __resetSessionStoreForTests();
    const calls = {
      communityGet: 0,
      communityPreview: [] as Array<{ communityId: string; locale?: string | null }>,
    };

    const communities = api.communities as unknown as {
      get: (communityId: string, opts?: { locale?: string | null }) => Promise<unknown>;
      preview: (communityId: string, opts?: { locale?: string | null }) => Promise<CommunityPreview>;
      listComments: (...args: unknown[]) => Promise<{ items: []; next_cursor: null }>;
    };
    const posts = api.posts as unknown as {
      get: (postId: string, opts?: { locale?: string | null }) => Promise<LocalizedPostResponse>;
    };
    const agents = api.agents as unknown as {
      list: () => Promise<{ items: [] }>;
    };

    communities.get = async () => {
      calls.communityGet += 1;
      throw new Error("owner-only community get should not be called");
    };
    communities.preview = async (communityId, opts) => {
      calls.communityPreview.push({ communityId, locale: opts?.locale });
      return createPreview();
    };
    communities.listComments = async () => ({ items: [], next_cursor: null });
    posts.get = async () => createPostResponse();
    agents.list = async () => ({ items: [] });

    const { result } = renderHook(() => usePost("pst_test", "es", true, labels));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(calls.communityGet).toBe(0);
    expect(calls.communityPreview).toEqual([{ communityId: "cmt_test", locale: "es" }]);
    expect(result.current.community?.display_name).toBe("Preview Community");
  });
});
