import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import type { SessionExchangeResponse } from "@pirate/api-contracts";

import {
  expectNoBrowserError,
  firstString,
  pathSegment,
  resolveApiBaseURL,
} from "./fixtures/e2e-helpers";
import {
  createStoredSessionFromExchange,
  installStoredSession,
  type StoredSession,
} from "./fixtures/session";

const baseURL = process.env.E2E_BASE_URL ?? "https://staging.pirate.sc";
const apiBaseURL = process.env.E2E_API_BASE_URL ?? resolveApiBaseURL(baseURL);
const liveSubject = process.env.E2E_LIVE_STAGING_SUBJECT ?? "seed-staging-mcp-smoke-staff";
const seedCommunityLabel = process.env.E2E_LIVE_STAGING_COMMUNITY_LABEL ?? "MCP Guest Comment Smoke";
const seedPostTitle = process.env.E2E_LIVE_STAGING_SEED_POST_TITLE ?? "MCP guest comment smoke target";
const liveSecretsPresent = Boolean(
  process.env.AUTH_UPSTREAM_JWT_AUDIENCE?.trim()
  && process.env.AUTH_UPSTREAM_JWT_ISSUER?.trim()
  && process.env.AUTH_UPSTREAM_JWT_SHARED_SECRET?.trim(),
);

type LiveCommunity = {
  id: string;
  label: string;
  routeSegment: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for live staging E2E`);
  return value;
}

function base64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/u, "");
}

function signHs256Jwt(payload: Record<string, unknown>, secret: string): string {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const signature = createHmac("sha256", secret).update(signingInput).digest();
  return `${signingInput}.${base64Url(signature)}`;
}

function mintUpstreamJwt(subject: string): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const walletAddress = process.env.E2E_LIVE_STAGING_WALLET_ADDRESS?.trim();
  return signHs256Jwt({
    ...(walletAddress ? { wallet_address: walletAddress } : {}),
    aud: requiredEnv("AUTH_UPSTREAM_JWT_AUDIENCE"),
    exp: nowSeconds + 15 * 60,
    iat: nowSeconds,
    iss: requiredEnv("AUTH_UPSTREAM_JWT_ISSUER"),
    sub: subject,
  }, requiredEnv("AUTH_UPSTREAM_JWT_SHARED_SECRET"));
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
  okStatuses = [200, 201, 202],
): Promise<T> {
  const response = await fetch(new URL(path, apiBaseURL), {
    ...init,
    headers: {
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const text = await response.text();
  const body = (text.trim() ? JSON.parse(text) : null) as T;
  if (!okStatuses.includes(response.status)) {
    throw new Error(`${init.method ?? "GET"} ${path} failed with ${response.status}: ${text}`);
  }
  return body;
}

async function createLiveSession(): Promise<StoredSession> {
  const response = await requestJson<SessionExchangeResponse>("/auth/session/exchange", {
    body: JSON.stringify({
      proof: {
        jwt: mintUpstreamJwt(liveSubject),
        type: "jwt_based_auth",
      },
    }),
    method: "POST",
  });

  return createStoredSessionFromExchange(response);
}

function communityFromFeedItem(item: any): LiveCommunity | null {
  const community = item?.community;
  const post = item?.post?.post ?? item?.post;
  const id = firstString(community?.id, community?.community_id, post?.community);
  const routeSegment = firstString(community?.route_slug, community?.routeSlug, id);
  const label = firstString(community?.display_name, community?.name, routeSegment);
  if (!id || !routeSegment || !label) return null;
  return { id, label, routeSegment };
}

async function discoverSeedCommunity(): Promise<LiveCommunity> {
  const feed = await requestJson<any>("/feed/home/public?sort=best&locale=en");
  const feedItems = Array.isArray(feed?.items) ? feed.items : [];
  for (const item of feedItems) {
    const post = item?.post?.post ?? item?.post;
    const community = communityFromFeedItem(item);
    if (!community) continue;
    const title = firstString(post?.title, item?.post?.title);
    if (
      title === seedPostTitle
      || community.label.toLowerCase() === seedCommunityLabel.toLowerCase()
      || community.routeSegment.toLowerCase().includes(seedCommunityLabel.replace(/^@/u, "").toLowerCase())
    ) {
      return community;
    }
  }

  const search = await requestJson<any>(`/public-communities?query=${encodeURIComponent(seedCommunityLabel)}&limit=10`);
  const searchItems = Array.isArray(search?.items)
    ? search.items
    : Array.isArray(search?.results)
      ? search.results
      : [];
  for (const item of searchItems) {
    const id = firstString(item?.id, item?.community_id, item?.community);
    const routeSegment = firstString(item?.route_slug, item?.routeSlug, id);
    const label = firstString(item?.display_name, item?.name, routeSegment);
    if (id && routeSegment && label) return { id, label, routeSegment };
  }

  throw new Error(`Could not discover seeded staging community ${seedCommunityLabel}`);
}

test.describe("live staging integration", () => {
  test.skip(process.env.E2E_LIVE_STAGING !== "true", "Set E2E_LIVE_STAGING=true to run real staging mutations.");
  test.skip(!liveSecretsPresent, "Live staging JWT secrets are not available.");

  test("creates a real post and comment with a real staging session", async ({ page }) => {
    const session = await createLiveSession();
    const community = await discoverSeedCommunity();
    await installStoredSession(page, session);

    const timestamp = new Date().toISOString();
    const title = `E2E live browser post ${timestamp}`;
    const body = `Created by Playwright against staging at ${timestamp}.`;
    const comment = `E2E live browser comment ${timestamp}`;

    await page.goto(`/c/${pathSegment(community.routeSegment)}/submit`);
    await expect(page.getByPlaceholder("Title*")).toBeVisible({ timeout: 30_000 });
    await page.getByPlaceholder("Title*").fill(title);
    await page.getByPlaceholder(/body text/i).fill(body);
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByRole("button", { name: /^(publish|post)$/i }).click();

    await expect(page).toHaveURL(/\/p\/[^/?#]+/u, { timeout: 30_000 });
    await expect(page.locator("body")).toContainText(title, { timeout: 30_000 });
    await expect(page.locator("body")).toContainText(body);

    await page.getByRole("textbox", { name: /^reply$/i }).click();
    await page.getByPlaceholder(/write a reply/i).fill(comment);
    await page.getByRole("button", { name: /post reply/i }).click();

    await expect(page.locator("body")).toContainText(comment, { timeout: 30_000 });
    await expectNoBrowserError(page);
  });
});
