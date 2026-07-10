import { createHash, createHmac, generateKeyPairSync } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn, type ChildProcess } from "node:child_process";
import { expect, test } from "@playwright/test";
import type { SessionExchangeResponse } from "@pirate/api-contracts";

import {
  expectNoBrowserError,
  pathSegment,
} from "./fixtures/e2e-helpers";
import {
  createStoredSessionFromExchange,
  installStoredSession,
  type StoredSession,
} from "./fixtures/session";

const enabled = process.env.E2E_LOCAL_ASSISTANT === "true";
const expectedAssistantText = "LOCAL_ASSISTANT_E2E_OK";
const localAssistantModelId = "test/local-community-assistant";
const localOpenRouterKey = "sk-or-local-assistant-e2e-key";
const localJwtIssuer = "pirate-dev";
const localJwtAudience = "pirate-api";
const localJwtSecret = "local-assistant-e2e-shared-secret";
const apiRequestTimeoutMs = 30_000;
const localPirateAppJwtKeyPair = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { format: "pem", type: "pkcs8" },
  publicKeyEncoding: { format: "pem", type: "spki" },
});

type OpenRouterCall = {
  authorization: string | null;
  body: {
    messages?: Array<{ content?: unknown; role?: unknown }>;
    model?: unknown;
  };
  path: string;
};

type ManagedProcess = {
  child: ChildProcess;
  logs: string[];
  name: string;
};

type LocalAssistantStack = {
  apiOrigin: string;
  openRouterCalls: OpenRouterCall[];
  stop: () => Promise<void>;
  webOrigin: string;
};

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

function mintLocalJwt(subject: string): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return signHs256Jwt({
    aud: localJwtAudience,
    exp: nowSeconds + 15 * 60,
    iat: nowSeconds,
    iss: localJwtIssuer,
    sub: subject,
    wallet_address: walletAddressForSubject(subject),
  }, localJwtSecret);
}

async function findAvailablePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  if (!address || typeof address === "string") {
    throw new Error("expected TCP server address");
  }
  return address.port;
}

async function waitForHttp(url: string, input: { timeoutMs: number }): Promise<void> {
  const deadline = Date.now() + input.timeoutMs;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const message = lastError instanceof Error ? lastError.message : String(lastError ?? "unknown error");
  throw new Error(`Timed out waiting for ${url}: ${message}`);
}

function spawnManagedProcess(input: {
  args: string[];
  command: string;
  cwd: string;
  env?: Record<string, string>;
  name: string;
}): ManagedProcess {
  const logs: string[] = [];
  const child = spawn(input.command, input.args, {
    cwd: input.cwd,
    env: {
      ...process.env,
      ...input.env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout?.on("data", (chunk) => logs.push(String(chunk)));
  child.stderr?.on("data", (chunk) => logs.push(String(chunk)));

  return {
    child,
    logs,
    name: input.name,
  };
}

async function stopManagedProcess(processInfo: ManagedProcess): Promise<void> {
  if (processInfo.child.exitCode != null || processInfo.child.killed) {
    return;
  }

  processInfo.child.kill("SIGTERM");
  const exited = await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => resolve(false), 5_000);
    processInfo.child.once("exit", () => {
      clearTimeout(timeout);
      resolve(true);
    });
  });
  if (!exited && processInfo.child.exitCode == null && !processInfo.child.killed) {
    processInfo.child.kill("SIGKILL");
  }
}

async function startMockOpenRouterServer(): Promise<{
  calls: OpenRouterCall[];
  origin: string;
  stop: () => Promise<void>;
}> {
  const calls: OpenRouterCall[] = [];
  const server = createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/api/v1/chat/completions") {
      res.statusCode = 404;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: { message: "not found" } }));
      return;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as OpenRouterCall["body"];
    calls.push({
      authorization: req.headers.authorization ?? null,
      body,
      path: req.url,
    });

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({
      id: `chatcmpl_local_assistant_${calls.length}`,
      choices: [{
        message: {
          content: expectedAssistantText,
          role: "assistant",
        },
      }],
      usage: {
        completion_tokens: 3,
        prompt_tokens: 12,
        total_tokens: 15,
      },
    }));
  });

  const origin = await new Promise<string>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("expected TCP server address"));
        return;
      }
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });

  return {
    calls,
    origin,
    stop: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    },
  };
}

