import { expect, test } from "@playwright/test";

import {
  installAuthenticatedApiMocks,
  installMockSession,
} from "./fixtures/api-mocks";
import { expectNoBrowserError } from "./fixtures/e2e-helpers";

test.describe("authenticated smoke with mocked API", () => {
  test.beforeEach(async ({ page }) => {
    await installAuthenticatedApiMocks(page);
    await installMockSession(page);
  });

  test("home uses the authenticated shell when a stored session exists", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("button", { name: /create community/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /connect|sign in/i })).toHaveCount(0);
    await expectNoBrowserError(page);
  });

  test("home feed applies New and Top ordering from sort controls", async ({ page }) => {
    const feedRequests: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.pathname === "/feed/home" || url.pathname === "/feed/home/public") {
        feedRequests.push(url.toString());
      }
    });

    await page.goto("/");
    await expect(page.locator("article").first()).toContainText("E2E feed post", { timeout: 30_000 });

    await page.getByRole("combobox", { name: /sort feed/i }).click();
    await page.getByRole("option", { name: /^new$/i }).click();
    await expect(page.locator("article").first()).toContainText("E2E newest post", { timeout: 30_000 });

    await page.getByRole("combobox", { name: /sort feed/i }).click();
    await page.getByRole("option", { name: /^top$/i }).click();
    await expect(page.locator("article").first()).toContainText("E2E feed post", { timeout: 30_000 });

    expect(feedRequests.some((url) => url.includes("/feed/home/public") && url.includes("sort=new"))).toBe(true);
    expect(feedRequests.some((url) => url.includes("/feed/home/public") && url.includes("sort=top") && url.includes("time_range=all"))).toBe(true);
  });

  test("profile settings render from the injected session", async ({ page }) => {
    await page.goto("/settings/profile");

    await expect(page.getByRole("textbox", { name: /display name/i })).toHaveValue("E2E Test", { timeout: 30_000 });
    await expect(page.locator("body")).toContainText("e2e-test.pirate", { timeout: 30_000 });
    await expect(page.getByRole("button", { name: /save profile/i })).toBeVisible();
    await expectNoBrowserError(page);
  });
});
