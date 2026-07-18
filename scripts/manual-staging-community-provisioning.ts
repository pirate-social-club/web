import { createHmac } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const DEFAULT_API_ORIGIN = "https://api-staging.pirate.sc";
const CONFIRMATION = "ALLOCATE_ONE_STAGING_D1";
const RESUME_CONFIRMATION = "RESUME_STAGING_PROVISIONING_FIXTURE";
const FIXTURE_MARKER = "automated-fixture:manual-staging-provisioning";

export type PoolCapacity = {
  allocated: number;
  free: number;
  healthy: boolean;
  quarantined: number;
  threshold: number;
  total: number;
};

type ProvisioningHealth = {
  environment: string;
  ok: boolean;
  pool_capacity: PoolCapacity;
};

type SessionExchange = { access_token: string };

type CommunityCreate = {
  community: { id: string };
  job?: { error_code?: string | null; id?: string; status?: string };
};

type CommunityPreview = {
  description?: string | null;
  display_name?: string | null;
  id: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
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

export function assertOneBindingBudget(value: string | undefined): number {
  const budget = Number.parseInt(value ?? "", 10);
  if (budget !== 1) {
    throw new Error(`allocation budget must be exactly 1, received ${value ?? "<unset>"}`);
  }
  return budget;
}

export function assertResumeBudget(value: string | undefined): number {
  const budget = Number.parseInt(value ?? "", 10);
  if (budget !== 0) {
    throw new Error(`resume allocation budget must be exactly 0, received ${value ?? "<unset>"}`);
  }
  return budget;
}

export function assertCapacityBeforeAllocation(capacity: PoolCapacity, budget: number): void {
  for (const key of ["allocated", "free", "quarantined", "threshold", "total"] as const) {
    if (!Number.isSafeInteger(capacity[key]) || capacity[key] < 0) {
      throw new Error(`pool capacity ${key} is invalid`);
    }
  }
  if (!capacity.healthy) throw new Error("staging provisioning pool is unhealthy");
  if (capacity.free - budget < capacity.threshold) {
    throw new Error(
      `allocation would cross the safety threshold: free=${capacity.free}, budget=${budget}, threshold=${capacity.threshold}`,
    );
  }
}

export function assertSingleAllocation(before: PoolCapacity, after: PoolCapacity): void {
  if (after.total !== before.total) throw new Error("pool total changed during provisioning canary");
  if (after.allocated !== before.allocated + 1 || after.free !== before.free - 1) {
    throw new Error(
      `expected exactly one allocation; before=${JSON.stringify(before)} after=${JSON.stringify(after)}`,
    );
  }
}

export function assertNoAllocation(before: PoolCapacity, after: PoolCapacity): void {
  if (after.total !== before.total || after.allocated !== before.allocated || after.free !== before.free) {
    throw new Error(`resume unexpectedly changed pool capacity; before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
  }
}

async function requestJson<T>(apiOrigin: string, path: string, init: RequestInit = {}, ok = [200, 201, 202]): Promise<T> {
  const response = await fetch(new URL(path, apiOrigin), {
    ...init,
    headers: {
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const text = await response.text();
  const body = (text.trim() ? JSON.parse(text) : null) as T;
  if (!ok.includes(response.status)) {
    throw new Error(`${init.method ?? "GET"} ${path} failed with ${response.status}: ${text}`);
  }
  return body;
}

async function provisioningHealth(apiOrigin: string): Promise<ProvisioningHealth> {
  const health = await requestJson<ProvisioningHealth>(apiOrigin, "/health/provisioning", {
    headers: { "cache-control": "no-cache" },
  });
  if (!health.ok || health.environment !== "staging" || !health.pool_capacity) {
    throw new Error(`unexpected provisioning health response: ${JSON.stringify(health)}`);
  }
  return health;
}

function mintUpstreamJwt(subject: string): string {
  const now = Math.floor(Date.now() / 1000);
  return signHs256Jwt({
    aud: requiredEnv("AUTH_UPSTREAM_JWT_AUDIENCE"),
    exp: now + 15 * 60,
    iat: now,
    iss: requiredEnv("AUTH_UPSTREAM_JWT_ISSUER"),
    sub: subject,
  }, requiredEnv("AUTH_UPSTREAM_JWT_SHARED_SECRET"));
}

async function createSession(apiOrigin: string, subject: string): Promise<string> {
  const session = await requestJson<SessionExchange>(apiOrigin, "/auth/session/exchange", {
    body: JSON.stringify({ proof: { jwt: mintUpstreamJwt(subject), type: "jwt_based_auth" } }),
    method: "POST",
  });
  if (!session.access_token) throw new Error("session exchange did not return an access token");
  return session.access_token;
}

async function completeSelfVerification(apiOrigin: string, token: string): Promise<void> {
  const started = await requestJson<{ id?: string; verification_session_id?: string }>(
    apiOrigin,
    "/verification-sessions",
    {
      body: JSON.stringify({ provider: "self" }),
      headers: { authorization: `Bearer ${token}` },
      method: "POST",
    },
  );
  const id = started.id ?? started.verification_session_id;
  if (!id) throw new Error("verification session id is missing");
  await requestJson(apiOrigin, `/verification-sessions/${encodeURIComponent(id)}/complete`, {
    body: JSON.stringify({}),
    headers: { authorization: `Bearer ${token}` },
    method: "POST",
  });
}

async function waitForJob(apiOrigin: string, jobId: string, token: string): Promise<void> {
  const deadline = Date.now() + 180_000;
  let lastStatus = "unknown";
  while (Date.now() < deadline) {
    const job = await requestJson<{ error_code?: string | null; id: string; status: string }>(
      apiOrigin,
      `/jobs/${encodeURIComponent(jobId)}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    lastStatus = job.status;
    if (job.status === "succeeded") return;
    if (job.status === "failed") throw new Error(`provisioning job failed: ${job.error_code ?? "unknown"}`);
    await Bun.sleep(3_000);
  }
  throw new Error(`provisioning job timed out; last status ${lastStatus}`);
}

async function waitForPreview(
  apiOrigin: string,
  communityId: string,
  token: string,
  expectedDescription?: string,
): Promise<CommunityPreview> {
  const deadline = Date.now() + 60_000;
  let lastBody = "";
  while (Date.now() < deadline) {
    const response = await fetch(new URL(`/communities/${encodeURIComponent(communityId)}/preview`, apiOrigin), {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        "cache-control": "no-cache",
      },
    });
    lastBody = await response.text();
    if (response.ok) {
      const preview = JSON.parse(lastBody) as CommunityPreview;
      if (!expectedDescription || preview.description === expectedDescription) return preview;
    }
    await Bun.sleep(2_000);
  }
  throw new Error(`community preview did not converge: ${lastBody}`);
}

async function writeArtifact(path: string, value: Record<string, unknown>): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function main(): Promise<void> {
  const resumeCommunityId = process.env.PIRATE_PROVISIONING_RESUME_COMMUNITY_ID?.trim() ?? "";
  const resumeRunId = process.env.PIRATE_PROVISIONING_RESUME_RUN_ID?.trim() ?? "";
  const resume = Boolean(resumeCommunityId || resumeRunId);
  if (resume && (!resumeCommunityId || !resumeRunId)) {
    throw new Error("resume community id and run id must be supplied together");
  }
  const expectedConfirmation = resume ? RESUME_CONFIRMATION : CONFIRMATION;
  if (requiredEnv("PIRATE_PROVISIONING_CONFIRM") !== expectedConfirmation) {
    throw new Error(`PIRATE_PROVISIONING_CONFIRM must equal ${expectedConfirmation}`);
  }
  const budget = resume
    ? assertResumeBudget(process.env.PIRATE_PROVISIONING_ALLOCATION_BUDGET)
    : assertOneBindingBudget(process.env.PIRATE_PROVISIONING_ALLOCATION_BUDGET);
  const apiOrigin = process.env.E2E_API_BASE_URL?.trim() || DEFAULT_API_ORIGIN;
  if (new URL(apiOrigin).hostname !== "api-staging.pirate.sc") {
    throw new Error(`manual provisioning canary is staging-only, received ${apiOrigin}`);
  }
  const artifactPath = process.env.PIRATE_PROVISIONING_ARTIFACT_PATH?.trim()
    || "tmp/e2e-artifacts/manual-staging-provisioning.json";

  const before = (await provisioningHealth(apiOrigin)).pool_capacity;
  assertCapacityBeforeAllocation(before, budget);

  const runId = resumeRunId || `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const artifactBase = {
    allocation_budget: budget,
    capacity_before: before,
    fixture_marker: FIXTURE_MARKER,
    mode: resume ? "resume" : "allocate",
    run_id: runId,
  };
  await writeArtifact(artifactPath, {
    ...artifactBase,
    phase: "capacity_checked",
    recorded_at: new Date().toISOString(),
  });

  const token = await createSession(apiOrigin, `manual-provisioning-${runId}`);
  await completeSelfVerification(apiOrigin, token);

  const initialDescription = `${FIXTURE_MARKER}; run=${runId}; phase=created`;
  const created = resume
    ? null
    : await requestJson<CommunityCreate>(apiOrigin, "/communities", {
        body: JSON.stringify({
          database_region: "aws-us-east-1",
          description: initialDescription,
          display_name: `Manual provisioning fixture ${runId}`,
          handle_policy: { policy_template: "standard" },
          membership_mode: "request",
        }),
        headers: { authorization: `Bearer ${token}` },
        method: "POST",
      });
  const communityId = resumeCommunityId || created?.community?.id;
  if (!communityId) throw new Error("community creation did not return an id");
  await writeArtifact(artifactPath, {
    ...artifactBase,
    community_id: communityId,
    phase: "community_allocated",
    provisioning_job_id: created?.job?.id ?? null,
    recorded_at: new Date().toISOString(),
  });
  if (created && created.job?.status !== "succeeded") {
    if (!created.job?.id) throw new Error("community creation did not return a provisioning job id");
    await waitForJob(apiOrigin, created.job.id, token);
  }

  await waitForPreview(apiOrigin, communityId, token, resume ? undefined : initialDescription);
  const updatedDescription = `${FIXTURE_MARKER}; run=${runId}; phase=routed-write-verified`;
  await requestJson(apiOrigin, `/communities/${encodeURIComponent(communityId)}`, {
    body: JSON.stringify({ description: updatedDescription }),
    headers: { authorization: `Bearer ${token}` },
    method: "POST",
  });
  const preview = await waitForPreview(apiOrigin, communityId, token, updatedDescription);

  const after = (await provisioningHealth(apiOrigin)).pool_capacity;
  if (resume) assertNoAllocation(before, after);
  else assertSingleAllocation(before, after);

  const artifact = {
    ...artifactBase,
    capacity_after: after,
    community_id: communityId,
    phase: "verified",
    preview: { description: preview.description, display_name: preview.display_name, id: preview.id },
    verified_at: new Date().toISOString(),
  };
  await writeArtifact(artifactPath, artifact);
  console.log(JSON.stringify(artifact));
}

if (import.meta.main) {
  await main();
}
