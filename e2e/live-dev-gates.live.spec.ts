import { createHash, createHmac } from "node:crypto";
import { createRequire } from "node:module";
import { expect, test, type Page } from "@playwright/test";
import type { GatePolicy, JoinEligibility, SessionExchangeResponse } from "@pirate/api-contracts";

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
const liveGateSmokeEnabled = process.env.E2E_LIVE_DEV_GATES === "true";
const liveControlPlanePresent = Boolean(process.env.CONTROL_PLANE_DATABASE_URL?.trim());
const liveSecretsPresent = Boolean(
  process.env.AUTH_UPSTREAM_JWT_AUDIENCE?.trim()
  && process.env.AUTH_UPSTREAM_JWT_ISSUER?.trim()
  && process.env.AUTH_UPSTREAM_JWT_SHARED_SECRET?.trim(),
);
const requireFromApiPackage = createRequire(new URL("../../api/services/api/package.json", import.meta.url));

type RequiredActionNode = {
  capability?: string;
  items?: RequiredActionNode[];
  kind: "action" | "set";
};

type LiveGateCommunity = {
  apiId: string;
  label: string;
  routeSegment: string;
};

type NeonPool = {
  end: () => Promise<void>;
  query: (sql: string, values?: unknown[]) => Promise<{ rowCount?: number | null; rows: unknown[] }>;
};

