import { expect, test, type Page, type Route } from "@playwright/test";

import {
  createMockHomeFeedItem,
  createMockPostResponse,
  createMockStoredSession,
  mockCommunityPreview,
  mockFeedPostId,
  mockJoinEligibility,
  mockProfile,
  mockUser,
} from "./fixtures/auth-session";
import { expectNoBrowserError } from "./fixtures/e2e-helpers";
import { installStoredSession } from "./fixtures/session";

const pirateApiPattern = /https?:\/\/(?:api-staging\.pirate\.sc|api\.pirate\.sc|127\.0\.0\.1:8787)\/.*/u;

const crosspostTargetCommunityId = "cmt_e2e";
const unjoinedCommunityId = "cmt_e2e_unjoined";
const crosspostCreatedPostId = "pst_e2e_crosspost_created";

function jsonResponse(body: unknown, status = 200) {
  return {
    body: JSON.stringify(body),
    contentType: "application/json",
    status,
  };
}

const sourcePostId = mockFeedPostId;

const sourcePostResponse = createMockPostResponse({
  id: sourcePostId,
  title: "E2E crosspost source",
  body: "Deterministic source post for crosspost E2E flow.",
  upvoteCount: 8,
  commentCount: 4,
});

const feedItems = [
  createMockHomeFeedItem({
    id: sourcePostId,
    title: "E2E crosspost source",
    upvoteCount: 8,
    commentCount: 4,
  }),
];

let capturedCreatePostBody: Record<string, unknown> | null = null;
let capturedCreatePostAltchaHeader: string | null = null;
let crosspostTargetMembershipGateSummaries: Array<{ gate_type: string }> = [];

async function fulfillCrosspostApiRoute(route: Route): Promise<void> {
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

  if (method === "GET" && path === "/onboarding/status") {
    await route.fulfill(jsonResponse({
      cleanup_rename_available: false,
      community_creation_ready: true,
      generated_handle_assigned: false,
      missing_requirements: [],
      reddit_import_status: "succeeded",
      unique_human_verification_status: "verified",
    }));
    return;
  }

  if (method === "GET" && (path === "/feed/home" || path === "/feed/home/public")) {
    await route.fulfill(jsonResponse({ items: feedItems, top_communities: [] }));
    return;
  }

  if (method === "GET" && path === "/public-posts/" + encodeURIComponent(sourcePostId)) {
    await route.fulfill(jsonResponse(sourcePostResponse));
    return;
  }

  if (method === "GET" && path === "/public-communities/" + encodeURIComponent(crosspostTargetCommunityId)) {
    await route.fulfill(jsonResponse({
      ...mockCommunityPreview,
      membership_gate_summaries: crosspostTargetMembershipGateSummaries,
      object: "community_preview",
    }));
    return;
  }

  if (method === "GET" && path === "/communities/" + encodeURIComponent(crosspostTargetCommunityId) + "/preview") {
    await route.fulfill(jsonResponse({
      ...mockCommunityPreview,
      membership_gate_summaries: crosspostTargetMembershipGateSummaries,
      object: "community_preview",
    }));
    return;
  }

  if (method === "GET" && path === "/communities/" + encodeURIComponent(crosspostTargetCommunityId) + "/join-eligibility") {
    await route.fulfill(jsonResponse(mockJoinEligibility));
    return;
  }

  if (method === "GET" && path === "/communities/" + encodeURIComponent(unjoinedCommunityId) + "/join-eligibility") {
    await route.fulfill(jsonResponse({
      community: unjoinedCommunityId,
      membership_mode: "open",
      human_verification_lane: "very",
      joinable_now: true,
      status: "joinable",
      membership_gate_summaries: [],
      missing_capabilities: [],
      suggested_verification_provider: null,
      suggested_verification_intent: null,
      failure_reason: null,
      wallet_score_status: null,
      gate_evaluation: null,
    }));
    return;
  }

  if (method === "GET" && path === "/public-communities") {
    await route.fulfill(jsonResponse({
      communities: [
        {
          community: crosspostTargetCommunityId,
          display_name: "E2E Community",
          route_slug: "e2e",
          avatar_ref: null,
          member_count: 1,
          follower_count: 1,
        },
        {
          community: unjoinedCommunityId,
          display_name: "E2E Unjoined",
          route_slug: "unjoined",
          avatar_ref: null,
          member_count: 50,
          follower_count: 30,
        },
      ],
    }));
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

  if (method === "GET" && path === "/notifications/summary") {
    await route.fulfill(jsonResponse({
      has_unread: false,
      open_task_count: 0,
      unread_activity_count: 0,
    }));
    return;
  }

  if (method === "GET" && (path === "/notifications/tasks" || path === "/notifications/feed")) {
    await route.fulfill(jsonResponse({ items: [], next_cursor: null }));
    return;
  }

  if (method === "GET" && path === "/agents") {
    await route.fulfill(jsonResponse({ items: [] }));
    return;
  }

  if (
    method === "POST"
    && path === "/communities/" + encodeURIComponent(crosspostTargetCommunityId) + "/posts"
  ) {
    capturedCreatePostBody = request.postDataJSON() as Record<string, unknown>;
    capturedCreatePostAltchaHeader = request.headers()["x-pirate-altcha"] ?? null;
    await route.fulfill(jsonResponse({
      ...sourcePostResponse.post,
      id: crosspostCreatedPostId,
      post: crosspostCreatedPostId,
      post_type: "crosspost",
      title: (capturedCreatePostBody?.title as string) ?? "E2E crosspost",
    }));
    return;
  }

  if (method === "GET" && path === "/posts/" + encodeURIComponent(sourcePostId)) {
    await route.fulfill(jsonResponse(sourcePostResponse));
    return;
  }

  await route.fulfill(jsonResponse({
    code: "e2e_unhandled_api_route",
    message: `Unhandled crosspost E2E fixture for ${method} ${path}`,
  }, 501));
}

async function installCrosspostFixture(page: Page): Promise<void> {
  await page.route(pirateApiPattern, fulfillCrosspostApiRoute);

  const session = createMockStoredSession();
  await installStoredSession(page, session);

  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, value);
  }, {
    key: "pirate_known_communities",
    value: JSON.stringify([
      {
        communityId: crosspostTargetCommunityId,
        displayName: "E2E Community",
        routeSlug: "e2e",
        avatarSrc: null,
        updatedAt: new Date().toISOString(),
      },
      {
        communityId: unjoinedCommunityId,
        displayName: "E2E Unjoined",
        routeSlug: "unjoined",
        avatarSrc: null,
        updatedAt: new Date().toISOString(),
      },
    ]),
  });
}

