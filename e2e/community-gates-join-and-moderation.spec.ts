import { expect, test, type Page, type Route } from "@playwright/test";
import type { JoinEligibility, MembershipGateSummary } from "@pirate/api-contracts";

import {
  createMockJoinEligibility,
  createMockPostResponse,
  createMockStoredSession,
  mockCommunityPreview,
  mockOnboarding,
  mockProfile,
  mockUser,
} from "./fixtures/auth-session";
import { expectNoBrowserError } from "./fixtures/e2e-helpers";
import { jsonResponse } from "./fixtures/api-mocks";
import { installStoredSession } from "./fixtures/session";

const pirateApiPattern = /https?:\/\/(?:api-staging\.pirate\.sc|api\.pirate\.sc|127\.0\.0\.1:8787)\/.*/u;

type GateAtom = {
  type: string;
  accepted_providers?: string[] | null;
  allowed?: string[];
  minimum_score?: number;
  provider?: string | null;
};

type GateExpression = {
  op: "and" | "or" | "gate";
  children?: GateExpression[];
  gate?: GateAtom;
};

type GatePolicy = {
  version: 1;
  expression: GateExpression;
};

type JoinRequest = {
  altchaHeader: string | null;
  body: Record<string, unknown>;
};

type VoteRequest = {
  altchaHeader: string | null;
  body: Record<string, unknown>;
  postId: string;
};

type CommentRequest = {
  altchaHeader: string | null;
  body: Record<string, unknown>;
  commentId?: string;
  postId?: string;
};

type GateCommunityFixtureState = {
  commentRequests: CommentRequest[];
  commentVoteRequests: CommentRequest[];
  gateUpdateBodies: Array<Record<string, unknown>>;
  joinRequests: JoinRequest[];
  replyRequests: CommentRequest[];
  setUser: (user: typeof mockUser) => void;
  voteRequests: VoteRequest[];
};

const powGate = { gate_type: "altcha_pow" } as MembershipGateSummary;
const veryGate = {
  accepted_providers: ["very"],
  gate_type: "unique_human",
} as MembershipGateSummary;
const walletScoreGate = {
  gate_type: "wallet_score",
  minimum_score: 20,
} as MembershipGateSummary;

function emptyCursorList() {
  return { items: [], next_cursor: null };
}

function gatePolicy(input: { atoms: GateAtom[]; mode: "and" | "or" }): GatePolicy {
  return {
    version: 1,
    expression: {
      op: input.mode,
      children: input.atoms.map((gate) => ({ op: "gate", gate })),
    },
  };
}

function gateEvaluation(
  actions: Array<Record<string, unknown>>,
  mode: "all" | "any" = "all",
): JoinEligibility["gate_evaluation"] {
  return {
    passed: actions.length === 0,
    trace: {
      children: [],
      kind: "op",
      op: mode === "any" ? "or" : "and",
      passed: actions.length === 0,
    },
    required_action_set: actions.length === 0
      ? null
      : {
          items: actions,
          kind: "set",
          mode,
        },
  } as JoinEligibility["gate_evaluation"];
}

function altchaAction() {
  return {
    capability: "altcha_pow",
    kind: "action",
    provider: "altcha",
    scope: "community_join",
  };
}

function veryAction() {
  return {
    capability: "unique_human",
    kind: "action",
    provider: "very",
  };
}

function walletScoreAction() {
  return {
    actual_score: null,
    capability: "wallet_score",
    kind: "action",
    minimum_score: 20,
    provider: "passport",
  };
}

function pricingPolicy(communityId: string) {
  return {
    country_assignments: [],
    default_tier_key: null,
    id: `cpp_${communityId}`,
    object: "community_pricing_policy",
    policy_origin: "community",
    pricing_policy_version: "v1",
    regional_pricing_enabled: false,
    source_template: null,
    source_template_version: null,
    tiers: [],
    verification_provider_requirement: null,
  };
}

function machineAccessPolicy(communityId: string) {
  return {
    access_mode: "structured_api",
    allowed_uses: {
      ai_training: "prohibited",
      analytics: true,
      summarization: true,
    },
    community: communityId,
    included_surfaces: {
      community_identity: true,
      community_stats: true,
      events: true,
      thread_bodies: true,
      thread_cards: true,
      top_comments: true,
    },
    operational_limits: {
      anonymous_rate_tier: "low",
      authenticated_rate_tier: "standard",
      max_lookback_window: "30d",
      top_comments_limit: 10,
    },
    policy_origin: "default",
    updated: "2026-05-01T00:00:00.000Z",
  };
}

