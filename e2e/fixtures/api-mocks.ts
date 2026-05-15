import type { Page, Route } from "@playwright/test";

import {
  createMockCommentListItem,
  createMockStoredSession,
  createMockHomeFeedItem,
  createMockPostResponse,
  mockCommentBody,
  mockCommunityId,
  mockCommunityPreview,
  mockCreatedPostId,
  mockFeedPostId,
  mockJoinEligibility,
  mockOnboarding,
  mockProfile,
  mockUser,
} from "./auth-session";
import { installStoredSession } from "./session";

const pirateApiPattern = /https?:\/\/(?:api-staging\.pirate\.sc|api\.pirate\.sc|127\.0\.0\.1:8787)\/.*/u;

function jsonResponse(body: unknown, status = 200) {
  return {
    body: JSON.stringify(body),
    contentType: "application/json",
    status,
  };
}

function emptyCursorList() {
  return { items: [], next_cursor: null };
}

function createHomeFeedItems(sort: string | null, timeRange: string | null) {
  const newest = createMockHomeFeedItem({
    commentCount: 0,
    created: Date.parse("2026-05-03T00:00:00.000Z"),
    downvoteCount: 0,
    id: "pst_e2e_newest",
    title: "E2E newest post",
    upvoteCount: 0,
  });
  const top = createMockHomeFeedItem({
    commentCount: 4,
    created: Date.parse("2026-05-01T00:00:00.000Z"),
    downvoteCount: 0,
    id: mockFeedPostId,
    title: "E2E feed post",
    upvoteCount: 8,
  });
  const middle = createMockHomeFeedItem({
    commentCount: 1,
    created: Date.parse("2026-05-02T00:00:00.000Z"),
    downvoteCount: 0,
    id: "pst_e2e_middle",
    title: "E2E middle post",
    upvoteCount: 1,
  });

  if (sort === "new") return [newest, middle, top];
  if (sort === "top" && timeRange === "all") return [top, middle, newest];
  return [top, middle, newest];
}

async function fulfillPirateApiRoute(route: Route, state: { commentCreated: boolean }): Promise<void> {
  const request = route.request();
  const url = new URL(request.url());
  const method = request.method().toUpperCase();
  const path = url.pathname;

  if (method === "GET" && path === "/users/me") {
    await route.fulfill(jsonResponse(mockUser));
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

  if (method === "POST" && path === "/profiles/me") {
    const body = request.postDataJSON() as { bio?: string; display_name?: string; preferred_locale?: string } | null;
    await route.fulfill(jsonResponse({
      ...mockProfile,
      bio: body?.bio ?? mockProfile.bio,
      display_name: body?.display_name ?? mockProfile.display_name,
      preferred_locale: body?.preferred_locale ?? mockProfile.preferred_locale,
    }));
    return;
  }

  if (method === "GET" && path === "/onboarding/status") {
    await route.fulfill(jsonResponse(mockOnboarding));
    return;
  }

  if (method === "GET" && (path === "/feed/home" || path === "/feed/home/public")) {
    await route.fulfill(jsonResponse({
      items: createHomeFeedItems(url.searchParams.get("sort"), url.searchParams.get("time_range")),
      top_communities: [],
    }));
    return;
  }

  if (method === "GET" && path === `/profiles/${encodeURIComponent(mockUser.id)}`) {
    await route.fulfill(jsonResponse(mockProfile));
    return;
  }

  if (method === "POST" && path === `/posts/${encodeURIComponent(mockFeedPostId)}/vote`) {
    await route.fulfill(jsonResponse({ post: mockFeedPostId, value: 1 }));
    return;
  }

  if (method === "GET" && path === `/posts/${encodeURIComponent(mockFeedPostId)}`) {
    await route.fulfill(jsonResponse(createMockPostResponse()));
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

  if (method === "POST" && path === "/notifications/mark-read") {
    await route.fulfill(jsonResponse({ ok: true }));
    return;
  }

  if (method === "GET" && path === "/agents") {
    await route.fulfill(jsonResponse({ items: [] }));
    return;
  }

  if (
    method === "GET"
    && (
      path === `/communities/${encodeURIComponent(mockCommunityId)}`
      || path === `/communities/${encodeURIComponent(mockCommunityId)}/preview`
    )
  ) {
    await route.fulfill(jsonResponse({
      ...mockCommunityPreview,
      object: path.endsWith("/preview") ? "community_preview" : "community",
      created_by_user: "usr_owner",
      gate_rules: [],
      governance_mode: "centralized",
    }));
    return;
  }

  if (method === "GET" && path === `/communities/${encodeURIComponent(mockCommunityId)}/join-eligibility`) {
    await route.fulfill(jsonResponse(mockJoinEligibility));
    return;
  }

  if (method === "GET" && path === `/communities/${encodeURIComponent(mockCommunityId)}/pricing-policy`) {
    await route.fulfill(jsonResponse({
      id: "cpp_e2e",
      object: "community_pricing_policy",
      policy_origin: "community",
      pricing_policy_version: "v1",
      regional_pricing_enabled: false,
      verification_provider_requirement: null,
      default_tier_key: null,
      tiers: [],
      country_assignments: [],
      source_template: null,
      source_template_version: null,
    }));
    return;
  }

  if (method === "GET" && path === `/communities/${encodeURIComponent(mockCommunityId)}/derivative-sources`) {
    await route.fulfill(jsonResponse(emptyCursorList()));
    return;
  }

  if (method === "POST" && path === `/communities/${encodeURIComponent(mockCommunityId)}/posts`) {
    const body = request.postDataJSON() as { body?: string; title?: string } | null;
    await route.fulfill(jsonResponse({
      ...createMockPostResponse({
        body: body?.body ?? null,
        id: mockCreatedPostId,
        title: body?.title ?? "Created E2E post",
      }).post,
      id: mockCreatedPostId,
      post: mockCreatedPostId,
    }));
    return;
  }

  if (method === "GET" && path === `/communities/${encodeURIComponent(mockCommunityId)}/posts/${encodeURIComponent(mockFeedPostId)}/comments`) {
    await route.fulfill(jsonResponse({
      items: state.commentCreated ? [createMockCommentListItem({ body: mockCommentBody })] : [],
      next_cursor: null,
    }));
    return;
  }

  if (method === "POST" && path === `/communities/${encodeURIComponent(mockCommunityId)}/posts/${encodeURIComponent(mockFeedPostId)}/comments`) {
    state.commentCreated = true;
    await route.fulfill({ status: 204 });
    return;
  }

  if (method === "GET" && path === "/onboarding/reddit-imports/latest") {
    await route.fulfill(jsonResponse({
      coverage_note: null,
      imported_reddit_score: null,
      reddit_username: "e2etest",
    }));
    return;
  }

  await route.fulfill(jsonResponse({
    code: "e2e_unhandled_api_route",
    message: `Unhandled E2E API fixture for ${method} ${path}`,
  }, 501));
}

export async function installMockSession(page: Page): Promise<void> {
  const session = createMockStoredSession();
  await installStoredSession(page, session);
}

export async function installAuthenticatedApiMocks(page: Page): Promise<void> {
  const state = { commentCreated: false };
  await page.route(pirateApiPattern, (route) => fulfillPirateApiRoute(route, state));
}
