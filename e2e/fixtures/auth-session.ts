import type { StoredSession } from "./session";

type JsonValue = boolean | number | string | null | JsonValue[] | { [key: string]: JsonValue };

export const mockWalletAddress = "0x1111111111111111111111111111111111111111";

export const mockOnboarding = {
  cleanup_rename_available: false,
  community_creation_ready: true,
  generated_handle_assigned: false,
  missing_requirements: [],
  namespace_verification_status: "not_started",
  reddit_import_status: "succeeded",
  reddit_verification_status: "verified",
  unique_human_verification_status: "verified",
};

export const mockUser = {
  id: "usr_e2e",
  object: "user",
  created: Date.parse("2026-05-01T00:00:00.000Z"),
  primary_wallet_attachment: "wa_e2e",
  verification_capabilities: {
    age_over_18: { state: "verified" },
    gender: { state: "unverified" },
    minimum_age: { state: "verified" },
    nationality: { state: "unverified" },
    unique_human: { state: "verified" },
    wallet_score: { state: "verified" },
  },
  verification_state: "verified",
};

export const mockProfile = {
  id: "usr_e2e",
  object: "profile",
  avatar_ref: null,
  avatar_source: null,
  bio: "Browser smoke test account.",
  bio_source: "manual",
  cover_ref: null,
  cover_source: null,
  created: Date.parse("2026-05-01T00:00:00.000Z"),
  display_name: "E2E Test",
  display_verified_nationality_badge: false,
  global_handle: {
    free_rename_consumed: false,
    id: "gh_e2e",
    issuance_source: "generated_signup",
    issued_at: Date.parse("2026-05-01T00:00:00.000Z"),
    label: "e2e-test.pirate",
    object: "global_handle",
    price_paid_cents: null,
    redirect_target_global_handle: null,
    replaced_at: null,
    status: "active",
    tier: "standard",
  },
  linked_handles: [],
  nationality_badge_country: null,
  preferred_locale: "en",
  primary_public_handle: null,
  primary_wallet_address: mockWalletAddress,
};

export const mockWalletAttachments = [
  {
    chain_namespace: "eip155:1",
    is_primary: true,
    wallet_address: mockWalletAddress,
    wallet_attachment: "wa_e2e",
  },
];

export const mockCommunityId = "cmt_e2e";
export const mockCreatedPostId = "pst_e2e_created";
export const mockFeedPostId = "pst_e2e_feed";
export const mockCommentId = "cmt_e2e_new";
export const mockCommentBody = "E2E browser comment";
export const mockDerivativeSourceRef = "story:ip:0x1111111111111111111111111111111111111111#licenseTermsId=17";
export const mockDerivativeSources = [
  {
    id: "asset_ast_e2e_source",
    object: "derivative_source",
    community: mockCommunityId,
    asset: "asset_ast_e2e_source",
    source_ref: mockDerivativeSourceRef,
    title: "E2E Story Remix Source",
    kind: "song",
    story_ip: "0x1111111111111111111111111111111111111111",
    story_license_terms: "17",
    license_preset: "commercial-remix",
    commercial_rev_share_pct: 10,
    creator_user: "usr_source_artist",
    creator_handle: "source-artist.pirate",
    creator_display_name: "Source Artist",
  },
] as const;

export const mockCommunityPreview = {
  id: mockCommunityId,
  object: "community_preview",
  route_slug: "e2e",
  display_name: "E2E Community",
  description: "Deterministic community for browser smoke tests.",
  localized_text: null,
  avatar_ref: null,
  banner_ref: null,
  membership_mode: "open",
  allow_anonymous_identity: true,
  anonymous_identity_scope: "community_stable",
  allowed_disclosed_qualifiers: [],
  allow_qualifiers_on_anonymous_posts: true,
  guest_comment_policy: "disallow",
  agent_posting_policy: "disallow",
  agent_posting_scope: "replies_only",
  agent_daily_post_cap: null,
  agent_daily_reply_cap: null,
  accepted_agent_ownership_providers: [],
  human_verification_lane: "very",
  member_count: 1,
  follower_count: 1,
  donation_policy_mode: "none",
  donation_partner: null,
  owner: null,
  moderators: [],
  reference_links: [],
  membership_gate_summaries: [],
  rules: [],
  viewer_membership_status: "member",
  viewer_community_role: null,
  viewer_following: true,
  created: Date.parse("2026-05-01T00:00:00.000Z"),
};

export const mockJoinEligibility = {
  community: mockCommunityId,
  membership_mode: "open",
  human_verification_lane: "very",
  joinable_now: false,
  status: "already_joined",
  membership_gate_summaries: [],
  missing_capabilities: [],
  suggested_verification_provider: null,
  suggested_verification_intent: null,
  failure_reason: null,
  wallet_score_status: null,
  gate_evaluation: null,
};