function assistantPolicy(communityId: string) {
  return {
    avatarRef: null,
    community: communityId,
    defaultPrompt: "Ask about this community.",
    displayName: "Harbor Guide",
    elevenLabsKeyConfigured: false,
    enabled: true,
    object: "community_assistant_policy_public",
    shortBio: "Answers community questions.",
    starterPrompts: [],
    sttProvider: "none",
    ttsProvider: "none",
    ttsVoiceConfigured: false,
    voiceMode: "off",
    voiceRepliesConfigured: false,
    voiceTranscriptionConfigured: false,
  };
}

function buildCommunityRecord(input: {
  communityId: string;
  displayName?: string;
  gatePolicy?: GatePolicy | null;
  gates: MembershipGateSummary[];
  owner?: boolean;
  viewerMembershipStatus?: "member" | "not_member";
}) {
  const owner = input.owner ?? false;
  return {
    ...mockCommunityPreview,
    allow_anonymous_identity: true,
    anonymous_identity_scope: "community_stable",
    created_by_user: owner ? mockUser.id : "usr_owner",
    default_age_gate_policy: "none",
    description: "Deterministic gated community for browser tests.",
    display_name: input.displayName ?? "E2E Gated Community",
    gate_policy: input.gatePolicy ?? null,
    gate_rules: [],
    governance_mode: "centralized",
    id: input.communityId,
    membership_gate_summaries: input.gates,
    membership_mode: "gated",
    object: "community",
    provisioning_state: "active",
    route_slug: input.communityId,
    status: "active",
    viewer_community_role: owner ? "owner" : null,
    viewer_membership_status: input.viewerMembershipStatus ?? "not_member",
  };
}

function communityPost(input: {
  communityId: string;
  id: string;
  title: string;
}) {
  const post = createMockPostResponse({
    id: input.id,
    title: input.title,
    upvoteCount: 4,
    viewerVote: null,
  });
  return {
    ...post,
    post: {
      ...post.post,
      author_user: "usr_owner",
      community: input.communityId,
    },
  };
}

function threadComment(input: {
  body: string;
  commentId: string;
  communityId: string;
  postId: string;
}) {
  return {
    comment: {
      anonymous_label: "anon",
      anonymous_scope: "community_stable",
      author_user: null,
      body: input.body,
      community: input.communityId,
      created: Date.parse("2026-05-01T00:00:00.000Z"),
      depth: 0,
      descendant_count: 0,
      direct_reply_count: 0,
      downvote_count: 0,
      id: input.commentId,
      identity_mode: "anonymous",
      media_refs: [],
      object: "comment",
      parent_comment: null,
      score: 0,
      status: "published",
      thread_root_post: input.postId,
      upvote_count: 0,
    },
    resolved_locale: "en",
    translation_state: "same_language",
    translated_body: null,
    viewer_can_delete: false,
    viewer_vote: null,
  };
}

