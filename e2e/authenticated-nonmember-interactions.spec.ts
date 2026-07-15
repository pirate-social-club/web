import { expect, test, type Page, type Route } from "@playwright/test";

import {
  installAuthenticatedApiMocks,
  installMockSession,
} from "./fixtures/api-mocks";
import {
  createMockPostResponse,
  mockCommunityId,
  mockCommunityPreview,
  mockFeedPostId,
  mockJoinEligibility,
} from "./fixtures/auth-session";
import { expectNoBrowserError } from "./fixtures/e2e-helpers";

const pirateApiPattern = /https?:\/\/(?:api-staging\.pirate\.sc|api\.pirate\.sc|127\.0\.0\.1:8787)\/.*/u;
const altchaGate = { gate_type: "altcha_pow" } as const;

type Captures = {
  challengeUrls: URL[];
  commentPosts: number;
  joins: number;
  votePosts: number;
};

function jsonResponse(body: unknown, status = 200) {
  return {
    body: JSON.stringify(body),
    contentType: "application/json",
    status,
  };
}

function communityPreview(joined: boolean) {
  return {
    ...mockCommunityPreview,
    membership_mode: "gated",
    membership_gate_summaries: [altchaGate],
    viewer_community_role: null,
    viewer_membership_status: joined ? "member" : "not_member",
  };
}

function joinEligibility(joined: boolean) {
  if (joined) {
    return {
      ...mockJoinEligibility,
      membership_mode: "gated",
      membership_gate_summaries: [],
      status: "already_joined",
    };
  }
  return {
    ...mockJoinEligibility,
    gate_evaluation: {
      passed: false,
      required_action_set: {
        items: [{
          capability: "altcha_pow",
          kind: "action",
          provider: "altcha",
          scope: "community_join",
        }],
        kind: "set",
        mode: "all",
      },
      trace: null,
    },
    joinable_now: false,
    membership_gate_summaries: [altchaGate],
    membership_mode: "gated",
    missing_capabilities: ["altcha_pow"],
    status: "verification_required",
  };
}

async function installNonMemberFixture(page: Page, captures: Captures): Promise<void> {
  let joined = false;
  await installAuthenticatedApiMocks(page);
  await page.route(pirateApiPattern, async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method().toUpperCase();
    const path = url.pathname;

    if (method === "GET" && path === `/posts/${encodeURIComponent(mockFeedPostId)}`) {
      await route.fulfill(jsonResponse({
        ...createMockPostResponse(),
        community: communityPreview(joined),
      }));
      return;
    }
    if (
      method === "GET"
      && (
        path === `/communities/${encodeURIComponent(mockCommunityId)}`
        || path === `/communities/${encodeURIComponent(mockCommunityId)}/preview`
      )
    ) {
      await route.fulfill(jsonResponse(communityPreview(joined)));
      return;
    }
    if (
      method === "GET"
      && path === `/communities/${encodeURIComponent(mockCommunityId)}/join-eligibility`
    ) {
      await route.fulfill(jsonResponse(joinEligibility(joined)));
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
    if (
      method === "POST"
      && path === `/communities/${encodeURIComponent(mockCommunityId)}/join`
    ) {
      captures.joins += 1;
      joined = true;
      await route.fulfill(jsonResponse({ community: mockCommunityId, status: "joined" }));
      return;
    }
    if (method === "POST" && path === `/posts/${encodeURIComponent(mockFeedPostId)}/vote`) {
      captures.votePosts += 1;
      await route.fulfill(jsonResponse({ post: mockFeedPostId, value: 1 }));
      return;
    }
    if (
      method === "POST"
      && path === `/communities/${encodeURIComponent(mockCommunityId)}/posts/${encodeURIComponent(mockFeedPostId)}/comments`
    ) {
      captures.commentPosts += 1;
      await route.fulfill({ status: 204 });
      return;
    }
    await route.fallback();
  });
  await installMockSession(page);
}

async function solveVisibleAltcha(page: Page, payload: string): Promise<void> {
  const widget = page.locator("altcha-widget");
  await widget.waitFor({ state: "attached" });
  await widget.evaluate((element, nextPayload) => {
    element.dispatchEvent(new CustomEvent("verified", {
      bubbles: true,
      detail: { payload: nextPayload },
    }));
  }, payload);
}

