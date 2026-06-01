import { expect, test, type Page } from "@playwright/test";

import {
  installAuthenticatedApiMocks,
  installMockSession,
} from "./fixtures/api-mocks";
import { expectNoBrowserError } from "./fixtures/e2e-helpers";
import {
  mockCommentBody,
  mockFeedPostId,
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
