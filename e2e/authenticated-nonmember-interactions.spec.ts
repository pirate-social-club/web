import { expect, test, type Page, type Route } from "@playwright/test";

import {
  installAuthenticatedApiMocks,
  installMockSession,
} from "./fixtures/api-mocks";
import { createSolvableAltchaChallenge } from "./fixtures/altcha-challenge";
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
      await route.fulfill(jsonResponse(await createSolvableAltchaChallenge({
        action: url.searchParams.get("action") ?? "",
        scope: url.searchParams.get("scope") ?? "",
      })));
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

test.describe("mobile non-member gated interactions", () => {
  test.use({ viewport: { height: 844, width: 390 } });

  test("votes in a PoW-only community without joining, using an action-bound proof", async ({ page }) => {
    const captures: Captures = { challengeUrls: [], commentPosts: 0, joins: 0, votePosts: 0 };
    await installNonMemberFixture(page, captures);
    await page.goto(`/p/${mockFeedPostId}`);

    // PoW-only gate: the vote control is offered directly, no join CTA.
    const upvote = page.getByRole("button", { name: /^upvote$/i });
    await expect(upvote).toBeVisible();
    await expect(page.getByRole("button", { name: "Join to vote" })).toHaveCount(0);

    await upvote.click();
    // The proof is solved headlessly, so the vote lands without any modal.
    await expect.poll(() => captures.votePosts).toBe(1);
    expect(captures.challengeUrls).toHaveLength(1);
    expect(captures.challengeUrls[0]?.searchParams.get("scope")).toBe("vote");
    expect(captures.joins).toBe(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expectNoBrowserError(page);
  });

  test("comments on a public thread without joining first", async ({ page }) => {
    const captures: Captures = { challengeUrls: [], commentPosts: 0, joins: 0, votePosts: 0 };
    await installNonMemberFixture(page, captures);
    await page.goto(`/p/${mockFeedPostId}`);

    const reply = page.getByRole("textbox", { name: /^reply$/i });
    await expect(reply).toBeEnabled();
    await expect(page.getByRole("button", { name: "Join to comment" })).toHaveCount(0);
    await reply.click();
    await page.getByRole("textbox", { name: "Write a reply", exact: true }).fill("Commenting without joining");
    await page.getByRole("button", { name: "Post", exact: true }).click();
    // Headless proof: the reply posts without a browser-check modal.
    await expect.poll(() => captures.commentPosts).toBe(1);
    expect(captures.challengeUrls).toHaveLength(1);
    expect(captures.challengeUrls[0]?.searchParams.get("scope")).toBe("comment_create");
    expect(captures.joins).toBe(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expectNoBrowserError(page);
  });

  test("keeps public-thread commenting available while membership is unknown", async ({ page }) => {
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
    await expect(reply).toBeEnabled();
    await expect(reply).toHaveAttribute("placeholder", "Write a reply");
    await expect(voteAccess).toBeVisible();
    await expect(voteAccess).toBeDisabled();
    expect(commentPosts).toBe(0);
    await expectNoBrowserError(page);
  });
});
