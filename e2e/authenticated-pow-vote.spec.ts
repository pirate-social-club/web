import { expect, test, type Page, type Route } from "@playwright/test";

import {
  installAuthenticatedApiMocks,
  installMockSession,
} from "./fixtures/api-mocks";
import { createSolvableAltchaChallenge } from "./fixtures/altcha-challenge";
import { expectNoBrowserError } from "./fixtures/e2e-helpers";
import {
  createMockPostResponse,
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

async function fulfillPowVoteRoute(
  route: Route,
  captures: { challengeUrls: URL[]; voteRequests: VoteRequest[] },
): Promise<void> {
  const request = route.request();
  const url = new URL(request.url());
  const method = request.method().toUpperCase();
  const path = url.pathname;

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

  if (method === "GET" && path === "/verification/altcha/challenge") {
    captures.challengeUrls.push(url);
    await route.fulfill(jsonResponse(await createSolvableAltchaChallenge({
      action: url.searchParams.get("action") ?? "",
      scope: url.searchParams.get("scope") ?? "",
    })));
    return;
  }

  if (method === "POST" && path === `/posts/${encodeURIComponent(mockFeedPostId)}/vote`) {
    captures.voteRequests.push({
      body: request.postDataJSON(),
      altchaHeader: request.headers()["x-pirate-altcha"] ?? null,
    });
    await route.fulfill(jsonResponse({ post: mockFeedPostId, value: 1 }));
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
  test("submits a post permalink upvote with a headless proof, no modal", async ({ page }) => {
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

    // Proof-of-work is computation, not user input: it is solved in the
    // background and the vote lands without any browser-check dialog.
    await expect.poll(() => captures.voteRequests.length).toBe(1);
    await expect(score).toHaveText("9");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("altcha-widget")).toHaveCount(0);

    expect(captures.challengeUrls).toHaveLength(1);
    expect(captures.challengeUrls[0]?.pathname).toBe("/verification/altcha/challenge");
    expect(captures.challengeUrls[0]?.searchParams.get("scope")).toBe("vote");
    expect(captures.challengeUrls[0]?.searchParams.get("action")).toBe(`post:${mockFeedPostId}:1`);

    expect(captures.voteRequests[0]?.body).toEqual({ value: 1 });
    // The solved payload is a base64 challenge+solution envelope.
    const header = captures.voteRequests[0]?.altchaHeader ?? "";
    expect(header.length).toBeGreaterThan(0);
    const decoded = JSON.parse(atob(header)) as { challenge?: unknown; solution?: unknown };
    expect(decoded.challenge).toBeTruthy();
    expect(decoded.solution).toBeTruthy();

    await expectNoBrowserError(page);
  });
});