test.describe("authenticated crosspost flow with mocked API", () => {
  test.beforeEach(async ({ page }) => {
    capturedCreatePostBody = null;
    capturedCreatePostAltchaHeader = null;
    crosspostTargetMembershipGateSummaries = [];
    await installCrosspostFixture(page);
  });

  test("renders Crosspost action on eligible feed posts and opens the form", async ({ page }) => {
    await page.goto("/");

    const post = page.locator("article").filter({ hasText: "E2E crosspost source" });
    await expect(post).toBeVisible({ timeout: 30_000 });

    const shareButton = post.getByRole("button", { name: /^share$/i });
    await expect(shareButton).toBeVisible();
    await shareButton.click();

    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();

    const menuItems = menu.getByRole("menuitem");
    const labels = await menuItems.allInnerTexts();
    expect(labels[0]).toMatch(/^crosspost$/i);
    expect(labels[1]).toMatch(/^copy link$/i);

    await menuItems.first().click();
    await expect(page).toHaveURL(new RegExp("/p/" + sourcePostId + "/crosspost$", "u"));

    await expectNoBrowserError(page);
  });

  test("crosspost form submits and navigates to created post", async ({ page }) => {
    await page.goto("/p/" + sourcePostId + "/crosspost");

    await expect(page.locator("body")).toContainText("E2E crosspost source", { timeout: 30_000 });
    await expect(page.locator("body")).toContainText("c/E2E Community");

    const communityPicker = page.getByRole("button", { name: /choose community/i });
    await expect(communityPicker).toBeVisible();
    await expect(communityPicker).toContainText("E2E Community");

    const titleInput = page.getByRole("textbox", { name: /title/i });
    await expect(titleInput).toBeVisible();
    await titleInput.fill("E2E crosspost title");

    const submitButton = page.getByRole("button", { name: /^crosspost$/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    await expect(page).toHaveURL(new RegExp("/p/" + crosspostCreatedPostId + "$", "u"), { timeout: 10_000 });

    expect(capturedCreatePostBody).toBeTruthy();
    expect(capturedCreatePostBody!.post_type).toBe("crosspost");
    expect(capturedCreatePostBody!.source_post).toBe(sourcePostId);
    expect(capturedCreatePostBody!.source_community).toBe(crosspostTargetCommunityId);
    expect(capturedCreatePostBody!.title).toBe("E2E crosspost title");
    expect(capturedCreatePostAltchaHeader).toBeNull();

    await expectNoBrowserError(page);
  });

  test("crosspost form completes post proof-of-work for gated communities", async ({ page }) => {
    crosspostTargetMembershipGateSummaries = [{ gate_type: "altcha_pow" }];

    await page.goto("/p/" + sourcePostId + "/crosspost");

    await expect(page.locator("body")).toContainText("E2E crosspost source", { timeout: 30_000 });

    const titleInput = page.getByRole("textbox", { name: /title/i });
    await expect(titleInput).toBeVisible();
    await titleInput.fill("E2E gated crosspost title");

    const submitButton = page.getByRole("button", { name: /^crosspost$/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    const dialog = page.getByRole("dialog", { name: /checking browser/i });
    await expect(dialog).toBeVisible();

    const widget = page.locator("altcha-widget");
    await widget.waitFor({ state: "attached" });
    await widget.evaluate((element) => {
      element.dispatchEvent(new CustomEvent("verified", {
        bubbles: true,
        detail: { payload: "e2e-post-proof" },
      }));
      element.dispatchEvent(new CustomEvent("statechange", {
        bubbles: true,
        detail: { payload: "e2e-post-proof", state: "verified" },
      }));
    });

    await expect(dialog).toContainText("Proof-of-work complete");
    const continueButton = dialog.getByRole("button", { name: /^continue$/i });
    await expect(continueButton).toBeEnabled();
    await continueButton.click();

    await expect(page).toHaveURL(new RegExp("/p/" + crosspostCreatedPostId + "$", "u"), { timeout: 10_000 });

    expect(capturedCreatePostBody).toBeTruthy();
    expect(capturedCreatePostBody!.post_type).toBe("crosspost");
    expect(capturedCreatePostBody!.title).toBe("E2E gated crosspost title");
    expect(capturedCreatePostAltchaHeader).toBe("e2e-post-proof");

    await expectNoBrowserError(page);
  });
});
