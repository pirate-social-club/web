import { expect, test, type Page } from "@playwright/test";

import {
  installAuthenticatedApiMocks,
  installMockSession,
} from "./fixtures/api-mocks";
import { expectNoBrowserError } from "./fixtures/e2e-helpers";
import {
  mockFeedPostId,
} from "./fixtures/auth-session";

async function installAuthenticatedFixture(page: Page): Promise<void> {
  await installAuthenticatedApiMocks(page);
  await installMockSession(page);
}

test.describe("mobile authenticated smoke with mocked API", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await installAuthenticatedFixture(page);
  });

  test("mobile home feed renders post card and footer navigation", async ({ page }) => {
    const feedResponse = page.waitForResponse((response) => (
      response.url().includes("/feed/home")
      && response.status() === 200
    ));

    await page.goto("/");
    await feedResponse;

    await expect(page.locator("article").filter({ hasText: "E2E feed post" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("navigation", { name: /primary/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^home$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /wallet/i })).toBeVisible();
    await expectNoBrowserError(page);
  });

  test("mobile thread opens the focused reply surface", async ({ page }) => {
    const postResponse = page.waitForResponse((response) => (
      response.url().includes(`/posts/${mockFeedPostId}`)
      && response.status() === 200
    ));

    await page.goto(`/p/${mockFeedPostId}`);
    await postResponse;

    await expect(page.locator("body")).toContainText("E2E feed post", { timeout: 30_000 });
    await page.getByRole("textbox", { name: /^reply$/i }).click();

    await expect(page.getByRole("button", { name: /go back/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^post$/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /write a reply/i })).toBeVisible();
    await expectNoBrowserError(page);
  });
});
