import { expect, test, type Page, type Route } from "@playwright/test";

import {
  installAuthenticatedApiMocks,
  installMockSession,
} from "./fixtures/api-mocks";
import { createSolvableAltchaChallenge } from "./fixtures/altcha-challenge";
import {
  createMockHomeFeedItem,
  mockCommunityId,
  mockCommunityPreview,
  mockFeedPostId,
  mockJoinEligibility,
} from "./fixtures/auth-session";

const pirateApiPattern = /https?:\/\/(?:api-staging\.pirate\.sc|api\.pirate\.sc|127\.0\.0\.1:8787)\/.*/u;
const altchaGate = { gate_type: "altcha_pow" } as const;

type Captures = {
  challengeUrls: URL[];
  joins: number;
  voteRequests: Array<{ altchaHeader: string | null; body: unknown }>;
};

function jsonResponse(body: unknown, status = 200) {
  return {
    body: JSON.stringify(body),
    contentType: "application/json",
    status,
  };
}

function videoFeedItem() {
  const item = createMockHomeFeedItem({
    downvoteCount: 0,
    id: mockFeedPostId,
    title: "PoW video",
    upvoteCount: 8,
    viewerVote: null,
  });
  item.post.post.author_user = null;
  item.post.post.caption = "PoW video caption";
  item.post.post.identity_mode = "anonymous";
  item.post.post.media_refs = [{
    mime_type: "video/mp4",
    size_bytes: 12,
    storage_ref: "data:video/mp4;base64,AAAA",
  }];
  item.post.post.post_type = "video";
  Object.assign(item.post, {
    community: {
      ...communityPreview(false),
      gate_match_mode: "any",
      membership_gate_summaries: [
        altchaGate,
        { gate_type: "unique_human" },
      ],
    },
    viewer_gate_state: {
      community_display_name: mockCommunityPreview.display_name,
      community_id: mockCommunityId,
      gate_match_mode: "any",
      membership_gate_summaries: [
        altchaGate,
        { gate_type: "unique_human" },
      ],
      viewer_community_role: null,
      viewer_membership_status: "not_member",
    },
  });
  return item;
}

function communityPreview(following: boolean) {
  return {
    ...mockCommunityPreview,
    membership_mode: "gated",
    membership_gate_summaries: [
      altchaGate,
      { gate_type: "unique_human" },
    ],
    gate_match_mode: "any",
    viewer_following: following,
    viewer_community_role: null,
    viewer_membership_status: "not_member",
  };
}

function joinEligibility() {
  return {
    ...mockJoinEligibility,
    gate_evaluation: {
      passed: false,
      required_action_set: {
        items: [
          {
            capability: "altcha_pow",
            kind: "action",
            provider: "altcha",
            scope: "vote",
          },
          {
            capability: "unique_human",
            kind: "action",
            provider: "self",
          },
        ],
        kind: "set",
        mode: "any",
      },
      trace: null,
    },
    joinable_now: false,
    membership_gate_summaries: [
      altchaGate,
      { gate_type: "unique_human" },
    ],
    membership_mode: "gated",
    missing_capabilities: ["altcha_pow", "unique_human"],
    status: "verification_required",
  };
}

async function installVideoPowFixture(
  page: Page,
  captures: Captures,
  voteStatus = 200,
): Promise<void> {
  let following = false;
  await installAuthenticatedApiMocks(page);
  await page.route(pirateApiPattern, async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method().toUpperCase();
    const path = url.pathname;

    if (method === "GET" && path === "/feed/home/videos") {
      await route.fulfill(jsonResponse({
        items: [videoFeedItem()],
        next_cursor: null,
        top_communities: [],
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
      await route.fulfill(jsonResponse(communityPreview(following)));
      return;
    }
    if (method === "GET" && path === `/communities/${encodeURIComponent(mockCommunityId)}/join-eligibility`) {
      await route.fulfill(jsonResponse(joinEligibility()));
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
        altchaHeader: request.headers()["x-pirate-altcha"] ?? null,
        body: request.postDataJSON(),
      });
      if (voteStatus !== 200) {
        await route.fulfill(jsonResponse({
          code: "gate_failed",
          message: "Verification is required to vote in this community",
          retryable: false,
        }, voteStatus));
        return;
      }
      following = true;
      await route.fulfill(jsonResponse({ post: mockFeedPostId, value: 1 }));
      return;
    }
    if (method === "POST" && path === `/communities/${encodeURIComponent(mockCommunityId)}/join`) {
      captures.joins += 1;
      await route.fulfill(jsonResponse({ community: mockCommunityId, status: "joined" }));
      return;
    }
    await route.fallback();
  });
  await installMockSession(page);
}

test.describe("video-feed proof-of-work vote gate", () => {
  test("sends a headless action proof, persists the heart, and never joins", async ({ page }) => {
    const captures: Captures = { challengeUrls: [], joins: 0, voteRequests: [] };
    await installVideoPowFixture(page, captures);
    await page.goto("/");

    const like = page.getByRole("button", { name: "Like" });
    await expect(like).toBeVisible();
    await expect(like).toHaveAttribute("aria-pressed", "false");
    await like.click();

    await expect.poll(() => captures.voteRequests.length).toBe(1);
    expect(captures.challengeUrls[0]?.searchParams.get("action")).toBe(`post:${mockFeedPostId}:1`);
    expect(captures.challengeUrls[0]?.searchParams.get("scope")).toBe("vote");
    expect(captures.voteRequests[0]?.body).toEqual({ value: 1 });
    expect(captures.voteRequests[0]?.altchaHeader).toBeTruthy();
    expect(captures.joins).toBe(0);
    await expect(like).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Following" })).toBeVisible();
  });

  test("rolls back the heart and surfaces a failed vote", async ({ page }) => {
    const captures: Captures = { challengeUrls: [], joins: 0, voteRequests: [] };
    await installVideoPowFixture(page, captures, 403);
    await page.goto("/");

    const like = page.getByRole("button", { name: "Like" });
    await like.click();

    await expect.poll(() => captures.voteRequests.length).toBe(1);
    await expect(like).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("Verification is required to vote in this community")).toBeVisible();
  });
});
