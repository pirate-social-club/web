import { expect, test, type Page } from "@playwright/test";

import { installAuthenticatedApiMocks, installMockSession } from "./fixtures/api-mocks";
import {
  createMockPostResponse,
  mockCommunityId,
  mockCommunityPreview,
  mockCreatedPostId,
} from "./fixtures/auth-session";
import { expectNoBrowserError } from "./fixtures/e2e-helpers";

const uploadId = "sau_e2e_primary";
const bundleId = "sab_e2e_async";

type CapturedBody = Record<string, unknown>;

type AsyncSongMockState = {
  bundleBodies: CapturedBody[];
  createPostBodies: CapturedBody[];
  createListingCalls: number;
  postPollResult: "failed" | "published";
  postStatus: "processing" | "failed" | "published";
  retryCalls: number;
};

function jsonResponse(body: unknown, status = 200) {
  return {
    body: JSON.stringify(body),
    contentType: "application/json",
    status,
  };
}

function createSongPost(status: AsyncSongMockState["postStatus"]) {
  const base = createMockPostResponse({
    id: mockCreatedPostId,
    title: "Async E2E Song",
  });
  return {
    ...base.post,
    access_mode: "locked",
    asset: status === "published" ? "asset_ast_e2e_song" : null,
    body: null,
    caption: null,
    post_type: "song",
    publish_failure_code: status === "failed" ? "song_rights_reference_required" : null,
    publish_failure_message: status === "failed"
      ? "Matched audio requires derivative rights and a reference"
      : null,
    publish_failure_retryable: status === "failed",
    rights_basis: "original",
    song_artifact_bundle: bundleId,
    song_mode: "original",
    song_title: "Async E2E Song",
    status,
  };
}

function createLocalizedSongPost(status: AsyncSongMockState["postStatus"]) {
  const base = createMockPostResponse({
    id: mockCreatedPostId,
    title: "Async E2E Song",
  });
  return {
    ...base,
    post: createSongPost(status),
    song_presentation: {
      alignment_status: status === "published" ? "completed" : "pending",
      cover_art_ref: null,
      duration_ms: 42_000,
      has_timed_lyrics: false,
      preview_audio: null,
      title: "Async E2E Song",
    },
  };
}

function artifactUploadIntent() {
  return {
    id: uploadId,
    object: "song_artifact_upload",
    artifact_kind: "primary_audio",
    community: mockCommunityId,
    content_hash: null,
    filename: "async-e2e.mp3",
    mime_type: "audio/mpeg",
    size_bytes: 9,
    status: "pending_upload",
    storage_ref: "r2://e2e/async-e2e.mp3",
    upload_session: {
      id: "sau_session_e2e",
      object: "song_artifact_upload_session",
      part_size_bytes: 10 * 1024 * 1024,
      total_parts: 1,
      upload_id: "multipart-e2e",
    },
  };
}

function uploadedArtifact() {
  return {
    ...artifactUploadIntent(),
    content_hash: "0x0f".padEnd(66, "0"),
    status: "uploaded",
    upload_session: null,
  };
}

function validatingBundle() {
  return {
    id: bundleId,
    object: "song_artifact_bundle",
    alignment_status: "pending",
    community: mockCommunityId,
    moderation_result: { analysis_state: "pending" },
    moderation_status: "pending",
    preview_audio: null,
    preview_status: "pending",
    primary_audio: uploadedArtifact(),
    status: "validating",
    title: "Async E2E Song",
    translation_status: "pending",
  };
}

async function installAsyncSongPublishMocks(page: Page, state: AsyncSongMockState) {
  await page.route(/https:\/\/e2e-upload\.invalid\/part-1$/u, async (route) => {
    await route.fulfill({
      body: "",
      headers: { ETag: "etag-e2e-part-1" },
      status: 200,
    });
  });

  await page.route(/\/communities\/cmt_e2e\/song-artifact-uploads(\/.*)?$/u, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method().toUpperCase();
    const path = url.pathname;

    if (method === "POST" && path.endsWith("/song-artifact-uploads")) {
      await route.fulfill(jsonResponse(artifactUploadIntent(), 201));
      return;
    }
    if (method === "GET" && path.endsWith("/parts/1/signed-url")) {
      await route.fulfill(jsonResponse({ url: "https://e2e-upload.invalid/part-1" }));
      return;
    }
    if (method === "POST" && path.endsWith("/complete")) {
      await route.fulfill(jsonResponse(uploadedArtifact()));
      return;
    }
    await route.fulfill(jsonResponse({ message: `Unhandled upload route ${method} ${path}` }, 501));
  });

  await page.route(/\/communities\/cmt_e2e\/song-artifacts$/u, async (route) => {
    const request = route.request();
    if (request.method().toUpperCase() !== "POST") {
      await route.fallback();
      return;
    }
    state.bundleBodies.push(request.postDataJSON() as CapturedBody);
    await route.fulfill(jsonResponse(validatingBundle(), 201));
  });

  await page.route(/\/communities\/cmt_e2e\/posts\/pending(\?.*)?$/u, async (route) => {
    await route.fulfill(jsonResponse({
      items: state.postStatus === "published" ? [] : [createLocalizedSongPost(state.postStatus)],
      next_cursor: null,
    }));
  });

  await page.route(/\/communities\/cmt_e2e\/posts$/u, async (route) => {
    const request = route.request();
    if (request.method().toUpperCase() !== "POST") {
      await route.fallback();
      return;
    }
    state.createPostBodies.push(request.postDataJSON() as CapturedBody);
    state.postStatus = "processing";
    await route.fulfill(jsonResponse(createSongPost("processing"), 202));
  });

  await page.route(/\/posts\/pst_e2e_created(\?.*)?$/u, async (route) => {
    if (state.postStatus === "processing") {
      state.postStatus = state.postPollResult;
    }
    await route.fulfill(jsonResponse(createLocalizedSongPost(state.postStatus)));
  });

  await page.route(/\/communities\/cmt_e2e\/posts\/pst_e2e_created\/publish-retry$/u, async (route) => {
    state.retryCalls += 1;
    state.postStatus = "published";
    await route.fulfill(jsonResponse(createSongPost("processing")));
  });

  await page.route(/\/communities\/cmt_e2e\/listings/u, async (route) => {
    state.createListingCalls += 1;
    await route.fulfill(jsonResponse({ message: "client listing creation should not run" }, 500));
  });
}