async function startLocalAssistantStack(): Promise<LocalAssistantStack> {
  const webRoot = fileURLToPath(new URL("../", import.meta.url));
  const apiRoot = fileURLToPath(new URL("../../api/services/api/", import.meta.url));
  const tempRoot = await mkdtemp(join(tmpdir(), "pirate-assistant-e2e-"));
  const apiPort = await findAvailablePort();
  const webPort = await findAvailablePort();
  const apiOrigin = `http://127.0.0.1:${apiPort}`;
  const webOrigin = `http://127.0.0.1:${webPort}`;
  const openRouter = await startMockOpenRouterServer();
  const processes: ManagedProcess[] = [];

  try {
    processes.push(spawnManagedProcess({
      args: ["run", "scripts/serve-local.ts"],
      command: "bun",
      cwd: apiRoot,
      env: {
        AUTH_UPSTREAM_JWT_AUDIENCE: localJwtAudience,
        AUTH_UPSTREAM_JWT_ISSUER: localJwtIssuer,
        AUTH_UPSTREAM_JWT_SHARED_SECRET: localJwtSecret,
        CONTROL_PLANE_DATABASE_URL: pathToFileURL(join(tempRoot, "control-plane.db")).href,
        CORS_ALLOWED_ORIGINS: `${webOrigin},http://localhost:${webPort}`,
        LOCAL_COMMUNITY_DB_ROOT: join(tempRoot, "community-dbs"),
        OPENROUTER_BASE_URL: `${openRouter.origin}/api/v1`,
        PIRATE_APP_JWT_PRIVATE_KEY: localPirateAppJwtKeyPair.privateKey,
        PIRATE_APP_JWT_PUBLIC_KEY: localPirateAppJwtKeyPair.publicKey,
        PIRATE_API_PUBLIC_ORIGIN: apiOrigin,
        PIRATE_DEV_USE_REMOTE_CONTROL_PLANE: "true",
        PORT: String(apiPort),
      },
      name: "api",
    }));
    await waitForHttp(`${apiOrigin}/health`, { timeoutMs: 60_000 });

    processes.push(spawnManagedProcess({
      args: ["x", "vite", "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"],
      command: "bun",
      cwd: webRoot,
      env: {
        VITE_PIRATE_API_BASE_URL: apiOrigin,
      },
      name: "web",
    }));
    await waitForHttp(webOrigin, { timeoutMs: 60_000 });

    return {
      apiOrigin,
      openRouterCalls: openRouter.calls,
      stop: async () => {
        await Promise.all(processes.reverse().map(stopManagedProcess));
        await openRouter.stop();
        await rm(tempRoot, { force: true, recursive: true });
      },
      webOrigin,
    };
  } catch (error) {
    await Promise.all(processes.reverse().map(stopManagedProcess));
    await openRouter.stop().catch(() => undefined);
    await rm(tempRoot, { force: true, recursive: true }).catch(() => undefined);
    const logTail = processes
      .map((processInfo) => [
        `--- ${processInfo.name} logs ---`,
        processInfo.logs.join("").slice(-4_000),
      ].join("\n"))
      .join("\n");
    throw new Error(`${error instanceof Error ? error.message : String(error)}\n${logTail}`);
  }
}