async function installGateCommunityFixture(
  page: Page,
  input: {
    comments?: ReturnType<typeof threadComment>[];
    communityId: string;
    displayName?: string;
    gatePolicy?: GatePolicy | null;
    gates: MembershipGateSummary[];
    homeFeedPosts?: ReturnType<typeof createMockPostResponse>[];
    initialEligibility: JoinEligibility;
    owner?: boolean;
    posts?: ReturnType<typeof createMockPostResponse>[];
    user?: typeof mockUser;
  },
): Promise<GateCommunityFixtureState> {
  const state: GateCommunityFixtureState = {
    commentRequests: [],
    commentVoteRequests: [],
    gateUpdateBodies: [],
    joinRequests: [],
    replyRequests: [],
    setUser: (nextUser) => {
      user = nextUser;
    },
    voteRequests: [],
  };
  let user = input.user ?? mockUser;
  let joined = input.initialEligibility.status === "already_joined";
  let community = buildCommunityRecord({
    communityId: input.communityId,
    displayName: input.displayName,
    gatePolicy: input.gatePolicy,
    gates: input.gates,
    owner: input.owner,
    viewerMembershipStatus: joined ? "member" : "not_member",
  });
  let posts = input.posts ?? [];
  let comments = input.comments ?? [];

  await page.route(pirateApiPattern, async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method().toUpperCase();
    const path = url.pathname;
    const communityBasePath = `/communities/${encodeURIComponent(input.communityId)}`;

    if (method === "GET" && path === "/users/me") {
      await route.fulfill(jsonResponse(user));
      return;
    }

    if (method === "GET" && path === "/profiles/me") {
      await route.fulfill(jsonResponse(mockProfile));
      return;
    }

    if (method === "POST" && path === "/profiles/me/sync-linked-handles") {
      await route.fulfill(jsonResponse(mockProfile));
      return;
    }

    if (method === "GET" && path === "/onboarding/status") {
      await route.fulfill(jsonResponse(mockOnboarding));
      return;
    }

    if (method === "GET" && (path === "/feed/home" || path === "/feed/home/public")) {
      await route.fulfill(jsonResponse({
        items: (input.homeFeedPosts ?? []).map((post) => ({
          community: {
            avatar_ref: null,
            community: input.communityId,
            display_name: community.display_name,
            follower_count: 1,
            id: input.communityId,
            member_count: 1,
            object: "home_feed_community_summary",
            route_slug: input.communityId,
          },
          post,
        })),
        top_communities: [],
      }));
      return;
    }

    if (method === "GET" && path === "/notifications/summary") {
      await route.fulfill(jsonResponse({
        has_unread: false,
        open_task_count: 0,
        unread_activity_count: 0,
      }));
      return;
    }

    if (method === "GET" && (path === "/notifications/tasks" || path === "/notifications/feed")) {
      await route.fulfill(jsonResponse(emptyCursorList()));
      return;
    }

    if (method === "GET" && path === "/agents") {
      await route.fulfill(jsonResponse({ items: [] }));
      return;
    }

    if (method === "GET" && path === `/profiles/${encodeURIComponent(mockUser.id)}`) {
      await route.fulfill(jsonResponse(mockProfile));
      return;
    }

    if (method === "GET" && path === "/verification/altcha/challenge") {
      await route.fulfill(jsonResponse({
        algorithm: "SHA-256",
        challenge: "e2e-altcha-challenge",
        maxnumber: 100000,
        salt: "e2e-altcha-salt",
        signature: "e2e-altcha-signature",
      }));
      return;
    }

    if (method === "GET" && path === communityBasePath) {
      await route.fulfill(jsonResponse(community));
      return;
    }

    if (method === "GET" && path === `${communityBasePath}/preview`) {
      await route.fulfill(jsonResponse({
        ...community,
        object: "community_preview",
        viewer_membership_status: joined ? "member" : "not_member",
      }));
      return;
    }

    if (method === "GET" && path === `${communityBasePath}/join-eligibility`) {
      await route.fulfill(jsonResponse(joined
        ? createMockJoinEligibility({
            community: input.communityId,
            joinable_now: false,
            membership_gate_summaries: input.gates,
            membership_mode: "gated",
            status: "already_joined",
          })
        : input.initialEligibility));
      return;
    }

    if (method === "POST" && path === `${communityBasePath}/join`) {
      state.joinRequests.push({
        altchaHeader: request.headers()["x-pirate-altcha"] ?? null,
        body: request.postDataJSON() as Record<string, unknown>,
      });
      joined = true;
      community = {
        ...community,
        viewer_membership_status: "member",
      };
      await route.fulfill(jsonResponse({ community: input.communityId, status: "joined" }));
      return;
    }

    if (method === "POST" && path === `${communityBasePath}/gates`) {
      const body = request.postDataJSON() as Record<string, unknown>;
      state.gateUpdateBodies.push(body);
      community = {
        ...community,
        allow_anonymous_identity: body.allow_anonymous_identity ?? community.allow_anonymous_identity,
        anonymous_identity_scope: body.anonymous_identity_scope ?? community.anonymous_identity_scope,
        default_age_gate_policy: body.default_age_gate_policy ?? community.default_age_gate_policy,
        gate_policy: body.gate_policy ?? null,
        membership_mode: body.membership_mode ?? community.membership_mode,
      };
      await route.fulfill(jsonResponse(community));
      return;
    }

    if (method === "GET" && path === `${communityBasePath}/posts`) {
      await route.fulfill(jsonResponse({ items: posts }));
      return;
    }

    const postMatch = path.match(/^\/posts\/([^/]+)$/u);
    if (method === "GET" && postMatch) {
      const postId = decodeURIComponent(postMatch[1] ?? "");
      const post = posts.find((candidate) => candidate.post.id === postId)
        ?? input.homeFeedPosts?.find((candidate) => candidate.post.id === postId);
      if (post) {
        await route.fulfill(jsonResponse(post));
        return;
      }
    }

    const postCommentsMatch = path.match(/^\/communities\/([^/]+)\/posts\/([^/]+)\/comments$/u);
    if (method === "GET" && postCommentsMatch) {
      const postId = decodeURIComponent(postCommentsMatch[2] ?? "");
      await route.fulfill(jsonResponse({
        items: comments.filter((item) => item.comment.thread_root_post === postId),
        next_cursor: null,
      }));
      return;
    }

    if (method === "POST" && postCommentsMatch) {
      const postId = decodeURIComponent(postCommentsMatch[2] ?? "");
      const body = request.postDataJSON() as Record<string, unknown>;
      state.commentRequests.push({
        altchaHeader: request.headers()["x-pirate-altcha"] ?? null,
        body,
        postId,
      });
      comments = [
        ...comments,
        threadComment({
          body: typeof body.body === "string" ? body.body : "Created comment",
          commentId: `cmt_e2e_created_${state.commentRequests.length}`,
          communityId: input.communityId,
          postId,
        }),
      ];
      await route.fulfill(jsonResponse(comments[comments.length - 1]?.comment));
      return;
    }

    const commentVoteMatch = path.match(/^\/comments\/([^/]+)\/vote$/u);
    if (method === "POST" && commentVoteMatch) {
      const commentId = decodeURIComponent(commentVoteMatch[1] ?? "");
      const body = request.postDataJSON() as Record<string, unknown>;
      state.commentVoteRequests.push({
        altchaHeader: request.headers()["x-pirate-altcha"] ?? null,
        body,
        commentId,
      });
      await route.fulfill(jsonResponse({
        comment: commentId,
        value: body.value === -1 ? -1 : 1,
      }));
      return;
    }

    const commentReplyMatch = path.match(/^\/comments\/([^/]+)\/replies$/u);
    if (method === "POST" && commentReplyMatch) {
      const commentId = decodeURIComponent(commentReplyMatch[1] ?? "");
      const body = request.postDataJSON() as Record<string, unknown>;
      state.replyRequests.push({
        altchaHeader: request.headers()["x-pirate-altcha"] ?? null,
        body,
        commentId,
      });
      await route.fulfill(jsonResponse({
        ...threadComment({
          body: typeof body.body === "string" ? body.body : "Created reply",
          commentId: `cmt_e2e_reply_${state.replyRequests.length}`,
          communityId: input.communityId,
          postId: comments.find((item) => item.comment.id === commentId)?.comment.thread_root_post ?? "",
        }).comment,
        parent_comment: commentId,
      }));
      return;
    }

    const postVoteMatch = path.match(/^\/posts\/([^/]+)\/vote$/u);
    if (method === "POST" && postVoteMatch) {
      const postId = decodeURIComponent(postVoteMatch[1] ?? "");
      const body = request.postDataJSON() as Record<string, unknown>;
      state.voteRequests.push({
        altchaHeader: request.headers()["x-pirate-altcha"] ?? null,
        body,
        postId,
      });
      const value = body.value === -1 ? -1 : 1;
      posts = posts.map((postResponse) => {
        if (postResponse.post.id !== postId) {
          return postResponse;
        }
        const previousVote = postResponse.viewer_vote ?? null;
        return {
          ...postResponse,
          downvote_count: postResponse.downvote_count + (value === -1 ? 1 : 0) - (previousVote === -1 ? 1 : 0),
          upvote_count: postResponse.upvote_count + (value === 1 ? 1 : 0) - (previousVote === 1 ? 1 : 0),
          viewer_vote: value,
        };
      });
      await route.fulfill(jsonResponse({ post: postId, value }));
      return;
    }

    if (method === "GET" && path === `${communityBasePath}/pricing-policy`) {
      await route.fulfill(jsonResponse(pricingPolicy(input.communityId)));
      return;
    }

    if (method === "GET" && (path === `${communityBasePath}/listings` || path === `${communityBasePath}/purchases`)) {
      await route.fulfill(jsonResponse(emptyCursorList()));
      return;
    }

    if (method === "GET" && path === `${communityBasePath}/handles/status`) {
      await route.fulfill(jsonResponse({ available: false }));
      return;
    }

    if (method === "GET" && path === `${communityBasePath}/handles/me`) {
      await route.fulfill(jsonResponse({ handle: null }));
      return;
    }

    if (method === "GET" && path === `${communityBasePath}/assistant-policy`) {
      await route.fulfill(jsonResponse(assistantPolicy(input.communityId)));
      return;
    }

    if (method === "GET" && path === `${communityBasePath}/machine-access-policy`) {
      await route.fulfill(jsonResponse(machineAccessPolicy(input.communityId)));
      return;
    }

    if (method === "GET" && path === `${communityBasePath}/telegram-chat`) {
      await route.fulfill(jsonResponse({
        community: input.communityId,
        id: `telegram_${input.communityId}`,
        linked_chat: null,
        object: "community_telegram_chat_settings",
      }));
      return;
    }

    if (method === "GET" && path === `${communityBasePath}/telegram-bot`) {
      await route.fulfill(jsonResponse({
        bot_display_name: null,
        bot_username: null,
        community: input.communityId,
        connected_at: null,
        id: `telegram_bot_${input.communityId}`,
        object: "telegram_community_bot",
        status: "missing",
        token_last4: null,
        webhook_status: null,
      }));
      return;
    }

    await route.fulfill(jsonResponse({
      code: "e2e_unhandled_api_route",
      message: `Unhandled gate E2E API fixture for ${method} ${path}`,
    }, 501));
  });

  const session = createMockStoredSession();
  session.user = user;
  await installStoredSession(page, session);

  return state;
}

