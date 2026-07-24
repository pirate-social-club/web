import { expect, test, type Page } from "@playwright/test";

import {
  browserErrorPattern,
  firstString,
  pathSegment,
  resolveApiBaseURL,
} from "./fixtures/e2e-helpers";

type DiscoveredRoutes = {
  communityLabel?: string;
  communityPath?: string;
  postPath?: string;
  profileLabel?: string;
  profilePath?: string;
};

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const apiBaseURL = process.env.E2E_API_BASE_URL ?? resolveApiBaseURL(baseURL);
const discoverProfileRoute = process.env.E2E_DISCOVER_PUBLIC_PROFILE_PATH === "true";

let routes: DiscoveredRoutes = {};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

async function getJson(path: string): Promise<any | null> {
  const response = await fetch(`${apiBaseURL}${path}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) return null;
  return response.json();
}

async function discoverRoutes(): Promise<DiscoveredRoutes> {
  const discovered: DiscoveredRoutes = {
    communityPath: process.env.E2E_PUBLIC_COMMUNITY_PATH,
    postPath: process.env.E2E_PUBLIC_POST_PATH,
    profilePath: process.env.E2E_PUBLIC_PROFILE_PATH,
  };

  const feed = await getJson("/feed/home/public?sort=best&locale=en");
  const feedItem = Array.isArray(feed?.items) ? feed.items[0] : null;
  const community = feedItem?.community;
  const post = feedItem?.post?.post ?? feedItem?.post;

  if (!discovered.communityPath && community) {
    const routeSlug = firstString(community.route_slug, community.routeSlug);
    const communityId = firstString(community.id, community.community_id, community.communityId);
    const communityRouteSegment = routeSlug ?? communityId;
    if (communityRouteSegment) discovered.communityPath = `/c/${pathSegment(communityRouteSegment)}`;
    discovered.communityLabel = firstString(community.display_name, community.name, communityRouteSegment);
  }

  if (!discovered.postPath) {
    const postId = firstString(post?.id, post?.post_id, feedItem?.post?.id);
    if (postId) discovered.postPath = `/p/${pathSegment(postId)}`;
  }

  if (!discovered.profilePath && discoverProfileRoute) {
    const authorUserId = firstString(post?.author_user, post?.authorUser);
    if (authorUserId) {
      const profile = await getJson(`/profiles/${pathSegment(authorUserId)}`);
      const handle = firstString(
        profile?.primary_public_handle?.label,
        profile?.primaryPublicHandle?.label,
        profile?.global_handle?.label,
        profile?.globalHandle?.label,
      );
      if (handle) {
        discovered.profilePath = `/u/${pathSegment(handle)}`;
        discovered.profileLabel = firstString(profile?.display_name, handle);
      }
    }
  }

  if (!discovered.communityPath) {
    const communitySearch = await getJson("/public-communities?query=&limit=5");
    const item = Array.isArray(communitySearch?.items)
      ? communitySearch.items[0]
      : Array.isArray(communitySearch?.results)
        ? communitySearch.results[0]
        : null;
    const communityRouteSegment = firstString(item?.route_slug, item?.routeSlug, item?.id, item?.community_id);
    if (communityRouteSegment) discovered.communityPath = `/c/${pathSegment(communityRouteSegment)}`;
    discovered.communityLabel = firstString(item?.display_name, item?.name, communityRouteSegment);
  }

  return discovered;
}

async function expectAppShell(page: Page): Promise<void> {
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("body")).toContainText(/PIRATE|For You|Explore|Connect|Sign in|Sign In/u);
  await expect(page.locator("body")).not.toContainText(browserErrorPattern);
}

async function expectRouteRendered(page: Page): Promise<void> {
  await expect(page.locator("body")).toContainText(/\S/u);
  await expect(page.locator("body")).not.toContainText(browserErrorPattern);
}

test.beforeAll(async () => {
  routes = await discoverRoutes();
});

test.describe("unauthenticated staging smoke", () => {
  test("home feed renders the app shell", async ({ page }) => {
    await page.goto("/");
    await expectAppShell(page);
    await expect(page.getByRole("button", { name: /^for you$/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^explore$/i }).first()).toBeVisible();
  });

  test("community feed renders", async ({ page }) => {
    await page.goto("/feed");
    await expectAppShell(page);
    await expect(page).toHaveURL(/\/feed$/u);
  });

  test("desktop navigation exposes primary routes", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await expectAppShell(page);
    await expect(page.getByText("For You", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Explore", { exact: true }).first()).toBeVisible();
  });

  test("mobile viewport exposes core footer navigation", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expectAppShell(page);
    await expect(page.getByRole("navigation", { name: /primary/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^for you$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /wallet/i })).toBeVisible();
  });

  test("public community route renders when staging has public community data", async ({ page }) => {
    test.skip(!routes.communityPath, "No public community route was discoverable from staging API.");
    await page.goto(routes.communityPath!);
    await expectRouteRendered(page);
    const bodyText = await page.locator("body").innerText();
    test.skip(/Community not found|could not find c\//iu.test(bodyText), "Discovered staging community route is stale.");
    if (routes.communityLabel) {
      await expect(page.locator("body")).toContainText(new RegExp(escapeRegExp(routes.communityLabel), "u"), { timeout: 30_000 });
    }
  });

  test("public post route renders when staging has public post data", async ({ page }) => {
    test.skip(!routes.postPath, "No public post route was discoverable from staging API.");
    await page.goto(routes.postPath!);
    await expectRouteRendered(page);
    await expect(page).toHaveURL(/\/p\//u);
  });

  test("public profile route renders when staging has public profile data", async ({ page }) => {
    test.skip(!routes.profilePath, "Set E2E_PUBLIC_PROFILE_PATH to verify a stable public profile route.");
    await page.goto(routes.profilePath!);
    await expectRouteRendered(page);
    if (routes.profileLabel) {
      await expect(page.locator("body")).toContainText(new RegExp(escapeRegExp(routes.profileLabel), "u"), { timeout: 30_000 });
    }
  });

  test("unknown route shows the 404 route state", async ({ page }) => {
    await page.goto(`/__e2e_missing_${Date.now()}`);
    await expectRouteRendered(page);
    await expect(page.locator("body")).toContainText(/Page not found|not find|Not Found/u);
  });
});
