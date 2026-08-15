import { createHash } from "node:crypto";
import { expect, test, type Page, type Route } from "@playwright/test";

import {
  installAuthenticatedApiMocks,
  installMockSession,
} from "./fixtures/api-mocks";
import { expectNoBrowserError } from "./fixtures/e2e-helpers";
import {
  createMockPostResponse,
  mockCommunityId,
  mockCreatedPostId,
  mockUser,
} from "./fixtures/auth-session";

const genericFileAssetId = "asset_e2e_download";
const genericFileBlobId = "blob_e2e_download";
const genericFileBytes = Buffer.from("sku,qty\nhat,2\n");
const genericFileHash = `0x${createHash("sha256").update(genericFileBytes).digest("hex")}`;

function jsonResponse(body: unknown, status = 200) {
  return {
    body: JSON.stringify(body),
    contentType: "application/json",
    status,
  };
}

function createGenericFilePostResponse() {
  const response = createMockPostResponse({
    body: "A locked downloadable inventory export.",
    id: mockCreatedPostId,
    title: "E2E inventory export",
  });
  return {
    ...response,
    post: {
      ...response.post,
      access_mode: "locked" as const,
      asset: genericFileAssetId,
      post_type: "file" as const,
      rights_basis: "original" as const,
    },
    viewer_is_author: false,
  };
}

async function installGenericFileApiMocks(
  page: Page,
  state: { entitled: boolean },
): Promise<void> {
  await page.route(/https?:\/\/(?:api-staging\.pirate\.sc|api\.pirate\.sc|127\.0\.0\.1:8787)\/.*/u, async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method().toUpperCase();
    const path = url.pathname;
    const communityPath = `/communities/${mockCommunityId}`;

    if (method === "POST" && path === `${communityPath}/content-blobs`) {
      await route.fulfill(jsonResponse({
        community: mockCommunityId,
        created: Date.parse("2026-08-15T00:00:00.000Z"),
        declared_content_hash: null,
        declared_filename: "inventory.csv",
        declared_mime_type: "text/csv",
        declared_size_bytes: genericFileBytes.byteLength,
        detected_mime_type: null,
        id: genericFileBlobId,
        object: "content_blob",
        plaintext_retention_state: "active",
        rejection_code: null,
        security_scan_state: "pending",
        status: "pending_upload",
        upload_session: null,
        upload_url: null,
        uploader_user: mockUser.id,
        validation_profile: "download_file_v1",
        verified_content_hash: null,
        verified_size_bytes: null,
      }));
      return;
    }

    if (method === "PUT" && path === `${communityPath}/content-blobs/${genericFileBlobId}/content`) {
      await route.fulfill(jsonResponse({
        community: mockCommunityId,
        created: Date.parse("2026-08-15T00:00:00.000Z"),
        declared_content_hash: null,
        declared_filename: "inventory.csv",
        declared_mime_type: "text/csv",
        declared_size_bytes: genericFileBytes.byteLength,
        detected_mime_type: "text/csv",
        id: genericFileBlobId,
        object: "content_blob",
        plaintext_retention_state: "active",
        rejection_code: null,
        security_scan_state: "clean",
        status: "ready",
        upload_session: null,
        upload_url: null,
        uploader_user: mockUser.id,
        validation_profile: "download_file_v1",
        verified_content_hash: genericFileHash,
        verified_size_bytes: genericFileBytes.byteLength,
      }));
      return;
    }

    if (method === "POST" && path === `${communityPath}/posts`) {
      await route.fulfill(jsonResponse({
        ...createGenericFilePostResponse().post,
        id: mockCreatedPostId,
        post: mockCreatedPostId,
      }));
      return;
    }

    if (method === "GET" && path === `/posts/${mockCreatedPostId}`) {
      await route.fulfill(jsonResponse(createGenericFilePostResponse()));
      return;
    }

    if (method === "GET" && path === `${communityPath}/posts/${mockCreatedPostId}/comments`) {
      await route.fulfill(jsonResponse({ items: [], next_cursor: null }));
      return;
    }

    if (method === "GET" && path === `${communityPath}/listings`) {
      await route.fulfill(jsonResponse({
        items: [{
          asset: genericFileAssetId,
          community: mockCommunityId,
          created: Date.parse("2026-08-15T00:00:00.000Z"),
          created_by_user: "usr_seller",
          id: "listing_e2e_download",
          listing_mode: "fixed_price",
          object: "community_listing",
          price_cents: 100,
          regional_pricing_enabled: false,
          status: "active",
        }],
        next_cursor: null,
      }));
      return;
    }

    if (method === "GET" && path === `${communityPath}/purchases`) {
      await route.fulfill(jsonResponse({
        items: state.entitled ? [{
          allocations: [],
          asset: genericFileAssetId,
          buyer_user: mockUser.id,
          community: mockCommunityId,
          created: Date.parse("2026-08-15T00:01:00.000Z"),
          entitlement_kind: "asset_access",
          entitlement_target_ref: genericFileAssetId,
          id: "purchase_e2e_download",
          listing: "listing_e2e_download",
          object: "community_purchase",
          purchase_entitlement: "entitlement_e2e_download",
          purchase_price_cents: 100,
          settlement_chain: "eip155:84532",
          settlement_mode: "simulated",
          settlement_token: "usdc",
          settlement_tx_ref: "simulated:e2e-download",
          settlement_wallet_attachment: "wa_e2e",
        }] : [],
        next_cursor: null,
      }));
      return;
    }

    if (method === "GET" && path === `${communityPath}/assets/${genericFileAssetId}/access`) {
      await route.fulfill(jsonResponse({
        access_granted: state.entitled,
        access_mode: "locked",
        asset: genericFileAssetId,
        community: mockCommunityId,
        decision_reason: state.entitled ? "purchase_entitlement" : "purchase_required",
        delivery_kind: state.entitled ? "primary_content_ref" : null,
        delivery_ref: state.entitled ? `${communityPath}/assets/${genericFileAssetId}/content` : null,
        locked_delivery_status: "ready",
        payload: state.entitled ? {
          content_hash: genericFileHash.toUpperCase(),
          delivery_behavior: "download",
          display_filename: "inventory.csv",
          mime_type: "text/csv",
          payload_format: "csv",
          size_bytes: genericFileBytes.byteLength,
        } : null,
        source_post: mockCreatedPostId,
        source_post_status: "published",
        story_status: "none",
      }));
      return;
    }

    if (method === "GET" && path === `${communityPath}/assets/${genericFileAssetId}/content`) {
      await route.fulfill({
        body: genericFileBytes,
        contentType: "text/csv",
        status: 200,
      });
      return;
    }

    await route.fallback();
  });
}

