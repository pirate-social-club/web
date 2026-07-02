import { createHash, createHmac } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { expect, test, type Page, type Response } from "@playwright/test";
import type { CommunityFollowResponse, SessionExchangeResponse } from "@pirate/api-contracts";

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
const apiOrigin = new URL(apiBaseURL).origin;
const liveSubject = process.env.E2E_LIVE_STAGING_SUBJECT ?? "seed-staging-mcp-smoke-staff";
const seedCommunityLabel = process.env.E2E_LIVE_STAGING_COMMUNITY_LABEL ?? "MCP Guest Comment Smoke";
const seedPostTitle = process.env.E2E_LIVE_STAGING_SEED_POST_TITLE ?? "MCP guest comment smoke target";
const multipartGateVideoBytes = Number.parseInt(
  process.env.E2E_MULTIPART_GATE_VIDEO_BYTES ?? String(70 * 1024 * 1024),
  10,
);
const require = createRequire(import.meta.url);
const agoraSdkPath = require.resolve("agora-rtc-sdk-ng");
const liveSecretsPresent = Boolean(
  process.env.AUTH_UPSTREAM_JWT_AUDIENCE?.trim()
  && process.env.AUTH_UPSTREAM_JWT_ISSUER?.trim()
  && process.env.AUTH_UPSTREAM_JWT_SHARED_SECRET?.trim(),
);

// Contract-drift gate for community follow. This catches response shape regressions,
// hook silent rollback, and persistence across reload; it is not a broad follow suite.
// Run locally against staging:
//   AUTH_UPSTREAM_JWT_AUDIENCE=... AUTH_UPSTREAM_JWT_ISSUER=... \
//   AUTH_UPSTREAM_JWT_SHARED_SECRET=... E2E_BASE_URL=https://staging.pirate.sc \
//   E2E_API_BASE_URL=https://api-staging.pirate.sc E2E_LIVE_STAGING=true \
//   bunx playwright test e2e/live-staging.live.spec.ts --project=live-staging \
//     --grep "follows a real staging community"

