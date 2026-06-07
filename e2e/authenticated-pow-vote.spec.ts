import { expect, test, type Page, type Route } from "@playwright/test";

import {
  installAuthenticatedApiMocks,
  installMockSession,
} from "./fixtures/api-mocks";
import { expectNoBrowserError } from "./fixtures/e2e-helpers";
import {
  createMockCommentListItem,
  createMockHomeFeedItem,
  createMockPostResponse,
  mockCommentBody,
  mockCommentId,
  mockCommunityId,
  mockCommunityPreview,
  mockFeedPostId,
  mockJoinEligibility,
} from "./fixtures/auth-session";

const pirateApiPattern = /https?:\/\/(?:api-staging\.pirate\.sc|api\.pirate\.sc|127\.0\.0\.1:8787)\/.*/u;
const altchaGate = { gate_type: "altcha_pow" } as const;

type VoteRequest = {
  body: unknown;
  altchaHeader: string | null;
  target: "comment" | "post";
};

function jsonResponse(body: unknown, status = 200) {
  return {
    body: JSON.stringify(body),
    contentType: "application/json",
    status,
  };
}

function gatedCommunityPreview() {
  return {
    ...mockCommunityPreview,
    membership_mode: "gated",
    membership_gate_summaries: [altchaGate],
    viewer_membership_status: "member",
    viewer_community_role: null,
  };
}

function gatedJoinEligibility() {
  return {
    ...mockJoinEligibility,
    membership_mode: "gated",
    status: "already_joined",
    membership_gate_summaries: [altchaGate],
    gate_evaluation: {
      mode: "all",
      groups: [{
        mode: "all",
        result: "failed",
        conditions: [{
          gate_type: "altcha_pow",
          capability: "altcha_pow",
          provider: "altcha",
          scope: "vote",
          status: "missing",
        }],
      }],
    },
    missing_capabilities: ["altcha_pow"],
  };
}

function gatedPostResponse(input?: { upvoteCount?: number; viewerVote?: -1 | 1 | null }) {
  return {
    ...createMockPostResponse({
      id: mockFeedPostId,
      title: "E2E feed post",
      upvoteCount: input?.upvoteCount ?? 8,
      downvoteCount: 0,
      viewerVote: input?.viewerVote ?? null,
    }),
    community: gatedCommunityPreview(),
  };
}

function gatedHomeFeedItem() {
  const item = createMockHomeFeedItem({
    id: mockFeedPostId,
    title: "E2E feed post",
    upvoteCount: 8,
    downvoteCount: 0,
    viewerVote: null,
  });
  return {
    ...item,
    community: {
      ...item.community,
      membership_gate_summaries: [altchaGate],
      viewer_community_role: null,
      viewer_membership_status: "member",
    },
    post: {
      ...item.post,
      community: gatedCommunityPreview(),
    },
  };
}

function gatedCommentListItem() {
  const item = createMockCommentListItem({ body: mockCommentBody });
  return {
    ...item,
    comment: {
      ...item.comment,
      score: 0,
    },
    viewer_vote: null,
  };
}

