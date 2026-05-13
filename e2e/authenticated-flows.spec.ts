import { expect, test, type Page } from "@playwright/test";

import {
  installAuthenticatedApiMocks,
  installMockSession,
} from "./fixtures/api-mocks";
import { expectNoBrowserError } from "./fixtures/e2e-helpers";
import {
  mockCommunityId,
  mockCreatedPostId,
} from "./fixtures/auth-session";

async function installAuthenticatedFixture(page: Page): Promise<void> {
  await installAuthenticatedApiMocks(page);
  await installMockSession(page);
}

test.describe("authenticated browser flows with mocked API", () => {
  test.beforeEach(async ({ page }) => {
    await installAuthenticatedFixture(page);
  });

  test("updates profile details", async ({ page }) => {
    await page.goto("/settings/profile");

    const displayName = page.getByRole("textbox", { name: /display name/i });
    await expect(displayName).toHaveValue("E2E Test", { timeout: 30_000 });
    await displayName.fill("E2E Updated");
    await page.getByRole("button", { name: /save profile/i }).click();

    await expect(displayName).toHaveValue("E2E Updated");
    await expect(page.locator("body")).toContainText(/profile updated/i);
    await expectNoBrowserError(page);
  });

  test("upvotes a feed post", async ({ page }) => {
    await page.goto("/");

    const post = page.locator("article").filter({ hasText: "E2E feed post" });
    await expect(post).toBeVisible({ timeout: 30_000 });
    await expect(post).toContainText("3");
    await post.getByRole("button", { name: /^upvote$/i }).click();

    await expect(post).toContainText("4");
    await expectNoBrowserError(page);
  });

  test("creates a text post", async ({ page }) => {
    await page.goto(`/c/${mockCommunityId}/submit`);

    await expect(page.getByPlaceholder("Title*")).toBeVisible({ timeout: 30_000 });
    await page.getByPlaceholder("Title*").fill("Created E2E post");
    await page.getByPlaceholder(/body text/i).fill("Created from a mocked browser flow.");
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByRole("button", { name: /^publish$/i }).click();

    await expect(page).toHaveURL(new RegExp(`/p/${mockCreatedPostId}$`, "u"));
    await expectNoBrowserError(page);
  });
});
