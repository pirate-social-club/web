import { expect, test, type Page, type Route } from "@playwright/test";

import { installAuthenticatedApiMocks, installMockSession } from "./fixtures/api-mocks";
import {
  createMockHomeFeedItem,
  createMockPostResponse,
  mockFeedPostId,
  mockProfile,
} from "./fixtures/auth-session";
import { expectNoBrowserError } from "./fixtures/e2e-helpers";

const SOURCE_POST_ID = "pst_e2e_video_song";
const pirateApiPattern = /https?:\/\/(?:api-staging\.pirate\.sc|api\.pirate\.sc|127\.0\.0\.1:8787)\/.*/u;

function json(body: unknown, status = 200) {
  return { body: JSON.stringify(body), contentType: "application/json", status };
}

function crossSurfaceVideo() {
  const item = createMockHomeFeedItem({
    commentCount: 3,
    id: mockFeedPostId,
    title: "Cross-surface video",
  });
  item.post.post.caption = "Open this video outside Home.";
  item.post.post.media_refs = [{
    mime_type: "video/mp4",
    size_bytes: 12,
    storage_ref: "data:video/mp4;base64,AAAA",
  }];
  item.post.post.post_type = "video";
  item.post.derivative_sources = [{
    asset: "asset_e2e_video_song",
    community: item.community.id,
    creator_display_name: "E2E Artist",
    creator_handle: "e2e-artist.pirate",
    relationship_type: "references_song",
    source_post: SOURCE_POST_ID,
    source_ref: "post:pst_e2e_video_song",
    title: "E2E Song",
  }];
  return item;
}

function songResponse() {
  return {
    ...createMockPostResponse({ id: SOURCE_POST_ID, title: "E2E Song" }),
    karaoke_capability: { status: "ready" },
    study_capability: {
      exercise_count: 1,
      source_language: "en",
      status: "ready",
      target_language: "es",
    },
  };
}

async function installFixture(page: Page) {
  await installAuthenticatedApiMocks(page);
  await installMockSession(page);
  const video = crossSurfaceVideo();

  await page.route(pirateApiPattern, async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method().toUpperCase();

    if (method === "GET" && (url.pathname === "/feed/home/videos" || url.pathname === "/feed/home/videos/public")) {
      // Force the normal community/Explore feed so this is genuinely an
      // outside-Home entry point into the shell-level viewer.
      await route.fulfill(json({ items: [], next_cursor: null, top_communities: [] }));
      return;
    }
    if (method === "GET" && (url.pathname === "/feed/home" || url.pathname === "/feed/home/public")) {
      await route.fulfill(json({ items: [video], next_cursor: null, top_communities: [] }));
      return;
    }
    if (method === "GET" && url.pathname === `/posts/${mockFeedPostId}`) {
      await route.fulfill(json(video.post));
      return;
    }
    if (method === "GET" && url.pathname === `/posts/${SOURCE_POST_ID}`) {
      await route.fulfill(json(songResponse()));
      return;
    }
    if (method === "GET" && url.pathname === `/profiles/${video.post.post.author_user}`) {
      await route.fulfill(json(mockProfile));
      return;
    }
    await route.fallback();
  });
}

test("outside-Home video keeps comments history and exact Study return state", async ({ page }) => {
  await installFixture(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Play Cross-surface video" }).click();
  await expect(page).toHaveURL(new RegExp(`[?&]video=${mockFeedPostId}(?:&|$)`, "u"));

  const viewer = page.getByRole("dialog", { name: "Video viewer" });
  await expect(viewer).toBeVisible();
  await viewer.getByRole("button", { name: /comments/i }).click();
  await expect(page.getByRole("heading", { name: /comments/i })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: /comments/i })).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`[?&]video=${mockFeedPostId}(?:&|$)`, "u"));

  const study = page.getByRole("button", { name: "Study" });
  await expect(study).toBeVisible();
  const media = page.getByLabel("E2E Song", { exact: true });
  await expect(media).toBeAttached();
  await media.evaluate((element) => {
    Object.defineProperty(element, "currentTime", {
      configurable: true,
      value: 12.5,
      writable: true,
    });
  });

  await study.click();
  await expect(page).toHaveURL(new RegExp(`/p/${SOURCE_POST_ID}/study\\?return_to=`, "u"));

  const returnState = await page.evaluate(() => JSON.parse(
    sessionStorage.getItem("pirate.videoViewer.returnState") ?? "null",
  ) as {
    itemId: string;
    playbackSeconds: number;
    returnPath: string;
  } | null);
  expect(returnState).toMatchObject({
    itemId: mockFeedPostId,
    playbackSeconds: 12.5,
  });
  expect(returnState?.returnPath).toContain(`video=${mockFeedPostId}`);

  await page.goto(returnState!.returnPath);
  await expect(page).toHaveURL(new RegExp(`[?&]video=${mockFeedPostId}(?:&|$)`, "u"));
  await expect(page.getByRole("dialog", { name: "Video viewer" })).toBeVisible();

  await expectNoBrowserError(page);
});