test.describe("mobile non-member gated interactions", () => {
  test.use({ viewport: { height: 844, width: 390 } });

  test("joins before a PoW-gated vote, then requests an action-bound proof", async ({ page }) => {
    const captures: Captures = { challengeUrls: [], commentPosts: 0, joins: 0, votePosts: 0 };
    await installNonMemberFixture(page, captures);
    await page.goto(`/p/${mockFeedPostId}`);

    const joinToVote = page.getByRole("button", { name: "Join to vote" });
    await expect(joinToVote).toBeVisible();
    await expect(page.getByRole("button", { name: /^upvote$/i })).toHaveCount(0);
    await joinToVote.click();
    await expect.poll(() => captures.challengeUrls.length).toBe(1);
    expect(captures.challengeUrls[0]?.searchParams.get("scope")).toBe("community_join");
    expect(captures.votePosts).toBe(0);

    await solveVisibleAltcha(page, "join-proof");
    await page.getByRole("dialog").getByRole("button", { name: /^continue$/i }).click();
    await expect.poll(() => captures.joins).toBe(1);
    await expect(page.getByRole("button", { name: /^upvote$/i })).toBeVisible();
    await page.getByRole("button", { name: /^upvote$/i }).click();
    await expect.poll(() => captures.challengeUrls.length).toBe(2);
    expect(captures.challengeUrls[1]?.searchParams.get("scope")).toBe("vote");
    expect(captures.votePosts).toBe(0);

    await solveVisibleAltcha(page, "vote-proof");
    await expect.poll(() => captures.votePosts).toBe(1);
    await expectNoBrowserError(page);
  });

  test("joins from the comment CTA before exposing the mobile composer", async ({ page }) => {
    const captures: Captures = { challengeUrls: [], commentPosts: 0, joins: 0, votePosts: 0 };
    await installNonMemberFixture(page, captures);
    await page.goto(`/p/${mockFeedPostId}`);

    const joinToComment = page.getByRole("button", { name: "Join to comment" });
    await expect(joinToComment).toBeVisible();
    await expect(page.getByRole("textbox", { name: /^reply$/i })).toHaveCount(0);
    await joinToComment.click();
    await expect.poll(() => captures.challengeUrls.length).toBe(1);
    expect(captures.challengeUrls[0]?.searchParams.get("scope")).toBe("community_join");
    expect(captures.commentPosts).toBe(0);

    await solveVisibleAltcha(page, "join-proof");
    await page.getByRole("dialog").getByRole("button", { name: /^continue$/i }).click();
    await expect.poll(() => captures.joins).toBe(1);
    await expect(page.getByRole("textbox", { name: /^reply$/i })).toBeEnabled();
    expect(captures.challengeUrls).toHaveLength(1);
    expect(captures.commentPosts).toBe(0);

    await page.getByRole("textbox", { name: /^reply$/i }).click();
    await page.getByRole("textbox", { name: "Write a reply", exact: true }).fill("Joined before commenting");
    await page.getByRole("button", { name: /post reply/i }).click();
    await expect.poll(() => captures.challengeUrls.length).toBe(2);
    expect(captures.challengeUrls[1]?.searchParams.get("scope")).toBe("comment_create");
    await solveVisibleAltcha(page, "comment-proof");
    await expect.poll(() => captures.commentPosts).toBe(1);
    await expectNoBrowserError(page);
  });

  test("keeps the composer visible but disabled while membership is unknown", async ({ page }) => {
    let commentPosts = 0;
    await installAuthenticatedApiMocks(page);
    await page.route(pirateApiPattern, async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const method = request.method().toUpperCase();
      const unknownPreview = {
        ...mockCommunityPreview,
        viewer_community_role: null,
        viewer_membership_status: null,
      };
      if (method === "GET" && url.pathname === `/posts/${encodeURIComponent(mockFeedPostId)}`) {
        await route.fulfill(jsonResponse({
          ...createMockPostResponse(),
          community: unknownPreview,
        }));
        return;
      }
      if (
        method === "GET"
        && (
          url.pathname === `/communities/${encodeURIComponent(mockCommunityId)}`
          || url.pathname === `/communities/${encodeURIComponent(mockCommunityId)}/preview`
        )
      ) {
        await route.fulfill(jsonResponse(unknownPreview));
        return;
      }
      if (
        method === "POST"
        && url.pathname === `/communities/${encodeURIComponent(mockCommunityId)}/posts/${encodeURIComponent(mockFeedPostId)}/comments`
      ) {
        commentPosts += 1;
      }
      await route.fallback();
    });
    await installMockSession(page);
    await page.goto(`/p/${mockFeedPostId}`);

    const reply = page.getByRole("textbox", { name: /^reply$/i });
    const voteAccess = page.getByRole("button", { name: "Checking voting access…" });
    await expect(reply).toBeVisible();
    await expect(reply).toBeDisabled();
    await expect(reply).toHaveAttribute("placeholder", "Checking comment access…");
    await expect(voteAccess).toBeVisible();
    await expect(voteAccess).toBeDisabled();
    expect(commentPosts).toBe(0);
    await expectNoBrowserError(page);
  });
});