const createdCommunities: LiveGateCommunity[] = [];

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for live gate E2E`);
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

function walletAddressForSubject(subject: string): string {
  return `0x${createHash("sha256").update(subject).digest("hex").slice(0, 40)}`;
}

function mintUpstreamJwt(subject: string): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return signHs256Jwt({
    aud: requiredEnv("AUTH_UPSTREAM_JWT_AUDIENCE"),
    exp: nowSeconds + 15 * 60,
    iat: nowSeconds,
    iss: requiredEnv("AUTH_UPSTREAM_JWT_ISSUER"),
    sub: subject,
    wallet_address: walletAddressForSubject(subject),
  }, requiredEnv("AUTH_UPSTREAM_JWT_SHARED_SECRET"));
}

function communityRouteSegment(community: { id: string; route_slug?: string | null }): string {
  const routeSlug = community.route_slug?.trim();
  if (routeSlug) return routeSlug;
  return community.id;
}

function rawPublicId(value: string, prefix: string): string {
  return value.startsWith(`${prefix}_`) ? value.slice(prefix.length + 1) : value;
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

async function createLiveSession(subject: string): Promise<StoredSession> {
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

function powOnlyPolicy(): GatePolicy {
  return {
    version: 1,
    expression: {
      op: "and",
      children: [{ op: "gate", gate: { type: "altcha_pow" } }],
    },
  };
}

function veryOrPowPolicy(): GatePolicy {
  return {
    version: 1,
    expression: {
      op: "or",
      children: [
        { op: "gate", gate: { type: "unique_human", provider: "very" } },
        { op: "gate", gate: { type: "altcha_pow" } },
      ],
    },
  };
}

function walletScorePolicy(): GatePolicy {
  return {
    version: 1,
    expression: {
      op: "and",
      children: [{ op: "gate", gate: { type: "wallet_score", provider: "passport", minimum_score: 20 } }],
    },
  };
}

async function createGatedCommunity(input: {
  gatePolicy: GatePolicy;
  label: string;
  owner: StoredSession;
}): Promise<LiveGateCommunity> {
  const created = await requestJson<{
    community: { gate_policy?: GatePolicy | null; id: string; route_slug?: string | null };
    job?: { id?: string; status?: string };
  }>("/communities", {
    body: JSON.stringify({
      allow_anonymous_identity: true,
      anonymous_identity_scope: "community_stable",
      display_name: input.label,
      gate_policy: input.gatePolicy,
      handle_policy: { policy_template: "standard" },
      membership_mode: "gated",
    }),
    headers: { authorization: `Bearer ${input.owner.accessToken}` },
    method: "POST",
  });

  if (created.job?.status && created.job.status !== "succeeded") {
    const jobId = firstString(created.job.id);
    if (!jobId) throw new Error("community creation job id is missing");
    await waitForJob(jobId, input.owner.accessToken);
  }

  const community: LiveGateCommunity = {
    apiId: created.community.id,
    label: input.label,
    routeSegment: communityRouteSegment(created.community),
  };
  createdCommunities.push(community);

  await expect.poll(async () => {
    const community = await requestJson<{ gate_policy?: GatePolicy | null; provisioning_state?: string | null; status?: string | null }>(
      `/communities/${encodeURIComponent(created.community.id)}`,
      { headers: { authorization: `Bearer ${input.owner.accessToken}` } },
    );
    return {
      active: community.provisioning_state === "active" || community.status === "active",
      policy: community.gate_policy ?? null,
    };
  }, { timeout: 120_000 }).toEqual({
    active: true,
    policy: input.gatePolicy,
  });

  return community;
}

async function getJoinEligibility(community: LiveGateCommunity, session: StoredSession): Promise<JoinEligibility> {
  return await requestJson<JoinEligibility>(
    `/communities/${encodeURIComponent(community.apiId)}/join-eligibility`,
    { headers: { authorization: `Bearer ${session.accessToken}` } },
  );
}

function createControlPlanePool(): NeonPool {
  const neon = requireFromApiPackage("@neondatabase/serverless") as {
    Pool: new (config: { connectionString: string }) => NeonPool;
    neonConfig: { poolQueryViaFetch: boolean };
  };
  neon.neonConfig.poolQueryViaFetch = true;
  return new neon.Pool({ connectionString: requiredEnv("CONTROL_PLANE_DATABASE_URL") });
}

async function markLiveUserVeryVerified(session: StoredSession): Promise<StoredSession> {
  const rawUserId = rawPublicId(session.user.id, "usr");
  const nowIso = new Date().toISOString();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const capabilities = {
    ...session.user.verification_capabilities,
    unique_human: {
      state: "verified",
      provider: "very",
      proof_type: "unique_human",
      mechanism: "live_gate_action_smoke",
      verified_at: nowSeconds,
    },
  };
  const pool = createControlPlanePool();
  try {
    const result = await pool.query(
      `
        UPDATE users
        SET verification_state = 'verified',
            capability_provider = $2,
            verification_capabilities_json = $3,
            verified_at = $4,
            updated_at = $4
        WHERE user_id = $1
      `,
      [rawUserId, "very", JSON.stringify(capabilities), nowIso],
    );
    if (result.rowCount !== 1) {
      throw new Error(`could not mark live user ${session.user.id} as Very-verified`);
    }
  } finally {
    await pool.end();
  }

  return {
    ...session,
    user: {
      ...session.user,
      capability_provider: "very",
      verification_capabilities: capabilities,
      verification_state: "verified",
    },
  };
}

async function joinCommunity(community: LiveGateCommunity, session: StoredSession): Promise<void> {
  await requestJson<{ community?: string; status?: string }>(
    `/communities/${encodeURIComponent(community.apiId)}/join`,
    {
      headers: { authorization: `Bearer ${session.accessToken}` },
      method: "POST",
    },
  );
}

async function createTextPost(input: {
  body: string;
  community: LiveGateCommunity;
  owner: StoredSession;
  runId: string;
  title: string;
}): Promise<string> {
  const post = await requestJson<{ id?: string; post?: { id?: string } }>(
    `/communities/${encodeURIComponent(input.community.apiId)}/posts`,
    {
      body: JSON.stringify({
        body: input.body,
        idempotency_key: `gate-action-smoke-post-${input.runId}`,
        identity_mode: "public",
        post_type: "text",
        title: input.title,
        visibility: "public",
      }),
      headers: { authorization: `Bearer ${input.owner.accessToken}` },
      method: "POST",
    },
  );
  const postId = firstString(post.id, post.post?.id);
  if (!postId) throw new Error("created live gate action smoke post id is missing");
  return postId;
}

function requiredActionCapabilities(eligibility: JoinEligibility): string[] {
  const actions = (eligibility.gate_evaluation?.required_action_set?.items ?? []) as RequiredActionNode[];
  const capabilities = new Set<string>();
  const visit = (action: RequiredActionNode) => {
    if (action.kind === "set") {
      action.items?.forEach(visit);
      return;
    }
    if (action.capability) capabilities.add(action.capability);
  };
  actions.forEach(visit);
  return Array.from(capabilities);
}

async function joinWithBrowserProofOfWork(page: Page, community: LiveGateCommunity, session: StoredSession): Promise<void> {
  await installStoredSession(page, session);
  await page.goto(`/c/${pathSegment(community.routeSegment)}`);

  const joinButton = page.getByRole("button", { name: /verify to join/i }).first();
  await expect(joinButton).toBeVisible({ timeout: 30_000 });
  await joinButton.click();

  const dialog = page.getByRole("dialog", { name: /checking browser/i });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Proof-of-work complete", { timeout: 60_000 });
  await dialog.getByRole("button", { name: /^continue$/i }).click();

  await expect.poll(async () => {
    const eligibility = await getJoinEligibility(community, session);
    return eligibility.status;
  }, { timeout: 30_000 }).toBe("already_joined");
  await expectNoBrowserError(page);
}

test.describe("live dev gate smoke", () => {
  test.skip(!liveGateSmokeEnabled, "Set E2E_LIVE_DEV_GATES=true to run real dev/staging gate mutations.");
  test.skip(!liveSecretsPresent, "Live gate JWT secrets are not available.");

  test.afterAll(() => {
    if (createdCommunities.length === 0) return;
    console.info("[live-dev-gates] created communities", createdCommunities);
  });

  test("creates and joins a real proof-of-work only community", async ({ page }, testInfo) => {
    testInfo.setTimeout(180_000);

    const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const owner = await createLiveSession(`gate-smoke-pow-owner-${runId}`);
    const joiner = await createLiveSession(`gate-smoke-pow-joiner-${runId}`);
    const community = await createGatedCommunity({
      gatePolicy: powOnlyPolicy(),
      label: `Gate Smoke PoW ${runId}`,
      owner,
    });

    const eligibility = await getJoinEligibility(community, joiner);
    expect(eligibility.status).toBe("verification_required");
    expect(requiredActionCapabilities(eligibility)).toContain("altcha_pow");

    await joinWithBrowserProofOfWork(page, community, joiner);
  });

  test("creates and joins a real Very OR proof-of-work community through PoW fallback", async ({ page }, testInfo) => {
    testInfo.setTimeout(180_000);

    const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const owner = await createLiveSession(`gate-smoke-very-or-pow-owner-${runId}`);
    const joiner = await createLiveSession(`gate-smoke-very-or-pow-joiner-${runId}`);
    const community = await createGatedCommunity({
      gatePolicy: veryOrPowPolicy(),
      label: `Gate Smoke Very OR PoW ${runId}`,
      owner,
    });

    const eligibility = await getJoinEligibility(community, joiner);
    expect(eligibility.status).toBe("verification_required");
    expect(requiredActionCapabilities(eligibility)).toEqual(expect.arrayContaining(["altcha_pow", "unique_human"]));

    await joinWithBrowserProofOfWork(page, community, joiner);
  });

  test("rejects a real wallet-score gated community without proof-of-work fallback", async ({ page }, testInfo) => {
    testInfo.setTimeout(120_000);

    const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const owner = await createLiveSession(`gate-smoke-wallet-owner-${runId}`);
    const joiner = await createLiveSession(`gate-smoke-wallet-joiner-${runId}`);
    const community = await createGatedCommunity({
      gatePolicy: walletScorePolicy(),
      label: `Gate Smoke Wallet ${runId}`,
      owner,
    });

    const eligibility = await getJoinEligibility(community, joiner);
    expect(eligibility.status).not.toBe("joinable");
    expect(requiredActionCapabilities(eligibility)).toContain("wallet_score");
    expect(requiredActionCapabilities(eligibility)).not.toContain("altcha_pow");

    await installStoredSession(page, joiner);
    await page.goto(`/c/${pathSegment(community.routeSegment)}`);
    await expect(page.getByRole("dialog", { name: /checking browser/i })).toBeHidden();
    await expectNoBrowserError(page);
  });

  test("lets a stale-session Very-verified member upvote a real Very OR proof-of-work community without PoW", async ({ page }, testInfo) => {
    test.skip(!liveControlPlanePresent, "CONTROL_PLANE_DATABASE_URL is required to seed live Very verification state.");
    testInfo.setTimeout(180_000);

    const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const owner = await createLiveSession(`gate-action-smoke-owner-${runId}`);
    const staleMember = await createLiveSession(`gate-action-smoke-member-${runId}`);
    await markLiveUserVeryVerified(staleMember);

    const community = await createGatedCommunity({
      gatePolicy: veryOrPowPolicy(),
      label: `Gate Action Smoke Very OR PoW ${runId}`,
      owner,
    });
    const postTitle = `Gate action smoke vote ${runId}`;
    const postId = await createTextPost({
      body: `Created by live gate action smoke ${runId}.`,
      community,
      owner,
      runId,
      title: postTitle,
    });

    await joinCommunity(community, staleMember);
    await expect.poll(async () => {
      const eligibility = await getJoinEligibility(community, staleMember);
      return eligibility.status;
    }, { timeout: 30_000 }).toBe("already_joined");

    const voteRequests: Array<{ altchaHeader: string | null; postData: string | null }> = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (request.method().toUpperCase() !== "POST") return;
      if (url.origin !== new URL(apiBaseURL).origin) return;
      if (url.pathname !== `/posts/${encodeURIComponent(postId)}/vote`) return;
      voteRequests.push({
        altchaHeader: request.headers()["x-pirate-altcha"] ?? null,
        postData: request.postData(),
      });
    });

    await installStoredSession(page, staleMember);
    await page.goto(`/c/${pathSegment(community.routeSegment)}`);
    const postCard = page.locator("article").filter({ hasText: postTitle }).first();
    await expect(postCard).toBeVisible({ timeout: 30_000 });

    const voteResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return response.request().method().toUpperCase() === "POST"
        && url.origin === new URL(apiBaseURL).origin
        && url.pathname === `/posts/${encodeURIComponent(postId)}/vote`;
    }, { timeout: 30_000 });
    await postCard.getByRole("button", { name: /^upvote$/i }).click();
    const voteResponse = await voteResponsePromise;

    expect(voteResponse.status()).toBe(200);
    await expect.poll(() => voteRequests.length).toBe(1);
    expect(voteRequests[0]?.altchaHeader ?? null).toBeNull();
    expect(voteRequests[0]?.postData).toContain('"value":1');
    await expect(page.getByRole("dialog", { name: /checking browser/i })).toBeHidden();
    await expectNoBrowserError(page);
  });
});