type LiveCommunity = {
  id: string;
  label: string;
  ownerUserId?: string | null;
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

type CommunityPreview = {
  follower_count: number | null;
  id: string;
  route_slug?: string | null;
  viewer_following: boolean | null;
};

type BookingSlot = {
  available: boolean;
  endUtc: string;
  priceCents: number;
  startUtc: string;
};

type BookingAgoraEvidence = {
  booking_id: string;
  booker_agora: AgoraBlock;
  host_agora: AgoraBlock;
  live_room_id: string | null;
  run_id: string;
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

function toPublicCommunityId(value: string): string {
  return value.startsWith("com_") ? value : `com_${value}`;
}

function rawPublicUserId(value: string): string {
  return value.startsWith("usr_usr_") ? value.slice("usr_".length) : value;
}

function walletAddressForSubject(subject: string): string {
  return `0x${createHash("sha256").update(subject).digest("hex").slice(0, 40)}`;
}

function localSlotParts(date: Date, timeZone: string): { hour: string; minute: string; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone,
    weekday: "short",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(value("weekday"));
  if (weekday < 0) throw new Error(`Could not resolve local weekday for ${date.toISOString()} in ${timeZone}`);
  return { hour: value("hour"), minute: value("minute"), weekday };
}

function nextBookingSmokeSlot(hostTimezone: string): {
  endLocal: string;
  endUtc: string;
  startLocal: string;
  startUtc: string;
  weekday: number;
  windowEndUtc: string;
  windowStartUtc: string;
} {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 3);
  start.setUTCHours(14, 0, 0, 0);
  const end = new Date(start);
  end.setUTCMinutes(end.getUTCMinutes() + 30);
  const windowStart = new Date(start);
  windowStart.setUTCHours(0, 0, 0, 0);
  const windowEnd = new Date(start);
  windowEnd.setUTCHours(23, 59, 59, 999);
  const startLocal = localSlotParts(start, hostTimezone);
  const endLocal = localSlotParts(end, hostTimezone);
  return {
    endLocal: `${endLocal.hour}:${endLocal.minute}`,
    endUtc: end.toISOString(),
    startLocal: `${startLocal.hour}:${startLocal.minute}`,
    startUtc: start.toISOString(),
    weekday: startLocal.weekday,
    windowEndUtc: windowEnd.toISOString(),
    windowStartUtc: windowStart.toISOString(),
  };
}

function mintUpstreamJwt(subject: string, walletAddressOverride?: string | null): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const walletAddress = walletAddressOverride?.trim() || process.env.E2E_LIVE_STAGING_WALLET_ADDRESS?.trim();
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

async function requestOctetJson<T>(
  path: string,
  body: ArrayBuffer,
  init: RequestInit = {},
  okStatuses = [200, 201, 202],
): Promise<T> {
  const response = await fetch(new URL(path, apiBaseURL), {
    ...init,
    body,
    headers: {
      accept: "application/json",
      "content-type": "application/octet-stream",
      ...init.headers,
    },
  });
  const text = await response.text();
  const parsed = (text.trim() ? JSON.parse(text) : null) as T;
  if (!okStatuses.includes(response.status)) {
    throw new Error(`${init.method ?? "PUT"} ${path} failed with ${response.status}: ${text}`);
  }
  return parsed;
}

async function requestArrayBuffer(
  urlOrPath: string,
  init: RequestInit = {},
  okStatuses = [200, 206],
): Promise<{ body: ArrayBuffer; contentType: string | null; status: number }> {
  const url = /^https?:\/\//iu.test(urlOrPath) ? urlOrPath : new URL(urlOrPath, apiBaseURL);
  const response = await fetch(url, {
    ...init,
    headers: {
      ...init.headers,
    },
  });
  if (!okStatuses.includes(response.status)) {
    const text = await response.text();
    throw new Error(`${init.method ?? "GET"} ${urlOrPath} failed with ${response.status}: ${text}`);
  }
  return {
    body: await response.arrayBuffer(),
    contentType: response.headers.get("content-type"),
    status: response.status,
  };
}

function createSineWaveWav(): ArrayBuffer {
  const sampleRate = 8_000;
  const durationSeconds = 1;
  const sampleCount = sampleRate * durationSeconds;
  const bytesPerSample = 2;
  const dataSize = sampleCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeAscii = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  writeAscii(36, "data");
  view.setUint32(40, dataSize, true);

  for (let sample = 0; sample < sampleCount; sample += 1) {
    const value = Math.sin((sample / sampleRate) * 440 * Math.PI * 2);
    view.setInt16(44 + sample * bytesPerSample, Math.round(value * 16_000), true);
  }

  return buffer;
}

async function waitForSongPreview(input: {
  authHeaders: Record<string, string>;
  bundleId: string;
  communityId: string;
}): Promise<{
  preview_audio?: {
    duration_ms?: number | null;
    mime_type?: string | null;
    size_bytes?: number | null;
    storage_ref?: string | null;
  } | null;
  preview_error?: string | null;
  preview_status: string;
}> {
  const deadline = Date.now() + 180_000;
  let lastStatus = "unknown";
  let lastError: string | null | undefined;

  while (Date.now() < deadline) {
    const bundle = await requestJson<{
      preview_audio?: {
        duration_ms?: number | null;
        mime_type?: string | null;
        size_bytes?: number | null;
        storage_ref?: string | null;
      } | null;
      preview_error?: string | null;
      preview_status: string;
    }>(
      `/communities/${encodeURIComponent(input.communityId)}/song-artifacts/${encodeURIComponent(input.bundleId)}`,
      { headers: input.authHeaders },
    );

    lastStatus = bundle.preview_status;
    lastError = bundle.preview_error;
    if (bundle.preview_status === "completed" && bundle.preview_audio?.storage_ref) {
      return bundle;
    }
    if (bundle.preview_status === "failed") {
      throw new Error(`song preview failed: ${bundle.preview_error ?? "unknown"}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }

  throw new Error(`song preview did not complete; last status ${lastStatus}${lastError ? ` (${lastError})` : ""}`);
}

async function createLiveSession(subject = liveSubject, walletAddress?: string | null): Promise<StoredSession> {
  const response = await requestJson<SessionExchangeResponse>("/auth/session/exchange", {
    body: JSON.stringify({
      proof: {
        jwt: mintUpstreamJwt(subject, walletAddress),
        type: "jwt_based_auth",
      },
    }),
    method: "POST",
  });

  return createStoredSessionFromExchange(response);
}

function seedOwnerAdminHeaders(community: LiveCommunity): Record<string, string> | null {
  const adminToken = process.env.PIRATE_ADMIN_TOKEN?.trim();
  const ownerUserId = community.ownerUserId?.trim();
  if (!adminToken || !ownerUserId) return null;
  return {
    "x-admin-as-user-id": ownerUserId,
    "x-admin-token": adminToken,
  };
}

async function enableEventDetails(page: Page): Promise<void> {
  const checkbox = page.getByRole("checkbox", { name: /add date and place/i });
  const venue = page.getByRole("textbox", { name: /venue or place/i });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await checkbox.click();
    if (await venue.isVisible().catch(() => false)) return;
    await page.waitForTimeout(250);
  }
  await expect(venue).toBeVisible();
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

async function writeGeneratedMultipartVideo(page: Page, sizeBytes: number, filePath: string): Promise<string> {
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) {
    throw new Error(`Invalid target video size ${sizeBytes}`);
  }
  const recorded = await page.evaluate(async () => {
    if (!("MediaRecorder" in window)) {
      throw new Error("MediaRecorder is not available in this browser");
    }

    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context unavailable");

    let frame = 0;
    const draw = () => {
      context.fillStyle = frame % 2 === 0 ? "#17405f" : "#2f5f3d";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#ffffff";
      context.font = "20px sans-serif";
      context.fillText(`Multipart upload E2E ${frame++}`, 20, 96);
    };
    draw();
    const drawInterval = window.setInterval(draw, 100);
    const stream = canvas.captureStream(10);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : "video/webm";
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, { mimeType });

    await new Promise<void>((resolve, reject) => {
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      });
      recorder.addEventListener("error", () => reject(new Error("Could not generate multipart upload video fixture.")), { once: true });
      recorder.addEventListener("stop", () => resolve(), { once: true });
      recorder.start();
      window.setTimeout(() => recorder.stop(), 750);
    });

    window.clearInterval(drawInterval);
    for (const track of stream.getTracks()) track.stop();

    const recorded = new Blob(chunks, { type: "video/webm" });
    return Array.from(new Uint8Array(await recorded.arrayBuffer()));
  });
  if (recorded.length <= 0 || recorded.length >= sizeBytes) {
    throw new Error(`Generated fixture had unexpected size ${recorded.length}`);
  }

  const fileName = `multipart-gate-${sizeBytes}.webm`;
  await writeFile(filePath, Buffer.concat([
    Buffer.from(recorded),
    Buffer.alloc(sizeBytes - recorded.length),
  ]));
  return fileName;
}

async function advanceComposerToPublish(page: Page): Promise<void> {
  const publishButton = page.getByRole("button", { name: /^(publish|post)$/i });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (await publishButton.isVisible().catch(() => false)) return;
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.waitForTimeout(500);
  }
  await expect(publishButton).toBeVisible({ timeout: 10_000 });
}

function expectConfiguredAgora(block: AgoraBlock, label: string): void {
  expect(block.configured, `${label} configured`).toBe(true);
  expect(block.app_id, `${label} app_id`).toBeTruthy();
  expect(block.token, `${label} token`).toContain("007");
  expect(Number.isInteger(block.uid), `${label} uid`).toBe(true);
  expect(block.channel, `${label} channel`).toMatch(/^pirate-live-/u);
}

function expectConfiguredBookingAgora(block: AgoraBlock, label: string, bookingId: string): void {
  expect(block.configured, `${label} configured`).toBe(true);
  expect(block.app_id, `${label} app_id`).toBeTruthy();
  expect(block.token, `${label} token`).toContain("007");
  expect(Number.isInteger(block.uid), `${label} uid`).toBe(true);
  expect(block.channel, `${label} channel`).toBe(`pirate-booking-${bookingId}`);
}

async function readBookingAgoraEvidence(path: string): Promise<BookingAgoraEvidence> {
  const parsed = JSON.parse(await readFile(path, "utf8")) as Partial<BookingAgoraEvidence>;
  if (!parsed.booking_id || !parsed.host_agora || !parsed.booker_agora) {
    throw new Error(`Booking Agora evidence file is missing required fields: ${path}`);
  }
  return parsed as BookingAgoraEvidence;
}

function walletAttachmentId(session: StoredSession): string {
  const user = session.user as { primary_wallet_attachment?: unknown };
  const attachments = session.walletAttachments as Array<{ is_primary?: boolean | null; wallet_attachment?: unknown }>;
  const attachment = firstString(
    user.primary_wallet_attachment,
    attachments.find((candidate) => candidate.is_primary)?.wallet_attachment,
    attachments[0]?.wallet_attachment,
  );
  if (!attachment) throw new Error("Session is missing a wallet attachment");
  return attachment;
}

async function waitForJob(jobId: string, token: string): Promise<void> {
  const deadline = Date.now() + 120_000;
  let lastStatus = "unknown";
  while (Date.now() < deadline) {
    const job = await requestJson<{ error_code?: string | null; id: string; status: string }>(
      `/jobs/${encodeURIComponent(jobId)}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    lastStatus = job.status;
    if (job.status === "succeeded") return;
    if (job.status === "failed") {
      throw new Error(`job ${job.id} failed: ${job.error_code ?? "unknown"}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  throw new Error(`job ${jobId} did not finish; last status ${lastStatus}`);
}

async function createSmokeCommunity(runId: string, host: StoredSession): Promise<string> {
  const createdCommunity = await requestJson<{ community: { id: string }; job?: { id?: string; status?: string } }>("/communities", {
    body: JSON.stringify({
      display_name: `Live Room Browser Smoke ${runId}`,
      handle_policy: { policy_template: "standard" },
      membership_mode: "request",
    }),
    headers: { authorization: `Bearer ${host.accessToken}` },
    method: "POST",
  });
  if (createdCommunity.job?.status && createdCommunity.job.status !== "succeeded") {
    const jobId = firstString(createdCommunity.job.id);
    if (!jobId) throw new Error("community creation job id is missing");
    await waitForJob(jobId, host.accessToken);
  }
  return rawPublicId(createdCommunity.community.id, "com");
}

async function waitForCommunityPreview(
  communityId: string,
  headers: Record<string, string> = {},
): Promise<CommunityPreview> {
  const deadline = Date.now() + 30_000;
  let lastStatus = 0;
  let lastBody = "";

  while (Date.now() < deadline) {
    const response = await fetch(new URL(`/communities/${encodeURIComponent(communityId)}/preview`, apiBaseURL), {
      headers: {
        accept: "application/json",
        ...headers,
      },
    });
    lastStatus = response.status;
    lastBody = await response.text();
    if (response.status === 200) {
      return (lastBody.trim() ? JSON.parse(lastBody) : null) as CommunityPreview;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`community preview did not become available; last status ${lastStatus}: ${lastBody}`);
}

async function createGeorgiaPlaceSmokeCommunity(runId: string, host: StoredSession): Promise<LiveCommunity> {
  const createdCommunity = await requestJson<{
    community: { display_name?: string | null; id: string; route_slug?: string | null };
    job?: { id?: string; status?: string };
  }>("/communities", {
    body: JSON.stringify({
      country_code: "ge",
      display_name: `Georgia Place Smoke ${runId}`,
      handle_policy: { policy_template: "standard" },
      membership_mode: "request",
    }),
    headers: { authorization: `Bearer ${host.accessToken}` },
    method: "POST",
  });
  if (createdCommunity.job?.status && createdCommunity.job.status !== "succeeded") {
    const jobId = firstString(createdCommunity.job.id);
    if (!jobId) throw new Error("community creation job id is missing");
    await waitForJob(jobId, host.accessToken);
  }

  const id = rawPublicId(createdCommunity.community.id, "com");
  await requestJson(`/communities/${encodeURIComponent(id)}`, {
    body: JSON.stringify({
      country_code: "ge",
      display_name: firstString(createdCommunity.community.display_name) ?? `Georgia Place Smoke ${runId}`,
    }),
    headers: { authorization: `Bearer ${host.accessToken}` },
    method: "POST",
  });

  return {
    id,
    label: firstString(createdCommunity.community.display_name) ?? `Georgia Place Smoke ${runId}`,
    routeSegment: firstString(createdCommunity.community.route_slug, id) ?? id,
  };
}

async function joinCommunityAsViewer(communityId: string, host: StoredSession, viewer: StoredSession): Promise<void> {
  const joined = await requestJson<{ status: "joined" | "requested" }>(`/communities/${encodeURIComponent(communityId)}/join`, {
    body: JSON.stringify({}),
    headers: { authorization: `Bearer ${viewer.accessToken}` },
    method: "POST",
  });
  if (joined.status === "joined") return;

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

async function publishPaidLiveRoom(input: {
  communityId: string;
  host: StoredSession;
  priceCents: number;
  runId: string;
}): Promise<{ listingId: string; postId: string; roomId: string; title: string }> {
  const title = `Paid Live UI Smoke ${input.runId}`;
  const published = await requestJson<{
    listing: { id: string; live_room: string | null; price_cents: number };
    room: { anchor_post: string; id: string; status: string };
  }>(`/communities/${encodeURIComponent(input.communityId)}/live-rooms/publish`, {
    body: JSON.stringify({
      listing: {
        price_cents: input.priceCents,
        regional_pricing_enabled: false,
        status: "active",
      },
      room: {
        access_mode: "paid",
        performer_allocations: [
          { role: "host", share_bps: 10000, user: input.host.user.id },
        ],
        room_kind: "solo",
        setlist: {
          items: [
            {
              artist: "Pirate Smoke",
              rights_basis: "original",
              rights_status: "ready",
              title: `Paid UI Smoke Set ${input.runId}`,
            },
          ],
          status: "ready",
        },
        title,
        visibility: "public",
      },
    }),
    headers: { authorization: `Bearer ${input.host.accessToken}` },
    method: "POST",
  });
  expect(published.listing.live_room).toBe(published.room.id);
  expect(published.listing.price_cents).toBe(input.priceCents);
  return {
    listingId: published.listing.id,
    postId: published.room.anchor_post,
    roomId: published.room.id,
    title,
  };
}

async function hostAttachLiveRoom(communityId: string, roomId: string, host: StoredSession): Promise<AgoraBlock> {
  const attached = await requestJson<{ agora: AgoraBlock; runtime: { seat: string } }>(
    `/communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(roomId)}/host_attach`,
    {
      body: JSON.stringify({}),
      headers: { authorization: `Bearer ${host.accessToken}` },
      method: "POST",
    },
  );
  expect(attached.runtime.seat).toBe("host");
  expectConfiguredAgora(attached.agora, "paid host_attach");
  return attached.agora;
}

async function createLiveRoomTicketQuote(input: {
  buyer: StoredSession;
  communityId: string;
  listingId: string;
  roomId: string;
}): Promise<{ finalPriceCents: number; id: string }> {
  const quote = await requestJson<{
    final_price_cents: number;
    id: string;
    live_room: string | null;
    settlement_mode: string;
  }>(`/communities/${encodeURIComponent(input.communityId)}/purchase-quotes`, {
    body: JSON.stringify({
      client_estimated_hop_count: 1,
      client_estimated_slippage_bps: 0,
      funding_asset: {
        asset_symbol: "USDC",
        chain_id: 84532,
        chain_namespace: "eip155",
        display_name: "USDC on Base Sepolia",
      },
      listing: input.listingId,
      route_provider: "pirate_checkout",
      source_chain: {
        chain_id: 84532,
        chain_namespace: "eip155",
        display_name: "Base Sepolia",
      },
    }),
    headers: { authorization: `Bearer ${input.buyer.accessToken}` },
    method: "POST",
  });
  expect(quote.live_room).toBe(input.roomId);
  expect(quote.settlement_mode).toBe("delivery_only_story_settlement");
  return { finalPriceCents: quote.final_price_cents, id: quote.id };
}

async function settleLiveRoomTicket(input: {
  buyer: StoredSession;
  communityId: string;
  quoteId: string;
  roomId: string;
  runId: string;
}): Promise<string> {
  const settlementRef = `live-paid-ui:${input.runId}`;
  const settlement = await requestJson<{
    entitlement_kind: string;
    entitlement_target_ref: string;
    live_room: string | null;
    purchase_entitlement: string;
  }>(`/communities/${encodeURIComponent(input.communityId)}/purchase-settlements`, {
    body: JSON.stringify({
      funding_tx_ref: settlementRef,
      quote: input.quoteId,
      settlement_tx_ref: settlementRef,
      settlement_wallet_attachment: walletAttachmentId(input.buyer),
    }),
    headers: { authorization: `Bearer ${input.buyer.accessToken}` },
    method: "POST",
  });
  expect(settlement.live_room).toBe(input.roomId);
  expect(settlement.entitlement_kind).toBe("live_room_access");
  expect(settlement.entitlement_target_ref).toBe(input.roomId);
  return settlement.purchase_entitlement;
}

async function startAgoraPublisher(page: Page, host: AgoraBlock): Promise<() => Promise<void>> {
  await page.goto("about:blank");
  await page.addScriptTag({ path: agoraSdkPath });
  const connectionState = await page.evaluate(async ({ hostAgora }) => {
    const win = window as unknown as {
      AgoraRTC?: {
        createClient: (config: { codec: "vp8"; mode: "live" }) => any;
        createCustomAudioTrack: (config: { mediaStreamTrack: MediaStreamTrack }) => any;
        createCustomVideoTrack: (config: { mediaStreamTrack: MediaStreamTrack }) => any;
      };
      __pirateLivePublisher?: {
        audioContext: AudioContext | null;
        audioTrack: any;
        drawInterval: number | null;
        oscillator: OscillatorNode | null;
        publisher: any;
        videoTrack: any;
      } | null;
    };
    const AgoraRTC = win.AgoraRTC;
    if (!AgoraRTC) throw new Error("AgoraRTC global was not loaded");

    const publisher = AgoraRTC.createClient({ codec: "vp8", mode: "live" });
    await publisher.setClientRole("host");
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
      context.fillText(`Paid live room smoke ${frame++}`, 18, 92);
    };
    draw();
    const drawInterval = window.setInterval(draw, 100);

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass();
    await audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const destination = audioContext.createMediaStreamDestination();
    oscillator.frequency.value = 440;
    oscillator.connect(destination);
    oscillator.start();

    const audioTrack = AgoraRTC.createCustomAudioTrack({ mediaStreamTrack: destination.stream.getAudioTracks()[0] });
    const videoTrack = AgoraRTC.createCustomVideoTrack({ mediaStreamTrack: canvas.captureStream(10).getVideoTracks()[0] });
    await publisher.publish([audioTrack, videoTrack]);
    win.__pirateLivePublisher = {
      audioContext,
      audioTrack,
      drawInterval,
      oscillator,
      publisher,
      videoTrack,
    };
    return publisher.connectionState as string;
  }, { hostAgora: host });
  expect(connectionState).toBe("CONNECTED");

  return async () => {
    await page.evaluate(async () => {
      const win = window as unknown as {
        __pirateLivePublisher?: {
          audioContext: AudioContext | null;
          audioTrack: any;
          drawInterval: number | null;
          oscillator: OscillatorNode | null;
          publisher: any;
          videoTrack: any;
        } | null;
      };
      const state = win.__pirateLivePublisher;
      win.__pirateLivePublisher = null;
      if (!state) return;
      if (state.drawInterval != null) window.clearInterval(state.drawInterval);
      state.oscillator?.stop();
      await state.audioContext?.close().catch(() => undefined);
      state.audioTrack?.close();
      state.videoTrack?.close();
      await state.publisher?.leave().catch(() => undefined);
    }).catch(() => undefined);
    await page.close().catch(() => undefined);
  };
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

async function hydrateRoutableLiveCommunityOwner(community: LiveCommunity): Promise<LiveCommunity | null> {
  const detail = await requestJson<any>(`/public-communities/${encodeURIComponent(community.id)}`).catch(() => null);
  if (!detail) return null;
  const ownerUser = firstString(detail?.owner?.user);
  return {
    id: firstString(detail?.id, community.id) ?? community.id,
    label: firstString(detail?.display_name, community.label) ?? community.label,
    ownerUserId: ownerUser ? rawPublicUserId(ownerUser) : community.ownerUserId ?? null,
    routeSegment: firstString(detail?.route_slug, community.routeSegment, detail?.id, community.id) ?? community.routeSegment,
  };
}

async function seedCommunityCandidates(): Promise<LiveCommunity[]> {
  const candidates: LiveCommunity[] = [];
  const seen = new Set<string>();
  const pushHydrated = async (community: LiveCommunity): Promise<void> => {
    const key = community.id.trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    const hydrated = await hydrateRoutableLiveCommunityOwner(community);
    if (hydrated) candidates.push(hydrated);
  };

  try {
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
        await pushHydrated(community);
      }
    }
  } catch {
    // Fall through to search; live staging feed can be blocked by unrelated data migrations.
  }

  for (const query of [seedCommunityLabel, "smoke"]) {
    const search = await requestJson<any>(`/public-communities?query=${encodeURIComponent(query)}&limit=10`);
    const searchItems = Array.isArray(search?.items)
      ? search.items
      : Array.isArray(search?.results)
        ? search.results
        : Array.isArray(search?.communities)
          ? search.communities
          : [];
    for (const item of searchItems) {
      const id = firstString(item?.id, item?.community_id, item?.community);
      const routeSegment = firstString(item?.route_slug, item?.routeSlug, id);
      const label = firstString(item?.display_name, item?.name, routeSegment);
      if (!id || !routeSegment || !label) continue;
      await pushHydrated({ id, label, routeSegment });
    }
  }

  return candidates;
}

async function discoverSeedCommunity(): Promise<LiveCommunity> {
  const [community] = await seedCommunityCandidates();
  if (community) return community;

  throw new Error(`Could not discover seeded staging community ${seedCommunityLabel}`);
}

async function discoverWritableSeedCommunity(session: StoredSession): Promise<LiveCommunity | null> {
  for (const community of await seedCommunityCandidates()) {
    const detail = await requestJson<any>(
      `/communities/${encodeURIComponent(community.id)}`,
      { headers: { authorization: `Bearer ${session.accessToken}` } },
    ).catch(() => null);
    if (!detail) continue;
    return {
      id: firstString(detail?.id, community.id) ?? community.id,
      label: firstString(detail?.display_name, community.label) ?? community.label,
      ownerUserId: community.ownerUserId ?? null,
      routeSegment: firstString(detail?.route_slug, community.routeSegment, detail?.id, community.id) ?? community.routeSegment,
    };
  }

  return null;
}

test.describe("live staging integration", () => {
  test.describe.configure({ mode: "serial" });

  test.skip(process.env.E2E_LIVE_STAGING !== "true", "Set E2E_LIVE_STAGING=true to run real staging mutations.");
  test.skip(!liveSecretsPresent, "Live staging JWT secrets are not available.");

  test("uploads a public video through direct multipart in a real browser", async ({ page }, testInfo) => {
    testInfo.setTimeout(15 * 60_000);

    const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const session = await createLiveSession(liveSubject, walletAddressForSubject(liveSubject));
    const community = await discoverWritableSeedCommunity(session);
    if (!community) {
      test.skip(true, "No authenticated writable staging seed community is available for direct multipart upload.");
      return;
    }
    const title = `Multipart video browser E2E ${runId}`;
    const filebasePartRequests: URL[] = [];
    const filebasePartStatuses: Array<{ partNumber: string | null; status: number }> = [];

    page.on("request", (request) => {
      if (request.method().toUpperCase() !== "PUT") return;
      const url = new URL(request.url());
      if (!url.hostname.endsWith("filebase.com")) return;
      if (!url.searchParams.has("partNumber") || !url.searchParams.has("uploadId")) return;
      filebasePartRequests.push(url);
    });
    page.on("response", (response) => {
      const request = response.request();
      if (request.method().toUpperCase() !== "PUT") return;
      const url = new URL(response.url());
      if (!url.hostname.endsWith("filebase.com")) return;
      if (!url.searchParams.has("partNumber") || !url.searchParams.has("uploadId")) return;
      filebasePartStatuses.push({
        partNumber: url.searchParams.get("partNumber"),
        status: response.status(),
      });
    });

    await installStoredSession(page, session);
    await page.goto(`/c/${pathSegment(community.routeSegment)}/submit`);
    await expect(page.getByPlaceholder("Title*")).toBeVisible({ timeout: 30_000 });
    await page.getByPlaceholder("Title*").fill(title);
    const fixturePath = testInfo.outputPath(`multipart-gate-${multipartGateVideoBytes}.webm`);
    await writeGeneratedMultipartVideo(page, multipartGateVideoBytes, fixturePath);
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /^video$/i }).click();
    await (await fileChooserPromise).setFiles(fixturePath);
    await expect(page.locator("video").first()).toBeVisible({ timeout: 30_000 });

    await advanceComposerToPublish(page);

    const uploadIntentPromise = page.waitForResponse((response) => {
      const request = response.request();
      const url = new URL(response.url());
      return request.method().toUpperCase() === "POST"
        && url.origin === apiOrigin
        && /\/communities\/[^/]+\/song-artifact-uploads$/u.test(url.pathname);
    }, { timeout: 90_000 });
    const completePromise = page.waitForResponse((response) => {
      const request = response.request();
      const url = new URL(response.url());
      return request.method().toUpperCase() === "POST"
        && url.origin === apiOrigin
        && /\/communities\/[^/]+\/song-artifact-uploads\/[^/]+\/sessions\/[^/]+\/complete$/u.test(url.pathname);
    }, { timeout: 12 * 60_000 });

    await page.getByRole("button", { name: /^(publish|post)$/i }).click();

    const uploadIntent = await uploadIntentPromise.then((response) => response.json() as Promise<{
      id: string;
      upload_session?: {
        id: string;
        part_size_bytes: number;
        total_parts: number;
        upload_id: string;
      };
    }>);
    expect(uploadIntent.upload_session, "multipart upload session").toBeTruthy();
    expect(uploadIntent.upload_session?.part_size_bytes).toBe(10 * 1024 * 1024);
    expect(uploadIntent.upload_session?.total_parts).toBe(Math.ceil(multipartGateVideoBytes / (10 * 1024 * 1024)));

    const completed = await completePromise.then((response) => response.json() as Promise<{
      content_hash?: string | null;
      ipfs_cid?: string | null;
      status?: string | null;
    }>);
    expect(completed.status).toBe("uploaded");
    expect(completed.content_hash).toMatch(/^0x[a-f0-9]{64}$/iu);
    expect(completed.ipfs_cid, "multipart upload IPFS CID").toBeTruthy();

    await expect(page).toHaveURL(/\/p\/[^/?#]+/u, { timeout: 60_000 });
    await expect(page.locator("body")).toContainText(title, { timeout: 30_000 });
    await expectNoBrowserError(page);

    const expectedParts = uploadIntent.upload_session?.total_parts ?? 0;
    expect(filebasePartRequests.length, "direct Filebase part PUT request count").toBe(expectedParts);
    expect(filebasePartStatuses.length, "direct Filebase part PUT response count").toBe(expectedParts);
    for (const requestUrl of filebasePartRequests) {
      expect(requestUrl.searchParams.get("uploadId")).toBe(uploadIntent.upload_session?.upload_id);
      expect(requestUrl.searchParams.get("X-Amz-Signature")).toMatch(/^[a-f0-9]{64}$/iu);
      expect(requestUrl.searchParams.get("partNumber")).toMatch(/^\d+$/u);
    }
    for (const status of filebasePartStatuses) {
      expect(status.status, `part ${status.partNumber} status`).toBe(200);
    }
  });

  test("follows a real staging community and persists after reload", async ({ page }, testInfo) => {
    testInfo.setTimeout(90_000);

    const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const followerSubject = `follow-contract-follower-${runId}`;
    const follower = await createLiveSession(followerSubject, walletAddressForSubject(followerSubject));
    const community = await discoverSeedCommunity();
    const publicCommunityId = toPublicCommunityId(community.id);
    const followerHeaders = { authorization: `Bearer ${follower.accessToken}` };

    try {
      await waitForCommunityPreview(publicCommunityId, followerHeaders);
      await requestJson<CommunityFollowResponse>(`/communities/${encodeURIComponent(publicCommunityId)}/unfollow`, {
        body: JSON.stringify({}),
        headers: followerHeaders,
        method: "POST",
      }, [200, 404, 409]);

      const previewBefore = await waitForCommunityPreview(publicCommunityId, followerHeaders);
      expect(previewBefore.viewer_following).toBe(false);
      const followerCountBefore = previewBefore.follower_count ?? 0;

      await installStoredSession(page, follower);
      await page.goto(`/c/${pathSegment(community.routeSegment)}`);
      await expect(page.locator("body")).toContainText(community.label, { timeout: 30_000 });

      const followButton = page.getByTestId("community-follow-button").first();
      await expect(followButton).toBeVisible({ timeout: 30_000 });
      await expect(followButton).toHaveAttribute("data-state", "follow");

      let followResponse: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const followResponsePromise = page.waitForResponse((response) => {
          const url = new URL(response.url());
          return response.request().method() === "POST"
            && url.pathname === `/communities/${publicCommunityId}/follow`;
        });
        await followButton.click();
        followResponse = await followResponsePromise;
        if (followResponse.status() !== 500) break;
        const body = await followResponse.text().catch(() => "");
        if (!body.includes("D1 DB storage operation exceeded timeout")) break;
        await expect(followButton).toHaveAttribute("data-state", "follow", { timeout: 10_000 });
        await page.waitForTimeout(2_000);
      }
      if (!followResponse) throw new Error("follow response was not captured");
      expect(followResponse.status()).toBe(200);
      const followBody = await followResponse.json() as CommunityFollowResponse & { community_id?: unknown };
      expect(followBody).toEqual({
        community: publicCommunityId,
        follower_count: followerCountBefore + 1,
        following: true,
      });
      expect("community_id" in followBody).toBe(false);
      expect(followBody.community).toMatch(/^com_cmt_/u);

      await expect(followButton).toHaveAttribute("data-state", "following");
      const previewAfter = await waitForCommunityPreview(publicCommunityId, followerHeaders);
      expect(previewAfter.viewer_following).toBe(true);
      expect(previewAfter.follower_count).toBe(followerCountBefore + 1);

      await page.reload();
      await expect(page.locator("body")).toContainText(community.label, { timeout: 30_000 });
      await expect(followButton).toHaveAttribute("data-state", "following");
      const previewAfterReload = await waitForCommunityPreview(publicCommunityId, followerHeaders);
      expect(previewAfterReload.viewer_following).toBe(true);
      expect(previewAfterReload.follower_count).toBe(followerCountBefore + 1);
      await expectNoBrowserError(page);
    } finally {
      await requestJson(
        `/communities/${encodeURIComponent(publicCommunityId)}/unfollow`,
        {
          body: JSON.stringify({}),
          headers: followerHeaders,
          method: "POST",
        },
        [200, 404, 409],
      ).catch(() => undefined);
    }
  });

  test("creates and quotes a global booking hold on staging", async () => {
    const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const hostSubject = `booking-smoke-host-${runId}`;
    const bookerSubject = `booking-smoke-booker-${runId}`;
    const host = await createLiveSession(hostSubject, walletAddressForSubject(hostSubject));
    const booker = await createLiveSession(bookerSubject, walletAddressForSubject(bookerSubject));
    await completeSelfVerification(host);
    await completeSelfVerification(booker);

    const hostUserId = rawPublicUserId(host.user.id);
    const bookerUserId = rawPublicUserId(booker.user.id);
    const hostHeaders = { authorization: `Bearer ${host.accessToken}` };
    const bookerHeaders = { authorization: `Bearer ${booker.accessToken}` };
    const hostTimezone = "America/New_York";
    const slot = nextBookingSmokeSlot(hostTimezone);

    const profile = await requestJson<{
      base_price_cents: number;
      host: string;
    }>("/host-bookings/me/profile", {
      body: JSON.stringify({
        base_price_cents: 1234,
        default_slot_duration_seconds: 1800,
        display_headline: `Global booking smoke ${runId}`,
        host_timezone: hostTimezone,
        payout_wallet_address: walletAddressForSubject(`booking-smoke-payout-${runId}`),
        platform_fee_bps: 500,
        topics: ["staging-smoke", "global-bookings"],
      }),
      headers: hostHeaders,
      method: "POST",
    });
    expect(profile.host).toBe(hostUserId);
    expect(profile.base_price_cents).toBe(1234);

    const rule = await requestJson<{ by_weekday: number[]; slot_duration_seconds: number }>("/host-bookings/me/availability-rules", {
      body: JSON.stringify({
        by_weekday: [slot.weekday],
        end_local: slot.endLocal,
        slot_duration_seconds: 1800,
        start_local: slot.startLocal,
      }),
      headers: hostHeaders,
      method: "POST",
    });
    expect(rule.by_weekday).toEqual([slot.weekday]);
    expect(rule.slot_duration_seconds).toBe(1800);

    const published = await requestJson<{ is_published: boolean }>("/host-bookings/me/profile/publish", {
      body: JSON.stringify({}),
      headers: hostHeaders,
      method: "POST",
    });
    expect(published.is_published).toBe(true);

    const slots = await requestJson<{ host_timezone: string; slots: BookingSlot[]; viewer_timezone: string }>(
      `/bookings/hosts/${encodeURIComponent(hostUserId)}/slots?from=${encodeURIComponent(slot.windowStartUtc)}&to=${encodeURIComponent(slot.windowEndUtc)}&tz=${encodeURIComponent(hostTimezone)}`,
      { headers: bookerHeaders },
    );
    expect(slots.host_timezone).toBe(hostTimezone);
    expect(slots.viewer_timezone).toBe(hostTimezone);
    const resolvedSlot = slots.slots.find((candidate) =>
      Date.parse(candidate.startUtc) === Date.parse(slot.startUtc)
      && Date.parse(candidate.endUtc) === Date.parse(slot.endUtc)
    );
    expect(resolvedSlot, "expected smoke slot in global availability").toBeTruthy();
    expect(resolvedSlot?.available).toBe(true);
    expect(resolvedSlot?.priceCents).toBe(1234);

    const hold = await requestJson<{
      hold: {
        booker_user_id: string;
        hold_id: string;
        host_user_id: string;
        price_cents: number;
        source_community_id: string | null;
        status: string;
      };
    }>(`/bookings/hosts/${encodeURIComponent(hostUserId)}/holds`, {
      body: JSON.stringify({
        slot_end_utc: slot.endUtc,
        slot_start_utc: slot.startUtc,
        source_community_id: null,
      }),
      headers: bookerHeaders,
      method: "POST",
    });
    expect(hold.hold.host_user_id).toBe(hostUserId);
    expect(hold.hold.booker_user_id).toBe(bookerUserId);
    expect(hold.hold.source_community_id).toBeNull();
    expect(hold.hold.price_cents).toBe(1234);
    expect(hold.hold.status).toBe("active");

    await requestJson(`/bookings/hosts/${encodeURIComponent(hostUserId)}/holds`, {
      body: JSON.stringify({
        slot_end_utc: slot.endUtc,
        slot_start_utc: slot.startUtc,
        source_community_id: null,
      }),
      headers: bookerHeaders,
      method: "POST",
    }, [409]);

    const quote = await requestJson<{
      quote: {
        gross_cents: number;
        hold_id: string;
        host_payout_cents: number;
        payment: { amount_atomic: string; payment_intent_id: string; recipient_address: string };
        platform_fee_cents: number;
      };
    }>(`/bookings/holds/${encodeURIComponent(hold.hold.hold_id)}/quote`, {
      body: JSON.stringify({}),
      headers: bookerHeaders,
      method: "POST",
    });
    expect(quote.quote.hold_id).toBe(hold.hold.hold_id);
    expect(quote.quote.gross_cents).toBe(1234);
    expect(quote.quote.platform_fee_cents).toBeGreaterThan(0);
    expect(quote.quote.platform_fee_cents).toBeLessThan(quote.quote.gross_cents);
    expect(quote.quote.host_payout_cents).toBe(quote.quote.gross_cents - quote.quote.platform_fee_cents);
    expect(quote.quote.payment.payment_intent_id).toBeTruthy();
    expect(quote.quote.payment.amount_atomic).toBeTruthy();
    expect(quote.quote.payment.recipient_address).toMatch(/^0x[0-9a-fA-F]{40}$/u);
  });

  test("searches real Georgia event places through Geoapify", async ({ page }, testInfo) => {
    testInfo.setTimeout(90_000);

    const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const session = await createLiveSession(`georgia-place-smoke-${runId}`);
    const community = await createGeorgiaPlaceSmokeCommunity(runId, session);
    await installStoredSession(page, session);

    const geoResponses: Array<{ ok: boolean; placesLength?: number; status: number; url: URL }> = [];
    page.on("response", async (response) => {
      const url = new URL(response.url());
      if (url.pathname !== "/geo/search") return;
      let placesLength: number | undefined;
      try {
        const body = await response.json() as { places?: unknown[] };
        placesLength = Array.isArray(body.places) ? body.places.length : undefined;
      } catch {
        placesLength = undefined;
      }
      geoResponses.push({
        ok: response.ok(),
        placesLength,
        status: response.status(),
        url,
      });
    });

    await page.goto(`/c/${pathSegment(community.routeSegment)}/submit`);
    await expect(page.getByPlaceholder("Title*")).toBeVisible({ timeout: 30_000 });
    await enableEventDetails(page);

    const venue = page.getByRole("textbox", { name: /venue or place/i });
    await venue.fill("Fabrika Tbilisi");

    const firstSuggestion = page.locator("button").filter({ hasText: /Fabrika/i }).first();
    await expect(firstSuggestion).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => geoResponses.length, { timeout: 15_000 }).toBeGreaterThan(0);

    const search = geoResponses.at(-1);
    expect(search?.status).toBe(200);
    expect(search?.ok).toBe(true);
    expect(search?.placesLength).toBeGreaterThan(0);
    expect(search?.url.searchParams.get("text")).toBe("Fabrika Tbilisi");
    expect(search?.url.searchParams.get("limit")).toBe("5");
    expect(search?.url.searchParams.get("country")).toBe("ge");

    await firstSuggestion.click();
    await expect(venue).toHaveValue(/Fabrika/i);
    await expect(page.getByRole("textbox", { name: /^address$/i })).not.toHaveValue("");
    await expectNoBrowserError(page);
  });

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

  test("publishes a real song only after Story registration", async ({}, testInfo) => {
    testInfo.setTimeout(180_000);

    const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const session = await createLiveSession(`song-story-smoke-${runId}`);
    await completeSelfVerification(session);
    const communityId = await createSmokeCommunity(runId, session);
    const title = `Story registered song smoke ${runId}`;
    const audio = createSineWaveWav();

    const upload = await requestJson<{ id: string }>(`/communities/${encodeURIComponent(communityId)}/song-artifact-uploads`, {
      body: JSON.stringify({
        artifact_kind: "primary_audio",
        filename: `story-smoke-${runId}.wav`,
        mime_type: "audio/wav",
        size_bytes: audio.byteLength,
      }),
      headers: { authorization: `Bearer ${session.accessToken}` },
      method: "POST",
    });
    expect(upload.id, "song artifact upload id").toMatch(/^sau_/u);

    await requestOctetJson(
      `/communities/${encodeURIComponent(communityId)}/song-artifact-uploads/${encodeURIComponent(upload.id)}/content`,
      audio,
      {
        headers: { authorization: `Bearer ${session.accessToken}` },
        method: "PUT",
      },
    );

    const bundle = await requestJson<{ id: string }>(`/communities/${encodeURIComponent(communityId)}/song-artifacts`, {
      body: JSON.stringify({
        canvas_video: null,
        cover_art: null,
        genius_annotations_url: null,
        instrumental_audio: null,
        lyrics: "E2E Story registration smoke lyrics",
        preview_window: null,
        primary_audio: { song_artifact_upload: upload.id },
        title,
        vocal_audio: null,
      }),
      headers: { authorization: `Bearer ${session.accessToken}` },
      method: "POST",
    });
    expect(bundle.id, "song artifact bundle id").toMatch(/^sab_/u);

    const post = await requestJson<{ asset?: string | null; id: string }>(`/communities/${encodeURIComponent(communityId)}/posts`, {
      body: JSON.stringify({
        access_mode: "public",
        commercial_rev_share_pct: 10,
        identity_mode: "public",
        idempotency_key: `story-song-smoke-${runId}`,
        license_preset: "commercial-remix",
        post_type: "song",
        rights_basis: "original",
        song_artifact_bundle: bundle.id,
        song_mode: "original",
        title,
        translation_policy: "machine_allowed",
        visibility: "public",
      }),
      headers: { authorization: `Bearer ${session.accessToken}` },
      method: "POST",
    });
    expect(post.asset, "song post asset").toBeTruthy();

    const asset = await requestJson<{
      publication_status?: string | null;
      story_ip?: string | null;
      story_ip_id?: string | null;
      story_license_terms?: string | null;
      story_license_terms_id?: string | null;
      story_royalty_registration_status?: string | null;
    }>(`/communities/${encodeURIComponent(communityId)}/assets/${encodeURIComponent(post.asset ?? "")}`, {
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(asset.publication_status).toBe("story_published");
    expect(asset.story_royalty_registration_status).toBe("registered");
    expect(asset.story_ip ?? asset.story_ip_id, "Story IP id").toMatch(/^0x[a-f0-9]{40}$/iu);
    expect(asset.story_license_terms ?? asset.story_license_terms_id, "Story license terms").toBeTruthy();

    const publicPost = await requestJson<{ post?: { title?: string | null } }>(`/public-posts/${encodeURIComponent(post.id)}`);
    expect(publicPost.post?.title).toBe(title);
  });

  test("generates a fetchable ffmpeg preview for a locked paid song upload", async ({}, testInfo) => {
    testInfo.setTimeout(240_000);

    const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const community = await discoverSeedCommunity();
    const seedOwnerHeaders = seedOwnerAdminHeaders(community);
    const session = seedOwnerHeaders ? null : await createLiveSession(`song-preview-smoke-${runId}`);
    if (session) {
      await completeSelfVerification(session);
    }
    const authHeaders = seedOwnerHeaders ?? { authorization: `Bearer ${session?.accessToken ?? ""}` };
    const communityId = community.id;
    const title = `Paid preview song smoke ${runId}`;
    const audio = createSineWaveWav();

    const upload = await requestJson<{ id: string }>(`/communities/${encodeURIComponent(communityId)}/song-artifact-uploads`, {
      body: JSON.stringify({
        artifact_kind: "primary_audio",
        filename: `paid-preview-smoke-${runId}.wav`,
        mime_type: "audio/wav",
        size_bytes: audio.byteLength,
      }),
      headers: authHeaders,
      method: "POST",
    });
    expect(upload.id, "song artifact upload id").toMatch(/^sau_/u);

    await requestOctetJson(
      `/communities/${encodeURIComponent(communityId)}/song-artifact-uploads/${encodeURIComponent(upload.id)}/content`,
      audio,
      {
        headers: authHeaders,
        method: "PUT",
      },
    );

    const bundle = await requestJson<{ id: string; preview_status?: string | null }>(
      `/communities/${encodeURIComponent(communityId)}/song-artifacts`,
      {
        body: JSON.stringify({
          canvas_video: null,
          cover_art: null,
          genius_annotations_url: null,
          instrumental_audio: null,
          lyrics: "E2E paid preview smoke lyrics",
          preview_window: {
            duration_ms: 1_000,
            start_ms: 0,
          },
          primary_audio: { song_artifact_upload: upload.id },
          title,
          vocal_audio: null,
        }),
        headers: authHeaders,
        method: "POST",
      },
    );
    expect(bundle.id, "song artifact bundle id").toMatch(/^sab_/u);
    expect(bundle.preview_status).toBe("pending");

    const previewBundle = await waitForSongPreview({
      authHeaders,
      bundleId: bundle.id,
      communityId,
    });
    expect(previewBundle.preview_status).toBe("completed");
    expect(previewBundle.preview_audio?.mime_type).toBe("audio/mpeg");
    expect(previewBundle.preview_audio?.storage_ref, "preview storage ref").toBeTruthy();
    expect(previewBundle.preview_audio?.storage_ref, "preview storage ref").toContain("api-staging.pirate.sc");
    expect(previewBundle.preview_audio?.size_bytes ?? 0, "preview size").toBeGreaterThan(0);

    const previewContent = await requestArrayBuffer(previewBundle.preview_audio?.storage_ref ?? "", {
      headers: authHeaders,
    });
    expect(previewContent.contentType).toContain("audio/mpeg");
    expect(previewContent.body.byteLength).toBe(previewBundle.preview_audio?.size_bytes);
  });

  test("publishes and subscribes to a real Agora live-room channel", async ({ page }, testInfo) => {
    testInfo.setTimeout(120_000);

    const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const viewer = await createLiveSession(`agora-live-room-smoke-viewer-${runId}`);
    await completeSelfVerification(viewer);

    const community = await discoverSeedCommunity();
    const ownerHeaders = seedOwnerAdminHeaders(community);
    test.skip(!ownerHeaders, "Seed community owner admin headers are required for Agora live-room smoke.");
    const communityId = rawPublicId(community.id, "com");

    const joined = await requestJson<{ status: "joined" | "requested" }>(`/communities/${encodeURIComponent(communityId)}/join`, {
      body: JSON.stringify({}),
      headers: { authorization: `Bearer ${viewer.accessToken}` },
      method: "POST",
    });
    if (joined.status !== "joined") {
      const requests = await requestJson<{ items: Array<{ applicant_user: string; id: string }> }>(
        `/communities/${encodeURIComponent(communityId)}/membership-requests?limit=20`,
        { headers: ownerHeaders },
      );
      const viewerRequest = requests.items.find((item) => item.applicant_user === viewer.user.id) ?? requests.items[0];
      expect(viewerRequest, "viewer membership request").toBeTruthy();
      await requestJson(`/communities/${encodeURIComponent(communityId)}/membership-requests/${encodeURIComponent(viewerRequest.id)}/approve`, {
        body: JSON.stringify({}),
        headers: ownerHeaders,
        method: "POST",
      });
    }

    const liveRoom = await requestJson<{ anchor_post: string; id: string }>(`/communities/${encodeURIComponent(communityId)}/live-rooms`, {
      body: JSON.stringify({
        access_mode: "free",
        performer_allocations: [
          { role: "host", share_bps: 10000, user: `usr_${community.ownerUserId}` },
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
      headers: ownerHeaders,
      method: "POST",
    });

    try {
      const hostAttach = await requestJson<{ agora: AgoraBlock }>(
        `/communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(liveRoom.id)}/host_attach`,
        {
          body: JSON.stringify({}),
          headers: ownerHeaders,
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
          headers: ownerHeaders,
          method: "POST",
        },
        [200, 409],
      ).catch(() => undefined);
    }
  });

  test("publishes and subscribes to a real Agora paid-booking channel", async ({ page }, testInfo) => {
    testInfo.setTimeout(120_000);
    const evidencePath = process.env.E2E_BOOKING_AGORA_EVIDENCE_FILE?.trim();
    test.skip(!evidencePath, "Set E2E_BOOKING_AGORA_EVIDENCE_FILE to the smoke:paid-booking --agora-evidence-file output.");

    const evidence = await readBookingAgoraEvidence(evidencePath);
    expectConfiguredBookingAgora(evidence.host_agora, "booking host attach", evidence.booking_id);
    expectConfiguredBookingAgora(evidence.booker_agora, "booking booker attach", evidence.booking_id);
    expect(evidence.booker_agora.channel).toBe(evidence.host_agora.channel);

    const media = await runAgoraMediaCheck(page, evidence.host_agora, evidence.booker_agora);
    expect(media.publisherConnection).toBe("CONNECTED");
    expect(media.subscriberConnection).toBe("CONNECTED");
    expect(media.remoteUsers).toContain(evidence.host_agora.uid);
    expect(media.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ mediaType: "audio", type: "subscribed", uid: evidence.host_agora.uid }),
      expect.objectContaining({ mediaType: "video", type: "subscribed", uid: evidence.host_agora.uid }),
    ]));
  });

  test("shows paid ticket UI and unlocks browser watching after settlement", async ({ context, page }, testInfo) => {
    testInfo.setTimeout(180_000);

    const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const priceCents = 199;
    const hostSubject = `paid-live-ui-host-${runId}`;
    const buyerSubject = `paid-live-ui-buyer-${runId}`;
    const host = await createLiveSession(hostSubject, walletAddressForSubject(hostSubject));
    const buyer = await createLiveSession(buyerSubject, walletAddressForSubject(buyerSubject));
    await completeSelfVerification(host);
    await completeSelfVerification(buyer);

    const communityId = await createSmokeCommunity(runId, host);
    await joinCommunityAsViewer(communityId, host, buyer);

    let roomId: string | null = null;
    let hostAttached = false;
    let publisherCleanup: (() => Promise<void>) | null = null;
    try {
      const published = await publishPaidLiveRoom({
        communityId,
        host,
        priceCents,
        runId,
      });
      roomId = published.roomId;

      const publicAccessBefore = await requestJson<{
        access: { allowed: boolean; decision_reason: string | null; listing: string | null };
      }>(`/public-communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(published.roomId)}/access`);
      expect(publicAccessBefore.access.allowed).toBe(false);
      expect(publicAccessBefore.access.decision_reason).toBe("purchase_required");
      expect(publicAccessBefore.access.listing).toBe(published.listingId);

      const memberAccessBefore = await requestJson<{
        access: { allowed: boolean; decision_reason: string | null; listing: string | null };
      }>(`/communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(published.roomId)}/access`, {
        headers: { authorization: `Bearer ${buyer.accessToken}` },
      });
      expect(memberAccessBefore.access.allowed).toBe(false);
      expect(memberAccessBefore.access.decision_reason).toBe("purchase_required");
      expect(memberAccessBefore.access.listing).toBe(published.listingId);

      await requestJson(
        `/communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(published.roomId)}/viewer_attach`,
        {
          headers: { authorization: `Bearer ${buyer.accessToken}` },
          method: "POST",
        },
        [402],
      );

      const hostAgora = await hostAttachLiveRoom(communityId, published.roomId, host);
      hostAttached = true;

      await page.goto(`/p/${pathSegment(published.postId)}`);
      await expect(page.locator("body")).toContainText(published.title, { timeout: 30_000 });
      const anonymousTicketButton = page.getByRole("button", { name: /get ticket|buy ticket/i }).first();
      await expect(anonymousTicketButton).toBeVisible({ timeout: 30_000 });
      await expect(anonymousTicketButton).toBeEnabled();
      await expect(page.getByRole("button", { name: /watch live/i })).toHaveCount(0);
      await expectNoBrowserError(page);

      await installStoredSession(page, buyer);
      await page.goto(`/p/${pathSegment(published.postId)}?buyer=${encodeURIComponent(runId)}`);
      await expect(page.locator("body")).toContainText(published.title, { timeout: 30_000 });
      await expect(page.locator("body")).toContainText("$1.99", { timeout: 30_000 });
      const buyerTicketButton = page.getByRole("button", { name: /get ticket/i }).first();
      await expect(buyerTicketButton).toBeVisible({ timeout: 30_000 });
      await expect(buyerTicketButton).toBeEnabled();
      await expect(page.getByRole("button", { name: /watch live/i })).toHaveCount(0);

      const quote = await createLiveRoomTicketQuote({
        buyer,
        communityId,
        listingId: published.listingId,
        roomId: published.roomId,
      });
      expect(quote.finalPriceCents).toBe(priceCents);
      const entitlement = await settleLiveRoomTicket({
        buyer,
        communityId,
        quoteId: quote.id,
        roomId: published.roomId,
        runId,
      });
      const accessAfter = await requestJson<{
        access: { allowed: boolean; decision_reason: string | null; purchase_entitlement: string | null };
      }>(`/communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(published.roomId)}/access`, {
        headers: { authorization: `Bearer ${buyer.accessToken}` },
      });
      expect(accessAfter.access.allowed).toBe(true);
      expect(accessAfter.access.decision_reason).toBeNull();
      expect(accessAfter.access.purchase_entitlement).toBe(entitlement);

      publisherCleanup = await startAgoraPublisher(await context.newPage(), hostAgora);
      await page.goto(`/p/${pathSegment(published.postId)}?settled=${encodeURIComponent(runId)}`);
      const watchButton = page.getByRole("button", { name: /watch live/i }).first();
      await expect(watchButton).toBeVisible({ timeout: 30_000 });
      await watchButton.click();
      await expect(page.locator("body")).toContainText(
        /Connected\. Waiting for the broadcaster\.|Watching live\./u,
        { timeout: 45_000 },
      );
      await expectNoBrowserError(page);
    } finally {
      await publisherCleanup?.().catch(() => undefined);
      if (roomId) {
        await requestJson(
          `/communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(roomId)}/${hostAttached ? "end" : "cancel"}`,
          {
            body: JSON.stringify({}),
            headers: { authorization: `Bearer ${host.accessToken}` },
            method: "POST",
          },
          [200, 404, 409],
        ).catch(() => undefined);
      }
    }
  });
});
