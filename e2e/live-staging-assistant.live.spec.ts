import { createHash, createHmac } from "node:crypto";
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
const openRouterApiKey = process.env.E2E_OPENROUTER_API_KEY?.trim() ?? "";
const assistantModelId = process.env.E2E_ASSISTANT_MODEL_ID?.trim()
  || "openrouter/free";
const expectedAssistantText = "ASSISTANT_E2E_OK";
const apiRequestTimeoutMs = 60_000;
const liveSecretsPresent = Boolean(
  process.env.AUTH_UPSTREAM_JWT_AUDIENCE?.trim()
  && process.env.AUTH_UPSTREAM_JWT_ISSUER?.trim()
  && process.env.AUTH_UPSTREAM_JWT_SHARED_SECRET?.trim(),
);

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

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
  okStatuses = [200, 201, 202],
): Promise<T> {
  const method = init.method ?? "GET";
  let response: Response;
  try {
    response = await fetch(new URL(path, apiBaseURL), {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(apiRequestTimeoutMs),
      headers: {
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
      throw new Error(`${method} ${path} timed out after ${apiRequestTimeoutMs}ms`);
    }
    throw error;
  }
  const text = await response.text();
  const body = (text.trim() ? JSON.parse(text) : null) as T;
  if (!okStatuses.includes(response.status)) {
    throw new Error(`${method} ${path} failed with ${response.status}: ${text}`);
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

async function createAssistantSmokeCommunity(runId: string, owner: StoredSession): Promise<string> {
  const created = await requestJson<{ community: { id: string }; job?: { id?: string; status?: string } }>("/communities", {
    body: JSON.stringify({
      display_name: `Assistant E2E Smoke ${runId}`,
      handle_policy: { policy_template: "standard" },
      membership_mode: "request",
    }),
    headers: { authorization: `Bearer ${owner.accessToken}` },
    method: "POST",
  });
  if (created.job?.status && created.job.status !== "succeeded") {
    const jobId = firstString(created.job.id);
    if (!jobId) throw new Error("community creation job id is missing");
    await waitForJob(jobId, owner.accessToken);
  }
  return rawPublicId(created.community.id, "com");
}

async function seedCommunityRules(communityId: string, owner: StoredSession): Promise<void> {
  await requestJson(`/communities/${encodeURIComponent(communityId)}/rules`, {
    body: JSON.stringify({
      rules: [{
        body: "Assistant staging smoke rule: be direct and confirm the smoke phrase when asked.",
        position: 0,
        report_reason: "Assistant smoke",
        status: "active",
        title: "Assistant smoke rule",
      }],
    }),
    headers: { authorization: `Bearer ${owner.accessToken}` },
    method: "POST",
  });
}

async function configureAssistant(communityId: string, owner: StoredSession): Promise<void> {
  await requestJson(`/communities/${encodeURIComponent(communityId)}/assistant-credential`, {
    body: JSON.stringify({ api_key: openRouterApiKey }),
    headers: { authorization: `Bearer ${owner.accessToken}` },
    method: "POST",
  });

  await requestJson(`/communities/${encodeURIComponent(communityId)}/assistant-policy`, {
    body: JSON.stringify({
      defaultPrompt: "Ask the staging assistant smoke question.",
      displayName: "Assistant Smoke",
      enabled: true,
      perUserDailyMessageCap: 5,
      selectedModelId: assistantModelId,
      shortBio: "Staging assistant smoke test.",
      starterPrompts: ["Run assistant smoke"],
      systemPrompt: [
        "You are running a staging browser E2E smoke test.",
        `For every user message, reply with exactly ${expectedAssistantText}.`,
        "Do not add any other words, punctuation, markdown, or explanation.",
      ].join("\n"),
    }),
    headers: { authorization: `Bearer ${owner.accessToken}` },
    method: "POST",
  });
}

async function cleanupAssistant(communityId: string | null, owner: StoredSession | null): Promise<void> {
  if (!communityId || !owner) return;

  await requestJson(`/communities/${encodeURIComponent(communityId)}/assistant-credential/revoke`, {
    body: JSON.stringify({}),
    headers: { authorization: `Bearer ${owner.accessToken}` },
    method: "POST",
  }).catch(() => undefined);

  await requestJson(`/communities/${encodeURIComponent(communityId)}/assistant-policy`, {
    body: JSON.stringify({ enabled: false }),
    headers: { authorization: `Bearer ${owner.accessToken}` },
    method: "POST",
  }).catch(() => undefined);
}

test.describe("live staging community assistant", () => {
  test.skip(process.env.E2E_LIVE_STAGING !== "true", "Set E2E_LIVE_STAGING=true to run real staging mutations.");
  test.skip(!liveSecretsPresent, "Live staging JWT secrets are not available.");
  test.skip(!openRouterApiKey, "E2E_OPENROUTER_API_KEY is required.");

  test("configures a real assistant and chats through the member UI", async ({ page }, testInfo) => {
    testInfo.setTimeout(240_000);

    const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    let owner: StoredSession | null = null;
    let communityId: string | null = null;

    try {
      owner = await createLiveSession(`assistant-smoke-owner-${runId}`);
      await completeSelfVerification(owner);

      communityId = await createAssistantSmokeCommunity(runId, owner);
      const communityName = `Assistant E2E Smoke ${runId}`;
      await seedCommunityRules(communityId, owner);
      await configureAssistant(communityId, owner);

      await installStoredSession(page, owner);
      await page.goto(`/c/${pathSegment(communityId)}`);
      await expect(page.locator("body")).toContainText(communityName, { timeout: 30_000 });
      await page.goto("/chat");
      const assistantThread = page.getByRole("button").filter({ hasText: communityName }).first();
      await expect(assistantThread).toBeVisible({ timeout: 30_000 });
      await assistantThread.click();
      await expect(page.locator("body")).toContainText("Assistant Smoke");

      await page.getByRole("textbox", { name: /message/i }).fill("Run the assistant staging smoke.");
      await page.getByRole("button", { name: /send message/i }).click();
      await expect(page.locator("body")).toContainText(expectedAssistantText, { timeout: 45_000 });

      await page.reload();
      await expect(page.locator("body")).toContainText(expectedAssistantText, { timeout: 30_000 });
      await expectNoBrowserError(page);
    } finally {
      await cleanupAssistant(communityId, owner);
    }
  });
});