async function fulfillPowVoteRoute(
  route: Route,
  captures: { challengeUrls: URL[]; voteRequests: VoteRequest[] },
): Promise<void> {
  const request = route.request();
  const url = new URL(request.url());
  const method = request.method().toUpperCase();
  const path = url.pathname;

  if (method === "GET" && (path === "/feed/home" || path === "/feed/home/public")) {
    await route.fulfill(jsonResponse({
      items: [gatedHomeFeedItem()],
      top_communities: [],
    }));
    return;
  }

  if (method === "GET" && path === `/posts/${encodeURIComponent(mockFeedPostId)}`) {
    await route.fulfill(jsonResponse(gatedPostResponse()));
    return;
  }

  if (
    method === "GET"
    && (
      path === `/communities/${encodeURIComponent(mockCommunityId)}`
      || path === `/communities/${encodeURIComponent(mockCommunityId)}/preview`
    )
  ) {
    await route.fulfill(jsonResponse(gatedCommunityPreview()));
    return;
  }

  if (method === "GET" && path === `/communities/${encodeURIComponent(mockCommunityId)}/join-eligibility`) {
    await route.fulfill(jsonResponse(gatedJoinEligibility()));
    return;
  }

  if (method === "GET" && path === `/communities/${encodeURIComponent(mockCommunityId)}/posts/${encodeURIComponent(mockFeedPostId)}/comments`) {
    await route.fulfill(jsonResponse({
      items: [gatedCommentListItem()],
      next_cursor: null,
    }));
    return;
  }

  if (method === "GET" && path === "/verification/altcha/challenge") {
    captures.challengeUrls.push(url);
    await route.fulfill(jsonResponse({
      algorithm: "SHA-256",
      challenge: "deadbeef",
      maxnumber: 100000,
      salt: "00",
      signature: "00",
    }));
    return;
  }

  if (method === "POST" && path === `/posts/${encodeURIComponent(mockFeedPostId)}/vote`) {
    captures.voteRequests.push({
      body: request.postDataJSON(),
      altchaHeader: request.headers()["x-pirate-altcha"] ?? null,
      target: "post",
    });
    await route.fulfill(jsonResponse({ post: mockFeedPostId, value: 1 }));
    return;
  }

  if (method === "POST" && path === `/comments/${encodeURIComponent(mockCommentId)}/vote`) {
    captures.voteRequests.push({
      body: request.postDataJSON(),
      altchaHeader: request.headers()["x-pirate-altcha"] ?? null,
      target: "comment",
    });
    await route.fulfill(jsonResponse({ comment: mockCommentId, value: 1 }));
    return;
  }

  await route.fallback();
}

async function installPowVoteFixture(
  page: Page,
  captures: { challengeUrls: URL[]; voteRequests: VoteRequest[] },
): Promise<void> {
  await installAuthenticatedApiMocks(page);
  await page.route(pirateApiPattern, (route) => fulfillPowVoteRoute(route, captures));
  await installMockSession(page);
}