async function completeProofOfWork(page: Page, payload: string): Promise<void> {
  const dialog = page.getByRole("dialog", { name: /checking browser|proof-of-work|browser check/i });
  await expect(dialog).toBeVisible();

  const widget = page.locator("altcha-widget");
  await widget.waitFor({ state: "attached" });
  // Mirrors the custom events emitted by the ALTCHA web component; if ALTCHA changes its event API, this helper should change with it.
  await widget.evaluate((element, nextPayload) => {
    element.dispatchEvent(new CustomEvent("verified", {
      bubbles: true,
      detail: { payload: nextPayload },
    }));
    element.dispatchEvent(new CustomEvent("statechange", {
      bubbles: true,
      detail: { payload: nextPayload, state: "verified" },
    }));
  }, payload);

  await expect(dialog).toContainText("Proof-of-work complete");
  await dialog.getByRole("button", { name: /^continue$/i }).click();
}

test.describe("community gate join and moderation flows with mocked API", () => {
  test("joins a proof-of-work only community with the Altcha payload header", async ({ page }) => {
    const communityId = "cmt_e2e_join_pow";
    const state = await installGateCommunityFixture(page, {
      communityId,
      gates: [powGate],
      initialEligibility: createMockJoinEligibility({
        community: communityId,
        gate_evaluation: gateEvaluation([altchaAction()]),
        joinable_now: false,
        membership_gate_summaries: [powGate],
        membership_mode: "gated",
        missing_capabilities: ["altcha_pow"],
        status: "verification_required",
      }),
    });

    await page.goto(`/c/${communityId}`);
    const panel = page.locator("section").filter({ hasText: "Proof-of-work required" }).first();
    await expect(panel).toBeVisible({ timeout: 30_000 });

    await panel.getByRole("button", { name: /verify to join/i }).first().click();
    await completeProofOfWork(page, "e2e-join-proof");

    await expect.poll(() => state.joinRequests.length).toBe(1);
    expect(state.joinRequests[0]?.altchaHeader).toBe("e2e-join-proof");
    await expect(page.getByRole("button", { name: /^joined$/i })).toBeVisible();
    await expectNoBrowserError(page);
  });

  test("lets an unverified user join a Very OR proof-of-work community through PoW fallback", async ({ page }) => {
    const communityId = "cmt_e2e_join_very_or_pow";
    const user = {
      ...mockUser,
      verification_capabilities: {
        ...mockUser.verification_capabilities,
        unique_human: { state: "unverified" },
      },
      verification_state: "unverified",
    };
    const state = await installGateCommunityFixture(page, {
      communityId,
      gates: [veryGate, powGate],
      initialEligibility: createMockJoinEligibility({
        community: communityId,
        gate_evaluation: gateEvaluation([veryAction(), altchaAction()], "any"),
        human_verification_lane: "very",
        joinable_now: false,
        membership_gate_summaries: [veryGate, powGate],
        membership_mode: "gated",
        missing_capabilities: ["unique_human", "altcha_pow"],
        status: "verification_required",
      }),
      user,
    });

    await page.goto(`/c/${communityId}`);
    const panel = page.locator("section").filter({ hasText: "Proof-of-work required" }).first();
    await expect(panel).toBeVisible({ timeout: 30_000 });
    await expect(panel.getByLabel("Membership requirements")).toContainText("Palm scan");

    await panel.getByRole("button", { name: /verify to join/i }).first().click();
    await completeProofOfWork(page, "e2e-very-fallback-proof");

    await expect.poll(() => state.joinRequests.length).toBe(1);
    expect(state.joinRequests[0]?.altchaHeader).toBe("e2e-very-fallback-proof");
    await expect(page.getByRole("button", { name: /^joined$/i })).toBeVisible();
    await expectNoBrowserError(page);
  });

  test("does not offer proof-of-work for a wallet-score rejection without a fallback gate", async ({ page }) => {
    const communityId = "cmt_e2e_join_wallet_rejected";
    const state = await installGateCommunityFixture(page, {
      communityId,
      gates: [walletScoreGate],
      initialEligibility: createMockJoinEligibility({
        community: communityId,
        failure_reason: "wallet_score_too_low",
        gate_evaluation: gateEvaluation([walletScoreAction()]),
        joinable_now: false,
        membership_gate_summaries: [walletScoreGate],
        membership_mode: "gated",
        missing_capabilities: ["wallet_score"],
        status: "gate_failed",
        wallet_score_status: {
          actual_score: null,
          minimum_score: 20,
        },
      }),
    });

    await page.goto(`/c/${communityId}`);
    await expect(page.getByText("Higher Score Required")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("link", { name: /visit passport\.xyz/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /not eligible/i })).toBeDisabled();
    await expect(page.getByRole("dialog", { name: /proof-of-work|browser check/i })).toBeHidden();
    expect(state.joinRequests).toHaveLength(0);
    await expectNoBrowserError(page);
  });

  test("does not show proof-of-work when a Very-verified member upvotes in a Very OR proof-of-work community", async ({ page }) => {
    const communityId = "cmt_e2e_vote_very_or_pow";
    const postId = "pst_e2e_vote_very_or_pow";
    const user = {
      ...mockUser,
      verification_capabilities: {
        ...mockUser.verification_capabilities,
        unique_human: { provider: "very", state: "verified" },
      },
      verification_state: "verified",
    };
    const state = await installGateCommunityFixture(page, {
      communityId,
      gates: [veryGate, powGate],
      initialEligibility: createMockJoinEligibility({
        community: communityId,
        membership_gate_summaries: [veryGate, powGate],
        membership_mode: "gated",
        status: "already_joined",
      }),
      posts: [communityPost({
        communityId,
        id: postId,
        title: "Very member vote target",
      })],
      user,
    });

    await page.goto(`/c/${communityId}`);
    const postCard = page.locator("article").filter({ hasText: "Very member vote target" }).first();
    await expect(postCard).toBeVisible({ timeout: 30_000 });

    await postCard.getByRole("button", { name: /^upvote$/i }).click();

    await expect.poll(() => state.voteRequests.length).toBe(1);
    expect(state.voteRequests[0]).toMatchObject({
      altchaHeader: null,
      body: { value: 1 },
      postId,
    });
    await expect(page.getByRole("dialog", { name: /proof-of-work|browser check/i })).toBeHidden();
    await expectNoBrowserError(page);
  });

  test("refreshes stale session capabilities before showing proof-of-work for a Very OR proof-of-work upvote", async ({ page }) => {
    const communityId = "cmt_e2e_vote_stale_very_or_pow";
    const postId = "pst_e2e_vote_stale_very_or_pow";
    const unverifiedUser = {
      ...mockUser,
      verification_capabilities: {
        ...mockUser.verification_capabilities,
        unique_human: { state: "unverified" },
      },
      verification_state: "unverified",
    };
    const verifiedUser = {
      ...mockUser,
      verification_capabilities: {
        ...mockUser.verification_capabilities,
        unique_human: { provider: "very", state: "verified" },
      },
      verification_state: "verified",
    };
    const state = await installGateCommunityFixture(page, {
      communityId,
      gates: [veryGate, powGate],
      initialEligibility: createMockJoinEligibility({
        community: communityId,
        membership_gate_summaries: [veryGate, powGate],
        membership_mode: "gated",
        status: "already_joined",
      }),
      posts: [communityPost({
        communityId,
        id: postId,
        title: "Stale Very session vote target",
      })],
      user: unverifiedUser,
    });

    await page.goto(`/c/${communityId}`);
    const postCard = page.locator("article").filter({ hasText: "Stale Very session vote target" }).first();
    await expect(postCard).toBeVisible({ timeout: 30_000 });

    state.setUser(verifiedUser);
    await postCard.getByRole("button", { name: /^upvote$/i }).click();

    await expect.poll(() => state.voteRequests.length).toBe(1);
    expect(state.voteRequests[0]).toMatchObject({
      altchaHeader: null,
      body: { value: 1 },
      postId,
    });
    await expect(page.getByRole("dialog", { name: /proof-of-work|browser check/i })).toBeHidden();
    await expectNoBrowserError(page);
  });

  test("keeps proof-of-work fallback available when an unverified member upvotes in a Very OR proof-of-work community", async ({ page }) => {
    const communityId = "cmt_e2e_vote_unverified_very_or_pow";
    const postId = "pst_e2e_vote_unverified_very_or_pow";
    const user = {
      ...mockUser,
      verification_capabilities: {
        ...mockUser.verification_capabilities,
        unique_human: { state: "unverified" },
      },
      verification_state: "unverified",
    };
    const state = await installGateCommunityFixture(page, {
      communityId,
      gates: [veryGate, powGate],
      initialEligibility: createMockJoinEligibility({
        community: communityId,
        membership_gate_summaries: [veryGate, powGate],
        membership_mode: "gated",
        status: "already_joined",
      }),
      posts: [communityPost({
        communityId,
        id: postId,
        title: "Unverified fallback vote target",
      })],
      user,
    });

    await page.goto(`/c/${communityId}`);
    const postCard = page.locator("article").filter({ hasText: "Unverified fallback vote target" }).first();
    await expect(postCard).toBeVisible({ timeout: 30_000 });

    await postCard.getByRole("button", { name: /^upvote$/i }).click();
    await completeProofOfWork(page, "e2e-vote-fallback-proof");

    await expect.poll(() => state.voteRequests.length).toBe(1);
    expect(state.voteRequests[0]).toMatchObject({
      altchaHeader: "e2e-vote-fallback-proof",
      body: { value: 1 },
      postId,
    });
    await expectNoBrowserError(page);
  });

  test("does not show proof-of-work when a passing Passport-score member upvotes in a wallet-score OR proof-of-work community", async ({ page }) => {
    const communityId = "cmt_e2e_vote_wallet_or_pow";
    const postId = "pst_e2e_vote_wallet_or_pow";
    const user = {
      ...mockUser,
      verification_capabilities: {
        ...mockUser.verification_capabilities,
        wallet_score: {
          passing_score: true,
          provider: "passport",
          score_decimal: "25",
          state: "verified",
        },
      },
      verification_state: "verified",
    };
    const state = await installGateCommunityFixture(page, {
      communityId,
      gates: [walletScoreGate, powGate],
      initialEligibility: createMockJoinEligibility({
        community: communityId,
        membership_gate_summaries: [walletScoreGate, powGate],
        membership_mode: "gated",
        status: "already_joined",
      }),
      posts: [communityPost({
        communityId,
        id: postId,
        title: "Passport score vote target",
      })],
      user,
    });

    await page.goto(`/c/${communityId}`);
    const postCard = page.locator("article").filter({ hasText: "Passport score vote target" }).first();
    await expect(postCard).toBeVisible({ timeout: 30_000 });

    await postCard.getByRole("button", { name: /^upvote$/i }).click();

    await expect.poll(() => state.voteRequests.length).toBe(1);
    expect(state.voteRequests[0]).toMatchObject({
      altchaHeader: null,
      body: { value: 1 },
      postId,
    });
    await expect(page.getByRole("dialog", { name: /proof-of-work|browser check/i })).toBeHidden();
    await expectNoBrowserError(page);
  });

  test("does not show proof-of-work when a Very-verified member replies to a post in a Very OR proof-of-work community", async ({ page }) => {
    const communityId = "cmt_e2e_reply_post_very_or_pow";
    const postId = "pst_e2e_reply_post_very_or_pow";
    const user = {
      ...mockUser,
      verification_capabilities: {
        ...mockUser.verification_capabilities,
        unique_human: { provider: "very", state: "verified" },
      },
      verification_state: "verified",
    };
    const state = await installGateCommunityFixture(page, {
      communityId,
      gates: [veryGate, powGate],
      initialEligibility: createMockJoinEligibility({
        community: communityId,
        membership_gate_summaries: [veryGate, powGate],
        membership_mode: "gated",
        status: "already_joined",
      }),
      posts: [communityPost({
        communityId,
        id: postId,
        title: "Very member reply target",
      })],
      user,
    });

    await page.goto(`/p/${postId}`);
    await expect(page.getByRole("heading", { name: "Very member reply target" })).toBeVisible({ timeout: 30_000 });

    await page.getByRole("textbox", { name: /^reply$/i }).click();
    await page.getByPlaceholder("Write a reply").fill("Verified reply without PoW");
    await page.getByRole("button", { name: /^post reply$/i }).click();

    await expect.poll(() => state.commentRequests.length).toBe(1);
    expect(state.commentRequests[0]).toMatchObject({
      altchaHeader: null,
      body: { body: "Verified reply without PoW" },
      postId,
    });
    await expect(page.getByRole("dialog", { name: /proof-of-work|browser check/i })).toBeHidden();
    await expectNoBrowserError(page);
  });

  test("does not show proof-of-work when a Very-verified member upvotes a comment in a Very OR proof-of-work community", async ({ page }) => {
    const communityId = "cmt_e2e_comment_vote_very_or_pow";
    const postId = "pst_e2e_comment_vote_very_or_pow";
    const commentId = "cmt_e2e_comment_vote_target";
    const user = {
      ...mockUser,
      verification_capabilities: {
        ...mockUser.verification_capabilities,
        unique_human: { provider: "very", state: "verified" },
      },
      verification_state: "verified",
    };
    const state = await installGateCommunityFixture(page, {
      comments: [threadComment({
        body: "Comment vote target",
        commentId,
        communityId,
        postId,
      })],
      communityId,
      gates: [veryGate, powGate],
      initialEligibility: createMockJoinEligibility({
        community: communityId,
        membership_gate_summaries: [veryGate, powGate],
        membership_mode: "gated",
        status: "already_joined",
      }),
      posts: [communityPost({
        communityId,
        id: postId,
        title: "Very comment vote post",
      })],
      user,
    });

    await page.goto(`/p/${postId}`);
    const commentCard = page.locator("article").filter({ hasText: "Comment vote target" }).first();
    await expect(commentCard).toBeVisible({ timeout: 30_000 });

    await commentCard.getByRole("button", { name: /^upvote comment$/i }).click();

    await expect.poll(() => state.commentVoteRequests.length).toBe(1);
    expect(state.commentVoteRequests[0]).toMatchObject({
      altchaHeader: null,
      body: { value: 1 },
      commentId,
    });
    await expect(page.getByRole("dialog", { name: /proof-of-work|browser check/i })).toBeHidden();
    await expectNoBrowserError(page);
  });

  test("keeps comment-bound proof-of-work fallback available when an unverified member upvotes a comment", async ({ page }) => {
    const communityId = "cmt_e2e_comment_vote_fallback";
    const postId = "pst_e2e_comment_vote_fallback";
    const commentId = "cmt_e2e_comment_vote_fallback_target";
    const user = {
      ...mockUser,
      verification_capabilities: {
        ...mockUser.verification_capabilities,
        unique_human: { state: "unverified" },
      },
      verification_state: "unverified",
    };
    const state = await installGateCommunityFixture(page, {
      comments: [threadComment({
        body: "Comment fallback target",
        commentId,
        communityId,
        postId,
      })],
      communityId,
      gates: [veryGate, powGate],
      initialEligibility: createMockJoinEligibility({
        community: communityId,
        membership_gate_summaries: [veryGate, powGate],
        membership_mode: "gated",
        status: "already_joined",
      }),
      posts: [communityPost({
        communityId,
        id: postId,
        title: "Comment fallback post",
      })],
      user,
    });

    await page.goto(`/p/${postId}`);
    const commentCard = page.locator("article").filter({ hasText: "Comment fallback target" }).first();
    await expect(commentCard).toBeVisible({ timeout: 30_000 });

    await commentCard.getByRole("button", { name: /^upvote comment$/i }).click();
    await completeProofOfWork(page, "e2e-comment-vote-proof");

    await expect.poll(() => state.commentVoteRequests.length).toBe(1);
    expect(state.commentVoteRequests[0]).toMatchObject({
      altchaHeader: "e2e-comment-vote-proof",
      body: { value: 1 },
      commentId,
    });
    await expectNoBrowserError(page);
  });

  test("does not show proof-of-work when a Very-verified member upvotes a gated home-feed post", async ({ page }) => {
    const communityId = "cmt_e2e_home_vote_very_or_pow";
    const postId = "pst_e2e_home_vote_very_or_pow";
    const user = {
      ...mockUser,
      verification_capabilities: {
        ...mockUser.verification_capabilities,
        unique_human: { provider: "very", state: "verified" },
      },
      verification_state: "verified",
    };
    const state = await installGateCommunityFixture(page, {
      communityId,
      gates: [veryGate, powGate],
      homeFeedPosts: [communityPost({
        communityId,
        id: postId,
        title: "Very home feed vote target",
      })],
      initialEligibility: createMockJoinEligibility({
        community: communityId,
        membership_gate_summaries: [veryGate, powGate],
        membership_mode: "gated",
        status: "already_joined",
      }),
      user,
    });

    await page.goto("/");
    const postCard = page.locator("article").filter({ hasText: "Very home feed vote target" }).first();
    await expect(postCard).toBeVisible({ timeout: 30_000 });

    await postCard.getByRole("button", { name: /^upvote$/i }).click();

    await expect.poll(() => state.voteRequests.length).toBe(1);
    expect(state.voteRequests[0]).toMatchObject({
      altchaHeader: null,
      body: { value: 1 },
      postId,
    });
    await expect(page.getByRole("dialog", { name: /proof-of-work|browser check/i })).toBeHidden();
    await expectNoBrowserError(page);
  });

  test("preserves an OR gate policy when moderation access settings are saved unchanged", async ({ page }) => {
    const communityId = "cmt_e2e_mod_or_roundtrip";
    const expectedPolicy = gatePolicy({
      mode: "or",
      atoms: [
        { type: "unique_human", provider: "very" },
        { type: "altcha_pow" },
      ],
    });
    const state = await installGateCommunityFixture(page, {
      communityId,
      gatePolicy: expectedPolicy,
      gates: [veryGate, powGate],
      initialEligibility: createMockJoinEligibility({
        community: communityId,
        membership_gate_summaries: [veryGate, powGate],
        membership_mode: "gated",
        status: "already_joined",
      }),
      owner: true,
    });

    await page.goto(`/c/${communityId}/mod/gates`);
    await expect(page.getByRole("heading", { name: /access and gates/i })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("checkbox", { name: /palm scan \(very\)/i })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("checkbox", { name: /proof-of-work check/i })).toHaveAttribute("aria-checked", "true");

    const saveFooter = page.locator(".community-moderation-save-footer");
    await saveFooter.getByRole("button", { name: /^save$/i }).click();

    await expect.poll(() => state.gateUpdateBodies.length).toBe(1);
    expect(state.gateUpdateBodies[0]?.gate_policy).toEqual(expectedPolicy);
    await expectNoBrowserError(page);
  });
});
