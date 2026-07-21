import { createHmac } from "node:crypto";

type Json = Record<string, unknown>;

const PRODUCTION_CONFIRMATION = "RUN_PRODUCTION_MULTIPART_CANARY";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function base64Url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64").replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}

function mintUpstreamJwt(subject: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify({
    aud: requiredEnv("AUTH_UPSTREAM_JWT_AUDIENCE"),
    exp: now + (15 * 60),
    iat: now,
    iss: requiredEnv("AUTH_UPSTREAM_JWT_ISSUER"),
    sub: subject,
  }));
  const signingInput = `${header}.${body}`;
  const signature = createHmac("sha256", requiredEnv("AUTH_UPSTREAM_JWT_SHARED_SECRET"))
    .update(signingInput)
    .digest();
  return `${signingInput}.${base64Url(signature)}`;
}

function asObject(value: unknown, label: string): Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} is not an object`);
  return value as Json;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is not a non-empty string`);
  return value.trim();
}

async function requestJson(input: {
  apiBase: string;
  body?: Json;
  method?: string;
  ok?: number[];
  path: string;
  token?: string;
}): Promise<Json> {
  const response = await fetch(new URL(input.path, input.apiBase), {
    method: input.method ?? (input.body ? "POST" : "GET"),
    headers: {
      accept: "application/json",
      ...(input.body ? { "content-type": "application/json" } : {}),
      ...(input.token ? { authorization: `Bearer ${input.token}` } : {}),
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
  });
  const text = await response.text();
  const parsed = text.trim() ? JSON.parse(text) as Json : {};
  if (!(input.ok ?? [200, 201, 202]).includes(response.status)) {
    throw new Error(`${input.method ?? (input.body ? "POST" : "GET")} ${input.path} failed with ${response.status}: ${text.slice(0, 800)}`);
  }
  return parsed;
}

async function createSession(apiBase: string, subject: string): Promise<string> {
  const exchanged = await requestJson({
    apiBase,
    body: { proof: { jwt: mintUpstreamJwt(subject), type: "jwt_based_auth" } },
    path: "/auth/session/exchange",
  });
  return asString(exchanged.access_token, "session access_token");
}

function providerCode(text: string): string | null {
  const code = text.match(/<Code>([^<]+)<\/Code>/iu)?.[1]?.trim();
  return code && /^[a-z][a-z0-9]{0,63}$/iu.test(code) ? code : null;
}

async function main(): Promise<void> {
  const apiBase = requiredEnv("PIRATE_MULTIPART_CANARY_API_BASE_URL").replace(/\/$/u, "");
  const production = new URL(apiBase).hostname === "api.pirate.sc";
  if (production && process.env.PIRATE_MULTIPART_CANARY_CONFIRM_PRODUCTION !== PRODUCTION_CONFIRMATION) {
    throw new Error(`production requires PIRATE_MULTIPART_CANARY_CONFIRM_PRODUCTION=${PRODUCTION_CONFIRMATION}`);
  }

  const subject = requiredEnv("PIRATE_MULTIPART_CANARY_SUBJECT");
  const token = await createSession(apiBase, subject);
  const communityId = requiredEnv("PIRATE_MULTIPART_CANARY_COMMUNITY_ID");

  const bytes = new TextEncoder().encode(`pirate multipart canary ${new Date().toISOString()}\n`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const contentHash = `0x${Buffer.from(digest).toString("hex")}`;
  const upload = await requestJson({
    apiBase,
    body: {
      artifact_kind: "primary_video",
      content_hash: contentHash,
      filename: `multipart-canary-${Date.now()}.webm`,
      mime_type: "video/webm",
      size_bytes: bytes.byteLength,
      upload_mode: "direct_multipart",
    },
    path: `/communities/${encodeURIComponent(communityId)}/song-artifact-uploads`,
    token,
  });
  const uploadId = asString(upload.id, "upload id");
  const uploadSession = asObject(upload.upload_session, "upload session");
  const sessionId = asString(uploadSession.id, "upload session id");

  try {
    const signed = await requestJson({
      apiBase,
      method: "GET",
      path: `/communities/${encodeURIComponent(communityId)}/song-artifact-uploads/${encodeURIComponent(uploadId)}/sessions/${encodeURIComponent(sessionId)}/parts/1/signed-url`,
      token,
    });
    const response = await fetch(asString(signed.url, "signed part URL"), {
      body: bytes,
      headers: { "content-type": "video/webm" },
      method: "PUT",
    });
    if (!response.ok || !response.headers.get("etag")) {
      const text = await response.text().catch(() => "");
      const code = providerCode(text);
      throw new Error(`production multipart part PUT failed with ${response.status}${code ? ` (${code})` : ""}`);
    }
  } finally {
    await requestJson({
      apiBase,
      body: {},
      path: `/communities/${encodeURIComponent(communityId)}/song-artifact-uploads/${encodeURIComponent(uploadId)}/sessions/${encodeURIComponent(sessionId)}/abort`,
      token,
    });
  }

  console.log("[multipart-canary] signed PUT succeeded and session was aborted");
}

if (import.meta.main) await main();