export function createMockPostResponse(input?: {
  body?: string | null;
  commentCount?: number;
  created?: number;
  downvoteCount?: number;
  id?: string;
  likeCount?: number;
  title?: string;
  upvoteCount?: number;
  viewerVote?: -1 | 1 | null;
}) {
  const postId = input?.id ?? mockFeedPostId;
  const created = input?.created ?? Date.parse("2026-05-01T00:00:00.000Z");
  const commentCount = input?.commentCount ?? 0;
  return {
    post: {
      id: postId,
      object: "post",
      post: postId,
      community: mockCommunityId,
      post_type: "text",
      title: input?.title ?? "E2E feed post",
      body: input?.body ?? "A deterministic post rendered from mocked API data.",
      caption: null,
      status: "published",
      visibility: "public",
      identity_mode: "public",
      author_user: mockUser.id,
      anonymous_label: null,
      anonymous_scope: null,
      authorship_mode: "human_direct",
      agent_display_name_snapshot: null,
      agent_owner_handle_snapshot: null,
      source_language: "en",
      translation_policy: "machine_allowed",
      label_id: null,
      disclosed_qualifiers_json: null,
      media_refs: [],
      embeds: [],
      link_url: null,
      asset: null,
      access_mode: "public",
      created,
      analysis_state: "allow",
      analysis_result_ref: null,
      content_safety_state: "safe",
      age_gate_policy: "none",
      rights_basis: "none",
      song_artifact_bundle: null,
      song_mode: null,
    },
    thread_snapshot: {
      thread_root_post: postId,
      thread_root_post_id: postId,
      snapshot_seq: 1,
      published_through_comment_created: created,
      comment_count: commentCount,
      swarm_manifest_ref: "swarm://comments/pst_e2e",
      swarm_feed_ref: null,
      created,
    },
    comment_count: commentCount,
    upvote_count: input?.upvoteCount ?? (input?.viewerVote === 1 ? 5 : 4),
    downvote_count: input?.downvoteCount ?? 1,
    like_count: input?.likeCount ?? 0,
    viewer_vote: input?.viewerVote ?? null,
    viewer_reaction_kinds: [],
    resolved_locale: "en",
    translation_state: "same_language",
    translated_title: null,
    translated_body: null,
    translated_caption: null,
    machine_translated: false,
    source_hash: "e2e-source-hash",
  };
}

export function createMockHomeFeedItem(input?: Parameters<typeof createMockPostResponse>[0]) {
  return {
    community: {
      id: mockCommunityId,
      object: "home_feed_community_summary",
      community: mockCommunityId,
      display_name: mockCommunityPreview.display_name,
      route_slug: mockCommunityPreview.route_slug,
      avatar_ref: null,
      member_count: 1,
      follower_count: 1,
      view_count: 1,
    },
    post: createMockPostResponse(input),
  };
}

export function createMockCommentListItem(input?: { body?: string }) {
  return {
    id: mockCommentId,
    object: "comment_list_item",
    comment: {
      id: mockCommentId,
      object: "comment",
      community: mockCommunityId,
      thread_root_post: mockFeedPostId,
      parent_comment: null,
      author_user: mockUser.id,
      authorship_mode: "human_direct",
      identity_mode: "public",
      anonymous_scope: null,
      anonymous_label: null,
      body: input?.body ?? mockCommentBody,
      media_refs: [],
      status: "published",
      depth: 0,
      direct_reply_count: 0,
      descendant_count: 0,
      upvote_count: 0,
      downvote_count: 0,
      score: 0,
      last_reply_at: null,
      content_hash: null,
      swarm_body_ref: null,
      idempotency_key: null,
      created: Date.parse("2026-05-01T00:05:00.000Z"),
    },
    machine_translated: false,
    resolved_locale: "en",
    source_hash: "e2e-comment-hash",
    translated_body: null,
    translation_state: "same_language",
    viewer_can_delete: true,
    viewer_reaction_kinds: [],
    viewer_vote: null,
  };
}

function base64UrlEncode(value: JsonValue): string {
  const json = JSON.stringify(value);
  return btoa(json)
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/u, "");
}

export function createMockAccessToken(): string {
  const nowSeconds = Math.floor(Date.now() / 1000);

  return [
    base64UrlEncode({ alg: "none", typ: "JWT" }),
    base64UrlEncode({
      exp: nowSeconds + 60 * 60,
      iat: nowSeconds,
      sub: mockUser.id,
    }),
    "e2e",
  ].join(".");
}

export function createMockStoredSession(): StoredSession {
  return {
    accessToken: createMockAccessToken(),
    user: mockUser,
    profile: mockProfile,
    onboarding: mockOnboarding,
    walletAttachments: mockWalletAttachments,
    storedAt: new Date().toISOString(),
  };
}