test.describe("proof-of-work vote gate", () => {
  test("auto-submits a home feed upvote after ALTCHA verification", async ({ page }) => {
    const captures = {
      challengeUrls: [] as URL[],
      voteRequests: [] as VoteRequest[],
    };
    await installPowVoteFixture(page, captures);

    await page.goto("/");

    const post = page.locator("article").filter({ hasText: "E2E feed post" });
    await expect(post).toBeVisible({ timeout: 30_000 });

    const upvoteButton = post.getByRole("button", { name: /^upvote$/i });
    const score = post.locator("button[aria-label='Upvote'] + span").first();
    await expect(score).toHaveText("8");

    await upvoteButton.click();

    expect(captures.voteRequests).toHaveLength(0);
    await expect(score).toHaveText("8");

    const dialog = page.getByRole("dialog", { name: /browser check required/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: /^continue$/i })).toHaveCount(0);

    const widget = page.locator("altcha-widget");
    await widget.waitFor({ state: "attached" });

    expect(captures.challengeUrls).toHaveLength(1);
    expect(captures.challengeUrls[0]?.pathname).toBe("/verification/altcha/challenge");
    expect(captures.challengeUrls[0]?.searchParams.get("scope")).toBe("vote");
    expect(captures.challengeUrls[0]?.searchParams.get("action")).toBe(`post:${mockFeedPostId}:1`);

    await widget.evaluate((element) => {
      element.dispatchEvent(new CustomEvent("verified", {
        bubbles: true,
        detail: { payload: "e2e-home-vote-proof" },
      }));
    });

    await expect.poll(() => captures.voteRequests.length).toBe(1);
    expect(captures.voteRequests[0]).toEqual({
      body: { value: 1 },
      altchaHeader: "e2e-home-vote-proof",
      target: "post",
    });
    await expect(dialog).toBeHidden();
    await expect(score).toHaveText("9");

    await expectNoBrowserError(page);
  });

  test("auto-submits a post permalink upvote after ALTCHA verification", async ({ page }) => {
    const captures = {
      challengeUrls: [] as URL[],
      voteRequests: [] as VoteRequest[],
    };
    await installPowVoteFixture(page, captures);

    await page.goto(`/p/${mockFeedPostId}`);

    const post = page.locator("article").filter({ hasText: "E2E feed post" });
    await expect(post).toBeVisible({ timeout: 30_000 });

    const upvoteButton = post.getByRole("button", { name: /^upvote$/i });
    const score = post.locator("button[aria-label='Upvote'] + span").first();
    await expect(score).toHaveText("8");

    await upvoteButton.click();

    expect(captures.voteRequests).toHaveLength(0);
    await expect(score).toHaveText("8");

    const dialog = page.getByRole("dialog", { name: /browser check required/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: /^continue$/i })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: /^(submit|post|publish)$/i })).toHaveCount(0);
    await expect(dialog.locator("[class*='grid-cols-2']")).toHaveCount(0);

    const widget = page.locator("altcha-widget");
    await widget.waitFor({ state: "attached" });

    expect(captures.challengeUrls).toHaveLength(1);
    expect(captures.challengeUrls[0]?.pathname).toBe("/verification/altcha/challenge");
    expect(captures.challengeUrls[0]?.searchParams.get("scope")).toBe("vote");
    expect(captures.challengeUrls[0]?.searchParams.get("action")).toBe(`post:${mockFeedPostId}:1`);

    await widget.evaluate((element) => {
      element.dispatchEvent(new CustomEvent("verified", {
        bubbles: true,
        detail: { payload: "e2e-vote-proof" },
      }));
    });

    await expect.poll(() => captures.voteRequests.length).toBe(1);
    expect(captures.voteRequests[0]).toEqual({
      body: { value: 1 },
      altchaHeader: "e2e-vote-proof",
      target: "post",
    });
    await expect(dialog).toBeHidden();
    await expect(score).toHaveText("9");

    await expectNoBrowserError(page);
  });

  test("auto-submits a permalink comment upvote after ALTCHA verification", async ({ page }) => {
    const captures = {
      challengeUrls: [] as URL[],
      voteRequests: [] as VoteRequest[],
    };
    await installPowVoteFixture(page, captures);

    await page.goto(`/p/${mockFeedPostId}`);

    const comment = page.locator("article").filter({ hasText: mockCommentBody });
    await expect(comment).toBeVisible({ timeout: 30_000 });

    const upvoteButton = comment.getByRole("button", { name: /^upvote comment$/i });
    const score = comment.locator("button[aria-label='Upvote comment'] + span").first();
    await expect(score).toHaveText("0");

    await upvoteButton.click();

    expect(captures.voteRequests).toHaveLength(0);
    await expect(score).toHaveText("0");

    const dialog = page.getByRole("dialog", { name: /browser check required/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: /^continue$/i })).toHaveCount(0);
    await expect(dialog.locator("[class*='grid-cols-2']")).toHaveCount(0);

    const widget = page.locator("altcha-widget");
    await widget.waitFor({ state: "attached" });

    expect(captures.challengeUrls).toHaveLength(1);
    expect(captures.challengeUrls[0]?.pathname).toBe("/verification/altcha/challenge");
    expect(captures.challengeUrls[0]?.searchParams.get("scope")).toBe("vote");
    expect(captures.challengeUrls[0]?.searchParams.get("action")).toBe(`comment:${mockCommentId}:1`);

    await widget.evaluate((element) => {
      element.dispatchEvent(new CustomEvent("verified", {
        bubbles: true,
        detail: { payload: "e2e-comment-vote-proof" },
      }));
    });

    await expect.poll(() => captures.voteRequests.length).toBe(1);
    expect(captures.voteRequests[0]).toEqual({
      body: { value: 1 },
      altchaHeader: "e2e-comment-vote-proof",
      target: "comment",
    });
    await expect(dialog).toBeHidden();
    await expect(score).toHaveText("1");

    await expectNoBrowserError(page);
  });
});
