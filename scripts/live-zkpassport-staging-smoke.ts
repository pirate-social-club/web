import { createHash, createHmac } from "node:crypto";
import type {
  RequestedVerificationCapability,
  SessionExchangeResponse,
  StartVerificationSessionRequest,
  VerificationRequirement,
  VerificationSession,
} from "@pirate/api-contracts";

// Starts a real staging ZKPassport web-SDK verification session, prints the
// request URL, waits for the SDK proof/result callbacks, and posts the result
// to /verification-sessions/:id/complete.
//
// Required auth: either PIRATE_ACCESS_TOKEN/ZKPASSPORT_SMOKE_ACCESS_TOKEN, or
// STAGING_TEST_JWT_SHARED_SECRET for staging_test_jwt exchange.
//
// This still requires an external proof source to open the printed URL:
// the ZKPassport app, or a ZKR/dev proof source. Opening the URL in a
// normal desktop browser only shows the ZKPassport download page and does not
// emit SDK proof/result callbacks. The script does not fabricate proofs.
// ZKPassport's dev-mode mock IDs are loaded in the mobile app; official docs
// state that mock passport proofs all use unique identifier 1, so keep the
// default subject unless intentionally testing nullifier reuse/conflict.
// Set ZKPASSPORT_SMOKE_START_ONLY=1 to stop after creating the request URL.

type ZkPassportRequestResult = {
  url: string;
  onProofGenerated: (callback: (proof: unknown) => void) => void;
  onResult: (callback: (response: { result: unknown }) => void) => void;
  onReject: (callback: () => void) => void;
  onError: (callback: (error: string) => void) => void;
};

type SmokeConfig = {
  apiBaseURL: string;
  capabilities: Array<Extract<RequestedVerificationCapability, "minimum_age" | "nationality" | "gender">>;
  minimumAge: number;
  startOnly: boolean;
  subject: string;
  timeoutMs: number;
};