async function installFixture(page: Page, state: AsyncSongMockState): Promise<void> {
  await installAuthenticatedApiMocks(page);
  await installAsyncSongPublishMocks(page, state);
  await installMockSession(page);
  await page.addInitScript(({ community }) => {
    window.localStorage.setItem("pirate_known_communities", JSON.stringify([community]));
  }, {
    community: {
      avatarSrc: null,
      communityId: mockCommunityId,
      displayName: mockCommunityPreview.display_name,
      routeSlug: mockCommunityPreview.route_slug,
    },
  });
}

test.describe("async song publish with mocked API", () => {
  test("submits a paid song asynchronously, renders failed state, and retries to published", async ({ page }) => {
    const state: AsyncSongMockState = {
      bundleBodies: [],
      createListingCalls: 0,
      createPostBodies: [],
      postPollResult: "failed",
      postStatus: "processing",
      retryCalls: 0,
    };
    await installFixture(page, state);

    await page.goto(`/c/${mockCommunityId}/submit`);
    await page.locator('input[type="file"][accept="audio/*"]').setInputFiles({
      name: "async-e2e.mp3",
      mimeType: "audio/mpeg",
      buffer: Buffer.from("e2e-audio"),
    });
    await page.getByPlaceholder("Title*").fill("Async E2E Song");
    await page.getByRole("button", { name: /^continue$/i }).click();

    await page.getByLabel(/lyrics/i).fill("Async publish lyrics");
    await page.getByRole("button", { name: /^continue$/i }).click();

    await page.getByRole("checkbox", { name: /paid unlock/i }).check();
    await page.getByLabel(/^price$/i).fill("4.99");
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByRole("button", { name: /^publish$/i }).click();

    await expect(page).toHaveURL(new RegExp(`/c/${mockCommunityId}$`, "u"));
    await expect(page.getByText("Your post is processing and is only visible to you.")).toBeVisible({ timeout: 30_000 });

    await expect(page.getByText("Matched audio requires derivative rights and a reference")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /^try again$/i }).click();
    await expect(page.getByText("Publish failed")).toHaveCount(0);
    await expect(page.getByText("Async E2E Song")).toBeVisible();

    expect(state.bundleBodies[0]?.analysis_mode).toBe("deferred");
    expect(state.createPostBodies[0]?.publish_mode).toBe("async");
    expect(state.createPostBodies[0]?.listing_draft).toMatchObject({
      price_cents: 499,
      status: "active",
    });
    expect((state.createPostBodies[0]?.listing_draft as { asset?: unknown } | undefined)?.asset).toBeUndefined();
    expect(state.createListingCalls).toBe(0);
    expect(state.retryCalls).toBe(1);
    await expectNoBrowserError(page);
  });

  test("submits a paid song asynchronously and flips from processing to published", async ({ page }) => {
    const state: AsyncSongMockState = {
      bundleBodies: [],
      createListingCalls: 0,
      createPostBodies: [],
      postPollResult: "published",
      postStatus: "processing",
      retryCalls: 0,
    };
    await installFixture(page, state);

    await page.goto(`/c/${mockCommunityId}/submit`);
    await page.locator('input[type="file"][accept="audio/*"]').setInputFiles({
      name: "async-e2e.mp3",
      mimeType: "audio/mpeg",
      buffer: Buffer.from("e2e-audio"),
    });
    await page.getByPlaceholder("Title*").fill("Async E2E Song");
    await page.getByRole("button", { name: /^continue$/i }).click();

    await page.getByLabel(/lyrics/i).fill("Async publish lyrics");
    await page.getByRole("button", { name: /^continue$/i }).click();

    await page.getByRole("checkbox", { name: /paid unlock/i }).check();
    await page.getByLabel(/^price$/i).fill("4.99");
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByRole("button", { name: /^publish$/i }).click();

    await expect(page).toHaveURL(new RegExp(`/c/${mockCommunityId}$`, "u"));
    await expect(page.getByText("Your post is processing and is only visible to you.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Publish failed")).toHaveCount(0);
    await expect(page.getByText("Async E2E Song")).toBeVisible({ timeout: 30_000 });

    expect(state.bundleBodies[0]?.analysis_mode).toBe("deferred");
    expect(state.createPostBodies[0]?.publish_mode).toBe("async");
    expect(state.createPostBodies[0]?.listing_draft).toMatchObject({
      price_cents: 499,
      status: "active",
    });
    expect((state.createPostBodies[0]?.listing_draft as { asset?: unknown } | undefined)?.asset).toBeUndefined();
    expect(state.createListingCalls).toBe(0);
    expect(state.retryCalls).toBe(0);
    await expectNoBrowserError(page);
  });
});
