import { expect, test, type APIRequestContext, type Page, type Response } from "@playwright/test";

import {
  browserErrorPattern,
  firstString,
  resolveApiBaseURL,
} from "./fixtures/e2e-helpers";

type FeedProbe = {
  cacheStatus: string | null;
  cfCacheStatus: string | null;
  itemLabel: string | null;
  itemCount: number;
  serverTiming: string | null;
  status: number;
  url: string;
};

type BrowserFeedProbe = FeedProbe & {
  requestToHeadersMs: number;
  requestToFinishedMs: number;
};

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const apiBaseURL = process.env.E2E_API_BASE_URL ?? resolveApiBaseURL(baseURL);
const feedResponseBudgetMs = numberFromEnv("E2E_HOME_FEED_RESPONSE_BUDGET_MS", 2_500);
const feedRenderBudgetMs = numberFromEnv("E2E_HOME_FEED_RENDER_BUDGET_MS", 10_000);

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} must be a positive number`);
  return parsed;
}

function isHostedApp(url: string): boolean {
  const hostname = new URL(url).hostname;
  return hostname === "staging.pirate.sc" || hostname === "pirate.sc" || hostname === "www.pirate.sc";
}

function publicFeedUrl(): string {
  const url = new URL("/feed/home/public", apiBaseURL);
  url.searchParams.set("locale", "en");
  url.searchParams.set("sort", "best");
  return url.toString();
}

function isPublicFeedResponse(response: Response): boolean {
  const url = new URL(response.url());
  return `${url.origin}` === apiBaseURL && url.pathname === "/feed/home/public";
}

function responseCacheStatus(headers: Record<string, string>): string | null {
  return headers["x-pirate-cache"] ?? null;
}

function isWarmCacheStatus(probe: FeedProbe): boolean {
  return probe.cacheStatus === "hit"
    || probe.cacheStatus === "stale"
    || probe.cfCacheStatus === "HIT";
}

function firstFeedItemLabel(feed: any): string | null {
  const item = Array.isArray(feed?.items) ? feed.items[0] : null;
  if (!item) return null;
  const community = item.community;
  const post = item.post?.post ?? item.post;
  return firstString(
    community?.display_name,
    community?.name,
    post?.title,
    post?.body,
  ) ?? null;
}

async function warmPublicFeed(request: APIRequestContext): Promise<FeedProbe> {
  const response = await request.get(publicFeedUrl(), {
    headers: {
      accept: "application/json",
      origin: baseURL,
    },
  });
  const headers = response.headers();
  const feed = await response.json().catch(() => null);
  return {
    cacheStatus: responseCacheStatus(headers),
    cfCacheStatus: headers["cf-cache-status"] ?? null,
    itemCount: Array.isArray(feed?.items) ? feed.items.length : 0,
    itemLabel: firstFeedItemLabel(feed),
    serverTiming: headers["server-timing"] ?? null,
    status: response.status(),
    url: response.url(),
  };
}

async function captureBrowserPublicFeed(page: Page): Promise<BrowserFeedProbe> {
  let feedRequestStartedAt: number | null = null;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/feed/home/public") {
      feedRequestStartedAt = performance.now();
    }
  });

  const response = await page.waitForResponse(isPublicFeedResponse, { timeout: 15_000 });
  const responseHeadersAt = performance.now();
  const finishedError = await response.finished();
  if (finishedError) throw finishedError;
  const responseFinishedAt = performance.now();
  const headers = response.headers();
  const feed = await response.json().catch(() => null);
  const startedAt = feedRequestStartedAt ?? responseHeadersAt;

  return {
    cacheStatus: responseCacheStatus(headers),
    cfCacheStatus: headers["cf-cache-status"] ?? null,
    itemCount: Array.isArray(feed?.items) ? feed.items.length : 0,
    itemLabel: firstFeedItemLabel(feed),
    requestToFinishedMs: Math.round(responseFinishedAt - startedAt),
    requestToHeadersMs: Math.round(responseHeadersAt - startedAt),
    serverTiming: headers["server-timing"] ?? null,
    status: response.status(),
    url: response.url(),
  };
}

test.describe("homepage public feed performance", () => {
  test.skip(!isHostedApp(baseURL), "Homepage performance smoke runs against hosted staging or production.");

  test("loads the homepage feed from a warm public cache", async ({ page, request }) => {
    const warmup = await warmPublicFeed(request);
    expect(warmup.status, `warmup status: ${JSON.stringify(warmup)}`).toBe(200);

    const browserFeedPromise = captureBrowserPublicFeed(page);
    const navigationStartedAt = performance.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const browserFeed = await browserFeedPromise;
    expect(browserFeed.status, `browser feed status: ${JSON.stringify(browserFeed)}`).toBe(200);
    expect(isWarmCacheStatus(browserFeed), `browser feed cache status: ${JSON.stringify(browserFeed)}`).toBe(true);
    expect(
      browserFeed.requestToFinishedMs,
      `browser feed timing: ${JSON.stringify(browserFeed)}`,
    ).toBeLessThanOrEqual(feedResponseBudgetMs);

    const label = browserFeed.itemLabel ?? warmup.itemLabel;
    if (label) {
      await expect(page.locator("body")).toContainText(label, { timeout: feedRenderBudgetMs });
    } else {
      await expect(page.locator("body")).toContainText(/Home|Popular/u, { timeout: feedRenderBudgetMs });
    }
    await expect(page.locator("body")).not.toContainText(browserErrorPattern);

    const renderMs = Math.round(performance.now() - navigationStartedAt);
    expect(renderMs, `homepage render timing: ${JSON.stringify({ renderMs, warmup, browserFeed })}`)
      .toBeLessThanOrEqual(feedRenderBudgetMs);
  });
});
