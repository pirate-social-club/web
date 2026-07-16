import { expect, test, type Page } from "@playwright/test";

import {
  installAuthenticatedApiMocks,
  installMockSession,
} from "./fixtures/api-mocks";
import { expectNoBrowserError } from "./fixtures/e2e-helpers";
import {
  mockCommentBody,
  mockCommunityId,
  mockCommunityPreview,
  mockFeedPostId,
  mockJoinEligibility,
  mockStoryPortalAssetUrl,
} from "./fixtures/auth-session";

async function installAuthenticatedFixture(page: Page): Promise<void> {
  await installAuthenticatedApiMocks(page);
  await installMockSession(page);
}

test.describe("authenticated thread flows with mocked API", () => {
  test.beforeEach(async ({ page }) => {
    await installAuthenticatedFixture(page);
  });

  test("comments on a thread post", async ({ page }) => {
    await page.goto(`/p/${mockFeedPostId}`);

    await expect(page.locator("body")).toContainText("E2E feed post", { timeout: 30_000 });
    await expect(page.locator("body")).toContainText("A deterministic post rendered from mocked API data.");
    await page.getByRole("textbox", { name: /^reply$/i }).click();
    await page.getByPlaceholder(/write a reply/i).fill(mockCommentBody);
    await page.getByRole("button", { name: /post reply/i }).click();

    await expect(page.locator("body")).toContainText(mockCommentBody, { timeout: 15_000 });
    await expectNoBrowserError(page);
  });

  test("shows the public-thread composer to a non-member without posting a comment", async ({ page }) => {
    let commentPostCount = 0;
    await page.route(
      new RegExp(`/communities/${encodeURIComponent(mockCommunityId)}/preview(?:\\?.*)?$`),
      (route) => route.fulfill({
        body: JSON.stringify({
          ...mockCommunityPreview,
          membership_mode: "gated",
          viewer_membership_status: "not_member",
          viewer_following: false,
        }),
        contentType: "application/json",
        status: 200,
      }),
    );
    await page.route(
      `**/communities/${encodeURIComponent(mockCommunityId)}/join-eligibility`,
      (route) => route.fulfill({
        body: JSON.stringify({
          ...mockJoinEligibility,
          joinable_now: true,
          membership_mode: "gated",
          status: "joinable",
        }),
        contentType: "application/json",
        status: 200,
      }),
    );
    await page.route(
      `**/communities/${encodeURIComponent(mockCommunityId)}/posts/${encodeURIComponent(mockFeedPostId)}/comments`,
      async (route) => {
        if (route.request().method() === "POST") {
          commentPostCount += 1;
        }
        await route.fallback();
      },
    );

    await page.goto(`/p/${mockFeedPostId}`);

    await expect(page.getByRole("textbox", { name: /^reply$/i })).toBeEnabled({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Join to comment" })).toHaveCount(0);
    expect(commentPostCount).toBe(0);
    await expectNoBrowserError(page);
  });

  test("opens the post asset on Story from the post menu", async ({ page }) => {
    await page.goto(`/p/${mockFeedPostId}`);

    const post = page.locator("article").filter({ hasText: "E2E feed post" });
    await expect(post).toBeVisible({ timeout: 30_000 });

    await post.getByRole("button", { name: /post options/i }).click();
    await expect(page.getByRole("menu")).toBeVisible();

    const storyPagePromise = page.waitForEvent("popup");
    await page.getByRole("menuitem", { name: /^view on story$/i }).click();
    const storyPage = await storyPagePromise;
    await storyPage.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => undefined);

    const openedUrl = new URL(storyPage.url());
    const expectedUrl = new URL(mockStoryPortalAssetUrl);
    expect(`${openedUrl.origin}${openedUrl.pathname}`).toBe(`${expectedUrl.origin}${expectedUrl.pathname}`);
    await expectNoBrowserError(page);
  });
});