const DEFAULT_API_BASE_URL = "https://api-staging.pirate.sc";
const DEFAULT_SUBJECT = "zkpassport-staging-smoke";
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DOCUMENT_CAPABILITIES = new Set(["minimum_age", "nationality", "gender"]);
const STAGING_TEST_JWT_AUDIENCE = "pirate-api-staging-test";
const STAGING_TEST_JWT_ISSUER = "pirate-staging-test-issuer";

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function requiredEnv(name: string): string {
  const value = env(name);
  if (!value) throw new Error(`${name} is required`);
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

function parseCapabilities(value: string | undefined): SmokeConfig["capabilities"] {
  const rawCapabilities = (value ?? "nationality")
    .split(",")
    .map((capability) => capability.trim())
    .filter(Boolean);
  const capabilities = rawCapabilities.length > 0 ? rawCapabilities : ["nationality"];
  for (const capability of capabilities) {
    if (!DOCUMENT_CAPABILITIES.has(capability)) {
      throw new Error(
        `Unsupported ZKPassport smoke capability "${capability}". Use nationality, minimum_age, gender, or a comma-separated combination.`,
      );
    }
  }
  return Array.from(new Set(capabilities)) as SmokeConfig["capabilities"];
}

function parsePositiveInteger(name: string, fallback: number): number {
  const value = env(name);
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function parseBooleanEnv(name: string): boolean {
  const value = env(name)?.toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function buildConfig(): SmokeConfig {
  return {
    apiBaseURL: env("E2E_API_BASE_URL") ?? env("PIRATE_API_BASE_URL") ?? DEFAULT_API_BASE_URL,
    capabilities: parseCapabilities(env("ZKPASSPORT_SMOKE_CAPABILITIES")),
    minimumAge: parsePositiveInteger("ZKPASSPORT_SMOKE_MINIMUM_AGE", 18),
    startOnly: parseBooleanEnv("ZKPASSPORT_SMOKE_START_ONLY"),
    subject: env("ZKPASSPORT_SMOKE_SUBJECT") ?? env("E2E_LIVE_STAGING_SUBJECT") ?? DEFAULT_SUBJECT,
    timeoutMs: parsePositiveInteger("ZKPASSPORT_SMOKE_TIMEOUT_MS", DEFAULT_TIMEOUT_MS),
  };
}

async function requestJson<T>(
  apiBaseURL: string,
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

function mintStagingJwt(subject: string): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const walletAddress = env("E2E_LIVE_STAGING_WALLET_ADDRESS") ?? walletAddressForSubject(subject);
  return signHs256Jwt({
    aud: STAGING_TEST_JWT_AUDIENCE,
    exp: nowSeconds + 15 * 60,
    iat: nowSeconds,
    iss: STAGING_TEST_JWT_ISSUER,
    sub: subject,
    wallet_address: walletAddress,
  }, requiredEnv("STAGING_TEST_JWT_SHARED_SECRET"));
}

async function resolveAccessToken(config: SmokeConfig): Promise<string> {
  const directToken = env("PIRATE_ACCESS_TOKEN") ?? env("ZKPASSPORT_SMOKE_ACCESS_TOKEN");
  if (directToken) return directToken;

  const session = await requestJson<SessionExchangeResponse>(
    config.apiBaseURL,
    "/auth/session/exchange",
    {
      body: JSON.stringify({
        proof: {
          jwt: mintStagingJwt(config.subject),
          type: "staging_test_jwt",
        },
      }),
      method: "POST",
    },
  );
  return session.access_token;
}

function requirementsFor(config: SmokeConfig): VerificationRequirement[] {
  const requirements: VerificationRequirement[] = [];
  if (config.capabilities.includes("minimum_age")) {
    requirements.push({ minimum_age: config.minimumAge, proof_type: "minimum_age" });
  }
  return requirements;
}

function requiredMinimumAge(requirements: readonly VerificationRequirement[]): number | null {
  const ages: number[] = [];
  for (const requirement of requirements) {
    const minimumAge = requirement.proof_type === "minimum_age" ? requirement.minimum_age : undefined;
    if (Number.isInteger(minimumAge)) ages.push(minimumAge as number);
  }
  return ages.length > 0 ? Math.max(...ages) : null;
}

async function buildZkPassportRequest(session: VerificationSession): Promise<ZkPassportRequestResult> {
  const launch = session.launch?.zkpassport;
  if (!launch) throw new Error("ZKPassport launch data was not returned");

  const { ZKPassport } = await import("@zkpassport/sdk");
  const zkPassport = new ZKPassport(launch.domain);
  let builder = await zkPassport.request({
    devMode: launch.dev_mode ?? undefined,
    logo: launch.logo || "https://pirate.sc/favicon.svg",
    name: launch.name,
    purpose: launch.purpose,
    scope: launch.scope,
    validity: launch.validity_seconds ?? undefined,
  });

  builder = builder.bind("custom_data", launch.binding);
  if (launch.requested_capabilities.includes("nationality")) {
    builder = builder.disclose("nationality");
  }
  if (launch.requested_capabilities.includes("gender")) {
    builder = builder.disclose("gender");
  }
  if (launch.requested_capabilities.includes("minimum_age")) {
    const minimumAge = requiredMinimumAge(launch.verification_requirements);
    if (minimumAge == null) throw new Error("ZKPassport minimum-age launch data is incomplete");
    builder = builder.gte("age", minimumAge);
  }

  return builder.done() as ZkPassportRequestResult;
}

async function startZkPassportSession(config: SmokeConfig, accessToken: string): Promise<VerificationSession> {
  const body: StartVerificationSessionRequest = {
    provider: "zkpassport",
    provider_mode: "web_sdk",
    requested_capabilities: config.capabilities,
    verification_intent: "profile_verification",
    verification_requirements: requirementsFor(config),
  };
  return requestJson<VerificationSession>(config.apiBaseURL, "/verification-sessions", {
    body: JSON.stringify(body),
    headers: { authorization: `Bearer ${accessToken}` },
    method: "POST",
  });
}

async function completeZkPassportSession(input: {
  accessToken: string;
  apiBaseURL: string;
  proofs: unknown[];
  queryResult: unknown;
  sessionId: string;
}): Promise<VerificationSession> {
  return requestJson<VerificationSession>(input.apiBaseURL, `/verification-sessions/${encodeURIComponent(input.sessionId)}/complete`, {
    body: JSON.stringify({
      provider_payload_ref: {
        proofs: input.proofs,
        queryResult: input.queryResult,
      },
    }),
    headers: { authorization: `Bearer ${input.accessToken}` },
    method: "POST",
  });
}

async function waitForResult(input: {
  accessToken: string;
  apiBaseURL: string;
  request: ZkPassportRequestResult;
  sessionId: string;
  timeoutMs: number;
}): Promise<VerificationSession> {
  const proofs: unknown[] = [];

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out after ${input.timeoutMs}ms waiting for ZKPassport result`));
    }, input.timeoutMs);

    input.request.onProofGenerated((proof) => {
      proofs.push(proof);
      console.log(`[zkpassport] proof generated (${proofs.length})`);
    });
    input.request.onReject(() => {
      clearTimeout(timeout);
      reject(new Error("ZKPassport request was rejected"));
    });
    input.request.onError((error) => {
      clearTimeout(timeout);
      reject(new Error(error || "ZKPassport request failed"));
    });
    input.request.onResult((response) => {
      void completeZkPassportSession({
        accessToken: input.accessToken,
        apiBaseURL: input.apiBaseURL,
        proofs,
        queryResult: response.result,
        sessionId: input.sessionId,
      })
        .then((session) => {
          clearTimeout(timeout);
          resolve(session);
        })
        .catch((error: unknown) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  });
}

async function main() {
  const config = buildConfig();
  console.log(`[zkpassport] api: ${config.apiBaseURL}`);
  console.log(`[zkpassport] subject: ${config.subject}`);
  console.log(`[zkpassport] capabilities: ${config.capabilities.join(", ")}`);
  if (config.startOnly) {
    console.log("[zkpassport] start-only: true");
  }

  const accessToken = await resolveAccessToken(config);
  const session = await startZkPassportSession(config, accessToken);
  const request = await buildZkPassportRequest(session);

  console.log(`[zkpassport] session: ${session.id}`);
  console.log("[zkpassport] open this URL with ZKPassport/ZKR to complete the proof:");
  console.log(request.url);

  if (config.startOnly) {
    console.log("[zkpassport] start-only mode complete; proof/result callbacks were not awaited.");
    process.exit(0);
    return;
  }

  const completedSession = await waitForResult({
    accessToken,
    apiBaseURL: config.apiBaseURL,
    request,
    sessionId: session.id,
    timeoutMs: config.timeoutMs,
  });

  console.log(`[zkpassport] completed with status: ${completedSession.status}`);
  if (completedSession.status !== "verified") {
    throw new Error(completedSession.failure_reason || "ZKPassport session did not verify");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
