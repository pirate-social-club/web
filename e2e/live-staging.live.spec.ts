import { createHmac } from "node:crypto";
import { createRequire } from "node:module";
import { expect, test, type Page } from "@playwright/test";
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
const require = createRequire(import.meta.url);
const agoraSdkPath = require.resolve("agora-rtc-sdk-ng");
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

type AgoraBlock = {
  app_id: string | null;
  channel: string;
  uid: number;
  token: string | null;
  token_expires_at: number | null;
  configured: boolean;
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

function rawPublicId(value: string, prefix: string): string {
  return value.startsWith(`${prefix}_`) ? value.slice(prefix.length + 1) : value;
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

async function createLiveSession(subject = liveSubject): Promise<StoredSession> {
  const response = await requestJson<SessionExchangeResponse>("/auth/session/exchange", {
    body: JSON.stringify({
      proof: {
        jwt: mintUpstreamJwt(subject),
        type: "jwt_based_auth",
      },
    }),
    method: "POST",
  });

  return createStoredSessionFromExchange(response);
}

async function completeSelfVerification(session: StoredSession): Promise<void> {
  const started = await requestJson<{ id?: string; verification_session_id?: string }>("/verification-sessions", {
    body: JSON.stringify({ provider: "self" }),
    headers: { authorization: `Bearer ${session.accessToken}` },
    method: "POST",
  });
  const id = firstString(started.id, started.verification_session_id);
  if (!id) throw new Error("verification session id is missing");
  await requestJson(`/verification-sessions/${encodeURIComponent(id)}/complete`, {
    body: JSON.stringify({}),
    headers: { authorization: `Bearer ${session.accessToken}` },
    method: "POST",
  });
}

function expectConfiguredAgora(block: AgoraBlock, label: string): void {
  expect(block.configured, `${label} configured`).toBe(true);
  expect(block.app_id, `${label} app_id`).toBeTruthy();
  expect(block.token, `${label} token`).toContain("007");
  expect(Number.isInteger(block.uid), `${label} uid`).toBe(true);
  expect(block.channel, `${label} channel`).toMatch(/^pirate-live-/u);
}

async function runAgoraMediaCheck(page: Page, host: AgoraBlock, viewer: AgoraBlock): Promise<{
  events: Array<{ mediaType?: string; state?: string; type: string; uid?: number | string }>;
  publisherConnection: string;
  remoteUsers: Array<number | string>;
  subscriberConnection: string;
}> {
  await page.goto("about:blank");
  await page.addScriptTag({ path: agoraSdkPath });
  return await page.evaluate(async ({ hostAgora, viewerAgora }) => {
    const win = window as unknown as {
      AgoraRTC?: {
        createClient: (config: { codec: "vp8"; mode: "live" }) => any;
        createCustomAudioTrack: (config: { mediaStreamTrack: MediaStreamTrack }) => any;
        createCustomVideoTrack: (config: { mediaStreamTrack: MediaStreamTrack }) => any;
      };
    };
    const AgoraRTC = win.AgoraRTC;
    if (!AgoraRTC) throw new Error("AgoraRTC global was not loaded");

    const events: Array<{ mediaType?: string; state?: string; type: string; uid?: number | string }> = [];
    const publisher = AgoraRTC.createClient({ codec: "vp8", mode: "live" });
    const subscriber = AgoraRTC.createClient({ codec: "vp8", mode: "live" });
    let audioTrack: any = null;
    let videoTrack: any = null;
    let drawInterval: number | null = null;
    let oscillator: OscillatorNode | null = null;
    let audioContext: AudioContext | null = null;

    const waitFor = async (predicate: () => boolean, timeoutMs: number, label: string) => {
      const started = Date.now();
      while (Date.now() - started < timeoutMs) {
        if (predicate()) return;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error(`Timed out waiting for ${label}. Events: ${JSON.stringify(events)}`);
    };

    subscriber.on("connection-state-change", (state: string) => events.push({ state, type: "subscriber-state" }));
    publisher.on("connection-state-change", (state: string) => events.push({ state, type: "publisher-state" }));
    subscriber.on("user-published", async (user: { uid: number | string }, mediaType: "audio" | "video") => {
      events.push({ mediaType, type: "published", uid: user.uid });
      await subscriber.subscribe(user, mediaType);
      events.push({ mediaType, type: "subscribed", uid: user.uid });
    });

    try {
      await subscriber.setClientRole("audience");
      await publisher.setClientRole("host");
      await subscriber.join(viewerAgora.app_id, viewerAgora.channel, viewerAgora.token, viewerAgora.uid);
      await publisher.join(hostAgora.app_id, hostAgora.channel, hostAgora.token, hostAgora.uid);

      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 180;
      document.body.append(canvas);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas 2D context unavailable");
      let frame = 0;
      const draw = () => {
        context.fillStyle = frame % 2 === 0 ? "#143d5f" : "#285f3d";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#ffffff";
        context.font = "20px sans-serif";
        context.fillText(`Agora live room smoke ${frame++}`, 18, 92);
      };
      draw();
      drawInterval = window.setInterval(draw, 100);

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContext = new AudioContextClass();
      await audioContext.resume();
      oscillator = audioContext.createOscillator();
      const destination = audioContext.createMediaStreamDestination();
      oscillator.frequency.value = 440;
      oscillator.connect(destination);
      oscillator.start();

      audioTrack = AgoraRTC.createCustomAudioTrack({ mediaStreamTrack: destination.stream.getAudioTracks()[0] });
      videoTrack = AgoraRTC.createCustomVideoTrack({ mediaStreamTrack: canvas.captureStream(10).getVideoTracks()[0] });
      await publisher.publish([audioTrack, videoTrack]);
      await waitFor(
        () => events.some((event) => event.type === "subscribed" && event.mediaType === "audio")
          && events.some((event) => event.type === "subscribed" && event.mediaType === "video"),
        30_000,
        "audio and video subscription",
      );

      return {
        events,
        publisherConnection: publisher.connectionState,
        remoteUsers: subscriber.remoteUsers.map((user: { uid: number | string }) => user.uid),
        subscriberConnection: subscriber.connectionState,
      };
    } finally {
      if (drawInterval != null) window.clearInterval(drawInterval);
      oscillator?.stop();
      await audioContext?.close().catch(() => undefined);
      audioTrack?.close();
      videoTrack?.close();
      await publisher.leave().catch(() => undefined);
      await subscriber.leave().catch(() => undefined);
    }
  }, { hostAgora: host, viewerAgora: viewer });
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

  test("publishes and subscribes to a real Agora live-room channel", async ({ page }, testInfo) => {
    testInfo.setTimeout(120_000);

    const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const host = await createLiveSession(`agora-live-room-smoke-host-${runId}`);
    const viewer = await createLiveSession(`agora-live-room-smoke-viewer-${runId}`);
    await completeSelfVerification(host);
    await completeSelfVerification(viewer);

    const createdCommunity = await requestJson<{ community: { id: string }; job?: { status?: string } }>("/communities", {
      body: JSON.stringify({
        display_name: `Agora Live Room Smoke ${runId}`,
        handle_policy: { policy_template: "standard" },
        membership_mode: "request",
      }),
      headers: { authorization: `Bearer ${host.accessToken}` },
      method: "POST",
    });
    expect(createdCommunity.job?.status).toBe("succeeded");
    const publicCommunityId = createdCommunity.community.id;
    const communityId = rawPublicId(publicCommunityId, "com");

    const joined = await requestJson<{ status: "joined" | "requested" }>(`/communities/${encodeURIComponent(communityId)}/join`, {
      body: JSON.stringify({}),
      headers: { authorization: `Bearer ${viewer.accessToken}` },
      method: "POST",
    });
    if (joined.status !== "joined") {
      const requests = await requestJson<{ items: Array<{ applicant_user: string; id: string }> }>(
        `/communities/${encodeURIComponent(communityId)}/membership-requests?limit=20`,
        { headers: { authorization: `Bearer ${host.accessToken}` } },
      );
      const viewerRequest = requests.items.find((item) => item.applicant_user === viewer.user.id) ?? requests.items[0];
      expect(viewerRequest, "viewer membership request").toBeTruthy();
      await requestJson(`/communities/${encodeURIComponent(communityId)}/membership-requests/${encodeURIComponent(viewerRequest.id)}/approve`, {
        body: JSON.stringify({}),
        headers: { authorization: `Bearer ${host.accessToken}` },
        method: "POST",
      });
    }

    const liveRoom = await requestJson<{ anchor_post: string; id: string }>(`/communities/${encodeURIComponent(communityId)}/live-rooms`, {
      body: JSON.stringify({
        access_mode: "free",
        performer_allocations: [
          { role: "host", share_bps: 10000, user: host.user.id },
        ],
        room_kind: "solo",
        setlist: {
          items: [
            {
              artist: "Pirate Smoke",
              rights_basis: "original",
              rights_status: "ready",
              title: "Agora Smoke Tone",
            },
          ],
          status: "ready",
        },
        title: `Agora Transport Smoke ${runId}`,
        visibility: "public",
      }),
      headers: { authorization: `Bearer ${host.accessToken}` },
      method: "POST",
    });

    try {
      const hostAttach = await requestJson<{ agora: AgoraBlock }>(
        `/communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(liveRoom.id)}/host_attach`,
        {
          body: JSON.stringify({}),
          headers: { authorization: `Bearer ${host.accessToken}` },
          method: "POST",
        },
      );
      const viewerAttach = await requestJson<{ agora: AgoraBlock }>(
        `/communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(liveRoom.id)}/viewer_attach`,
        {
          body: JSON.stringify({}),
          headers: { authorization: `Bearer ${viewer.accessToken}` },
          method: "POST",
        },
      );
      expectConfiguredAgora(hostAttach.agora, "host_attach");
      expectConfiguredAgora(viewerAttach.agora, "viewer_attach");
      expect(viewerAttach.agora.channel).toBe(hostAttach.agora.channel);

      const renewed = await requestJson<{ agora: AgoraBlock }>(
        `/communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(liveRoom.id)}/viewer_renew`,
        {
          body: JSON.stringify({ uid: viewerAttach.agora.uid }),
          headers: { authorization: `Bearer ${viewer.accessToken}` },
          method: "POST",
        },
      );
      expectConfiguredAgora(renewed.agora, "viewer_renew");
      expect(renewed.agora.uid).toBe(viewerAttach.agora.uid);

      const media = await runAgoraMediaCheck(page, hostAttach.agora, renewed.agora);
      expect(media.publisherConnection).toBe("CONNECTED");
      expect(media.subscriberConnection).toBe("CONNECTED");
      expect(media.remoteUsers).toContain(hostAttach.agora.uid);
      expect(media.events).toEqual(expect.arrayContaining([
        expect.objectContaining({ mediaType: "audio", type: "subscribed", uid: hostAttach.agora.uid }),
        expect.objectContaining({ mediaType: "video", type: "subscribed", uid: hostAttach.agora.uid }),
      ]));
    } finally {
      await requestJson(
        `/communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(liveRoom.id)}/end`,
        {
          body: JSON.stringify({}),
          headers: { authorization: `Bearer ${host.accessToken}` },
          method: "POST",
        },
        [200, 409],
      ).catch(() => undefined);
    }
  });
});