async function installAuthenticatedFixture(page: Page): Promise<void> {
  await installAuthenticatedApiMocks(page);
  await installMockSession(page);
}

async function enableEventDetails(page: Page) {
  const checkbox = page.getByRole("checkbox", { name: /add date and place/i });
  const venue = page.getByRole("textbox", { name: /venue or place/i });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await checkbox.click();
    if (await venue.isVisible().catch(() => false)) return;
    await page.waitForTimeout(250);
  }
  await expect(venue).toBeVisible();
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
    const upvoteButton = post.getByRole("button", { name: /^upvote$/i });
    const score = upvoteButton.locator("xpath=following-sibling::span[1]");
    await expect(score).toHaveText("8");
    await upvoteButton.click();

    await expect(score).toHaveText("9");
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

  test("creates a locked file and downloads it after entitlement refresh", async ({ page }) => {
    const genericState = { entitled: false };
    const createPostBodies: Array<Record<string, unknown>> = [];
    await installGenericFileApiMocks(page, genericState);
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (request.method().toUpperCase() === "POST" && url.pathname === `/communities/${mockCommunityId}/posts`) {
        createPostBodies.push(request.postDataJSON() as Record<string, unknown>);
      }
    });

    await page.goto(`/c/${mockCommunityId}/submit`);
    await expect(page.getByPlaceholder("Title*")).toBeVisible({ timeout: 30_000 });
    await page.locator('input[type="file"][accept*=".csv"]').first().setInputFiles({
      name: "inventory.csv",
      mimeType: "text/csv",
      buffer: genericFileBytes,
    });
    await page.getByPlaceholder("Title*").fill("E2E inventory export");
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByRole("button", { name: /^publish$/i }).click();

    await expect(page).toHaveURL(new RegExp(`/p/${mockCreatedPostId}$`, "u"));
    await expect(page.getByRole("button", { name: /unlock.*1 WIP/i })).toBeVisible();
    expect(createPostBodies).toHaveLength(1);
    expect(createPostBodies[0]).toMatchObject({
      access_mode: "locked",
      file_upload: genericFileBlobId,
      listing_draft: {
        price_cents: 100,
        regional_pricing_enabled: false,
        status: "active",
      },
      post_type: "file",
    });

    // Browser coverage models an entitlement becoming visible after purchase.
    // Server purchase-to-entitlement enforcement belongs in the API integration test.
    genericState.entitled = true;
    await page.reload();
    const downloadButton = page.getByRole("button", { name: /download file/i });
    await expect(downloadButton).toBeVisible();
    const downloadPromise = page.waitForEvent("download");
    await downloadButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("inventory.csv");
    await expectNoBrowserError(page);
  });

  test("publishes a text event with dates and no times", async ({ page }) => {
    const createPostBodies: Array<{ event?: { ends_at?: number | null; is_online?: boolean | null; starts_at?: number; timezone?: string } | null }> = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (request.method().toUpperCase() === "POST" && url.pathname === `/communities/${mockCommunityId}/posts`) {
        createPostBodies.push(request.postDataJSON());
      }
    });

    await page.goto(`/c/${mockCommunityId}/submit`);

    await expect(page.getByPlaceholder("Title*")).toBeVisible({ timeout: 30_000 });
    await page.getByPlaceholder("Title*").fill("Date-only E2E event");
    await page.getByPlaceholder(/body text/i).fill("Created from a mocked browser flow.");
    await enableEventDetails(page);
    await page.getByLabel(/start date/i).fill("2026-06-12");
    await page.getByLabel(/end date/i).fill("2026-06-12");
    await page.getByRole("checkbox", { name: /online event/i }).check();

    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByRole("button", { name: /^publish$/i }).click();

    await expect(page).toHaveURL(new RegExp(`/p/${mockCreatedPostId}$`, "u"));
    expect(createPostBodies).toHaveLength(1);
    expect(createPostBodies[0]?.event?.starts_at).toEqual(expect.any(Number));
    expect(createPostBodies[0]?.event?.ends_at).toEqual(expect.any(Number));
    expect(createPostBodies[0]?.event?.is_online).toBe(true);
    expect(createPostBodies[0]?.event?.timezone).toEqual(expect.any(String));
    await expectNoBrowserError(page);
  });

  test("selects a Story derivative source for a remix song", async ({ page }) => {
    await page.goto(`/c/${mockCommunityId}/submit`);
    await page.locator('input[type="file"][accept="audio/*"]').setInputFiles({
      name: "e2e-remix.mp3",
      mimeType: "audio/mpeg",
      buffer: Buffer.from("e2e-audio"),
    });

    await expect(page.getByText("e2e-remix.mp3")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByRole("tab", { name: /^remix$/i }).click();

    const sourceSearch = page.getByRole("combobox", { name: /search remix-eligible source tracks/i });
    await sourceSearch.click();
    await page.getByRole("option", { name: /E2E Story Remix Source/i }).click();

    await expect(page.getByText("E2E Story Remix Source")).toBeVisible();
    await expect(page.getByText("10% royalty")).toBeVisible();

    await page.getByRole("checkbox", { name: /accept these remix terms/i }).check();
    await page.getByPlaceholder("Paste lyrics").fill("E2E remix lyrics");
    await expect(page.getByRole("button", { name: /^continue$/i })).toBeEnabled();
    await expectNoBrowserError(page);
  });

  test("loads Story song sources for a video uses-song declaration", async ({ page }) => {
    const sourceLookupUrls: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (
        request.method().toUpperCase() === "GET"
        && url.pathname === `/communities/${mockCommunityId}/derivative-sources`
      ) {
        sourceLookupUrls.push(request.url());
      }
    });

    await page.goto(`/c/${mockCommunityId}/submit`);
    await page.getByRole("button", { name: /^video$/i }).click();
    await page.locator('input[type="file"][accept="video/*"]').setInputFiles({
      name: "e2e-uses-song.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from("e2e-video"),
    });

    await expect(page.getByLabel("Remove video")).toBeVisible({ timeout: 30_000 });
    await page.getByPlaceholder("Title*").fill("E2E video uses song");
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByRole("tab", { name: /^uses song$/i }).click();

    await expect.poll(() => sourceLookupUrls.some((href) => {
      const url = new URL(href);
      return url.searchParams.get("scope") === "global"
        && url.searchParams.get("kind") === "song"
        && url.searchParams.get("limit") === "25";
    })).toBe(true);

    const sourceSearch = page.getByRole("combobox", { name: /search songs this video uses/i });
    await sourceSearch.click();
    await page.getByRole("option", { name: /E2E Story Remix Source/i }).click();

    await expect(page.getByText("E2E Story Remix Source")).toBeVisible();
    await expect(page.getByText("10% royalty")).toBeVisible();
    await expectNoBrowserError(page);
  });
});