async function requestJson<T>(
  apiOrigin: string,
  path: string,
  init: RequestInit = {},
  okStatuses = [200, 201, 202],
): Promise<T> {
  const method = init.method ?? "GET";
  let response: Response;
  try {
    response = await fetch(new URL(path, apiOrigin), {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(apiRequestTimeoutMs),
      headers: {
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${method} ${path} failed before response: ${message}`);
  }
  const text = await response.text();
  const body = (text.trim() ? JSON.parse(text) : null) as T;
  if (!okStatuses.includes(response.status)) {
    throw new Error(`${method} ${path} failed with ${response.status}: ${text}`);
  }
  return body;
}

async function createLocalSession(apiOrigin: string, subject: string): Promise<StoredSession> {
  const response = await requestJson<SessionExchangeResponse>(apiOrigin, "/auth/session/exchange", {
    body: JSON.stringify({
      proof: {
        jwt: mintLocalJwt(subject),
        type: "jwt_based_auth",
      },
    }),
    method: "POST",
  });

  return createStoredSessionFromExchange(response);
}

async function createAssistantCommunity(apiOrigin: string, runId: string, owner: StoredSession): Promise<string> {
  const created = await requestJson<{ community: { id: string }; job?: { id?: string; status?: string } }>(apiOrigin, "/communities", {
    body: JSON.stringify({
      display_name: `Local Assistant E2E ${runId}`,
      handle_policy: { policy_template: "standard" },
      membership_mode: "request",
    }),
    headers: { authorization: `Bearer ${owner.accessToken}` },
    method: "POST",
  });
  expect(created.job?.status).toBe("succeeded");
  return rawPublicId(created.community.id, "com");
}

async function seedCommunityRules(apiOrigin: string, communityId: string, owner: StoredSession): Promise<void> {
  await requestJson(apiOrigin, `/communities/${encodeURIComponent(communityId)}/rules`, {
    body: JSON.stringify({
      rules: [{
        body: "Local assistant E2E rule: answer with the configured local smoke phrase.",
        position: 0,
        report_reason: "Assistant local smoke",
        status: "active",
        title: "Local assistant smoke rule",
      }],
    }),
    headers: { authorization: `Bearer ${owner.accessToken}` },
    method: "POST",
  });
}

async function configureAssistant(apiOrigin: string, communityId: string, owner: StoredSession): Promise<void> {
  await requestJson(apiOrigin, `/communities/${encodeURIComponent(communityId)}/assistant-credential`, {
    body: JSON.stringify({ api_key: localOpenRouterKey }),
    headers: { authorization: `Bearer ${owner.accessToken}` },
    method: "POST",
  });

  await requestJson(apiOrigin, `/communities/${encodeURIComponent(communityId)}/assistant-policy`, {
    body: JSON.stringify({
      defaultPrompt: "Ask the local assistant smoke question.",
      displayName: "Local Assistant Smoke",
      enabled: true,
      perUserDailyMessageCap: 5,
      selectedModelId: localAssistantModelId,
      shortBio: "Local assistant smoke test.",
      starterPrompts: ["Run local assistant smoke"],
      systemPrompt: [
        "You are running a local browser E2E smoke test.",
        `For every user message, reply with exactly ${expectedAssistantText}.`,
        "Do not add any other words, punctuation, markdown, or explanation.",
      ].join("\n"),
    }),
    headers: { authorization: `Bearer ${owner.accessToken}` },
    method: "POST",
  });
}

async function cleanupAssistant(apiOrigin: string, communityId: string | null, owner: StoredSession | null): Promise<void> {
  if (!communityId || !owner) return;

  await requestJson(apiOrigin, `/communities/${encodeURIComponent(communityId)}/assistant-credential/revoke`, {
    body: JSON.stringify({}),
    headers: { authorization: `Bearer ${owner.accessToken}` },
    method: "POST",
  }).catch(() => undefined);

  await requestJson(apiOrigin, `/communities/${encodeURIComponent(communityId)}/assistant-policy`, {
    body: JSON.stringify({ enabled: false }),
    headers: { authorization: `Bearer ${owner.accessToken}` },
    method: "POST",
  }).catch(() => undefined);
}

test.describe("local community assistant full-stack E2E", () => {
  test.describe.configure({ timeout: 240_000 });
  test.skip(!enabled, "Set E2E_LOCAL_ASSISTANT=true to run the local assistant full-stack E2E.");

  let stack: LocalAssistantStack | null = null;

  test.beforeAll(async () => {
    stack = await startLocalAssistantStack();
  });

  test.afterAll(async () => {
    await stack?.stop();
  });

  test("saves an encrypted key, chats through mocked OpenRouter, and restores history after reload", async ({ page }, testInfo) => {
    testInfo.setTimeout(180_000);
    if (!stack) throw new Error("local assistant stack was not started");

    const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    let owner: StoredSession | null = null;
    let communityId: string | null = null;

    try {
      owner = await createLocalSession(stack.apiOrigin, `local-assistant-owner-${runId}`);

      communityId = await createAssistantCommunity(stack.apiOrigin, runId, owner);
      const communityName = `Local Assistant E2E ${runId}`;
      await seedCommunityRules(stack.apiOrigin, communityId, owner);
      await configureAssistant(stack.apiOrigin, communityId, owner);

      await installStoredSession(page, owner);
      await page.goto(`${stack.webOrigin}/c/${pathSegment(communityId)}`);
      await expect(page.locator("body")).toContainText(communityName, { timeout: 30_000 });
      await page.goto(`${stack.webOrigin}/chat`);
      const assistantThread = page.getByRole("button").filter({ hasText: communityName }).first();
      await expect(assistantThread).toBeVisible({ timeout: 30_000 });
      await assistantThread.click();
      await expect(page.locator("body")).toContainText("Local Assistant Smoke");

      await page.getByRole("textbox", { name: /message/i }).fill("Run the local assistant smoke.");
      await page.getByRole("button", { name: /send message/i }).click();
      await expect(page.locator("body")).toContainText(expectedAssistantText, { timeout: 30_000 });

      expect(stack.openRouterCalls).toHaveLength(1);
      const call = stack.openRouterCalls[0];
      expect(call?.authorization).toBe(`Bearer ${localOpenRouterKey}`);
      expect(call?.body.model).toBe(localAssistantModelId);
      const systemMessage = call?.body.messages?.find((message) => message.role === "system");
      expect(String(systemMessage?.content ?? "")).toContain("Local assistant E2E rule");

      await page.reload();
      await expect(page.locator("body")).toContainText(expectedAssistantText, { timeout: 30_000 });
      await expectNoBrowserError(page);
    } finally {
      await cleanupAssistant(stack.apiOrigin, communityId, owner);
    }
  });
});
