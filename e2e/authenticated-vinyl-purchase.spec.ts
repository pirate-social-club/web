import { expect, test, type Page } from "@playwright/test";

import {
  installAuthenticatedApiMocks,
  installMockSession,
  installMockWallet,
} from "./fixtures/api-mocks";
import { expectNoBrowserError } from "./fixtures/e2e-helpers";
import {
  mockVinylPostId,
  mockVinylReleaseUrl,
} from "./fixtures/auth-session";

async function installAuthenticatedFixture(page: Page): Promise<void> {
  await installAuthenticatedApiMocks(page);
  await installMockSession(page);
  await installMockWallet(page);
}

test.describe("authenticated vinyl purchase flow with mocked API", () => {
  test.beforeEach(async ({ page }) => {
    await installAuthenticatedFixture(page);
  });

  test("shows the ElasticStage vinyl link after buying the song", async ({ page }) => {
    await page.goto(`/p/${mockVinylPostId}`);

    const songCard = page.locator("article").filter({ hasText: "E2E Vinyl Song" });
    await expect(songCard).toBeVisible({ timeout: 30_000 });
    await expect(songCard).toContainText("Vinyl available after unlock");
    await expect(songCard.getByRole("link", { name: /buy vinyl on elasticstage/i })).toHaveCount(0);

    await songCard.getByRole("button", { name: /\$7\.00/u }).click();
    await expect(page.getByText("Vinyl available after unlock. Sold separately on ElasticStage.")).toBeVisible();
    await page.getByRole("button", { name: /unlock for \$7\.00/i }).click();

    const vinylLink = songCard.getByRole("link", { name: /buy vinyl on elasticstage/i });
    await expect(vinylLink).toBeVisible({ timeout: 15_000 });
    await expect(vinylLink).toHaveAttribute("href", mockVinylReleaseUrl);
    await expect(songCard).toContainText("Unlocked");
    await expectNoBrowserError(page);
  });
});
