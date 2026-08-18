import { createHash, createHmac } from "node:crypto";
import http from "node:http";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const LOCAL_SOLID_EDGE_HMAC_KEY = "solid-i3-local-test-hmac-key-20260817";
const LOCAL_COMPATIBILITY_DATE = "2026-04-16";
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const HNS_CONTEXT_HEADERS = [
  "x-pirate-hns-trusted-forwarder",
  "x-pirate-hns-host",
  "x-pirate-hns-root",
  "x-pirate-hns-community-id",
  "x-pirate-hns-community-route",
  "x-pirate-hns-subdomain",
  "x-pirate-hns-wallet-interactive",
];
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Unable to allocate a loopback port"));
        return;
      }
      server.close(() => resolve(address.port));
    });
  });
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("Request body is too large"), { statusCode: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function headerValue(headers, name) {
  const value = headers[name];
  if (Array.isArray(value)) return value[0]?.trim() ?? "";
  return value?.trim() ?? "";
}

function canonicalUrlFor(request) {
  const host = headerValue(request.headers, "host") || "app.example.hns";
  return `http://${host}${request.url ?? "/"}`;
}

function signRequest(request, body) {
  const timestamp = Math.floor(Date.now() / 1_000);
  const url = new URL(canonicalUrlFor(request));
  const bodyDigest = request.method === "GET" || request.method === "HEAD" || body.length === 0
    ? ""
    : createHash("sha256").update(body).digest("hex");
  const canonical = JSON.stringify([
    "pirate-solid-edge-auth-v1",
    timestamp,
    request.method.toUpperCase(),
    url.toString(),
    `${url.pathname}${url.search}`,
    bodyDigest,
    HNS_CONTEXT_HEADERS.map(header => headerValue(request.headers, header)),
  ]);
  const signature = createHmac("sha256", LOCAL_SOLID_EDGE_HMAC_KEY)
    .update(canonical)
    .digest("base64url");
  return {
    timestamp: String(timestamp),
    signature: `v1=${signature}`,
  };
}

function publicResponseHeaders(headers) {
  const output = {};
  for (const [rawName, rawValue] of Object.entries(headers)) {
    const name = rawName.toLowerCase();
    if (name === "set-cookie" || HOP_BY_HOP_HEADERS.has(name)
      || name.startsWith("x-seam-")
      || name.startsWith("x-solid-")
      || name.startsWith("x-pirate-solid-")
      || name.startsWith("x-internal-")) continue;
    output[rawName] = rawValue;
  }
  return output;
}

function requestWorker(workerPort, request, body, signed) {
  return new Promise((resolve, reject) => {
    const headers = { ...request.headers };
    delete headers.connection;
    delete headers["content-length"];
    headers.host = headerValue(request.headers, "host") || "app.example.hns";
    if (signed) {
      const auth = signRequest(request, body);
      headers["x-pirate-solid-edge-timestamp"] = auth.timestamp;
      headers["x-pirate-solid-edge-signature"] = auth.signature;
    }
    if (body.length > 0) headers["content-length"] = String(body.length);
    const upstream = http.request({
      hostname: "127.0.0.1",
      port: workerPort,
      path: request.url ?? "/",
      method: request.method ?? "GET",
      headers,
    }, response => {
      const chunks = [];
      response.on("data", chunk => chunks.push(chunk));
      response.on("end", () => resolve({
        status: response.statusCode ?? 0,
        headers: response.headers,
        body: Buffer.concat(chunks),
      }));
    });
    upstream.on("error", reject);
    upstream.end(body);
  });
}

function streamWorkerResponse(workerPort, request, body, signed, response) {
  return new Promise((resolve, reject) => {
    const headers = { ...request.headers };
    delete headers.connection;
    delete headers["content-length"];
    headers.host = headerValue(request.headers, "host") || "app.example.hns";
    if (signed) {
      const auth = signRequest(request, body);
      headers["x-pirate-solid-edge-timestamp"] = auth.timestamp;
      headers["x-pirate-solid-edge-signature"] = auth.signature;
    }
    if (body.length > 0) headers["content-length"] = String(body.length);
    const upstream = http.request({
      hostname: "127.0.0.1",
      port: workerPort,
      path: request.url ?? "/",
      method: request.method ?? "GET",
      headers,
    }, upstreamResponse => {
      response.writeHead(upstreamResponse.statusCode ?? 502, publicResponseHeaders(upstreamResponse.headers));
      upstreamResponse.on("data", chunk => response.write(chunk));
      upstreamResponse.on("end", () => {
        response.end();
        resolve();
      });
      upstreamResponse.on("error", reject);
    });
    upstream.on("error", reject);
    upstream.end(body);
  });
}

function createApiFixtureServer(port) {
  const video = {
    post: {
      post: {
        id: "post_fixture_video",
        object: "post",
        community: "community_fixture",
        authorship_mode: "human_direct",
        identity_mode: "public",
        post_type: "video",
        status: "published",
        visibility: "public",
        analysis_state: "allow",
        content_safety_state: "safe",
        age_gate_policy: "none",
        created: 1,
        title: "Boundary fixture video",
        caption: "Local Worker boundary fixture",
        author_user: "usr_fixture",
        author_public_handle: "fixture",
        media_refs: [{ mime_type: "video/mp4", storage_ref: "/fixture.mp4" }],
      },
      comment_count: 0,
      like_count: 0,
      upvote_count: 0,
      thread_snapshot: null,
      downvote_count: 0,
      viewer_vote: null,
      viewer_reaction_kinds: [],
      resolved_locale: "en",
      translation_state: "same_language",
      machine_translated: false,
      source_hash: "fixture",
    },
    community: {
      id: "community_fixture",
      object: "home_feed_community_summary",
      display_name: "Boundary fixture",
      route_slug: "demo",
      avatar_ref: null,
    },
  };
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
    response.setHeader("content-type", "application/json");
    response.setHeader("access-control-allow-origin", "*");
    if (request.method === "GET" && url.pathname === "/__version") {
      response.end(JSON.stringify({ service: "api", version: "fixture" }));
      return;
    }
    if (request.method === "GET" && url.pathname === "/public-profiles/demo-user") {
      response.end(JSON.stringify({
        profile: {
          id: "usr_demo_user",
          object: "profile",
          display_name: "demo-user",
          avatar_ref: null,
          avatar_source: null,
          cover_ref: null,
          cover_source: null,
          bio: null,
          bio_source: null,
          preferred_locale: "en",
          global_handle: { id: "gh_demo_user", object: "global_handle", label: "demo-user", status: "active" },
          created: 1,
        },
        requested_handle_label: "demo-user",
        resolved_handle_label: "demo-user",
        is_canonical: true,
        created_communities: [],
      }));
      return;
    }
    if (request.method === "GET" && url.pathname === "/feed/home/public") {
      response.end(JSON.stringify({ items: [video], top_communities: [], next_cursor: null }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ code: "not_found", message: "fixture route not found", retryable: false }));
  });
  return {
    async listen() {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", resolve);
      });
    },
    async close() {
      if (!server.listening) return;
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    },
  };
}

async function waitForWorker(worker, workerPort, output) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (worker.exitCode !== null) throw new Error(`Local Solid Worker exited:\n${output.join("")}`);
    try {
      const response = await new Promise((resolve, reject) => {
        const request = http.request({ hostname: "127.0.0.1", port: workerPort, path: "/", headers: { host: "app.example.hns" } }, resolve);
        request.on("error", reject);
        request.end();
      });
      response.resume();
      if (response.statusCode) return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  throw new Error(`Local Solid Worker did not start within 30s:\n${output.join("")}`);
}

export async function startSolidBoundaryHarness(options = {}) {
  const workerPort = options.workerPort ?? await freePort();
  const gatewayPort = options.gatewayPort ?? await freePort();
  const apiPort = options.apiPort ?? 8787;
  const workerConfig = path.join(repoRoot, "solid/dist/ssr/wrangler.json");
  const output = [];
  const worker = spawn("bunx", [
    "wrangler@4.123.0", "dev", "--config", workerConfig, "--local", "--port", String(workerPort),
    "--compatibility-date", LOCAL_COMPATIBILITY_DATE,
    "--var", "SOLID_ENV:local",
    "--var", `SOLID_EDGE_HMAC_KEY:${LOCAL_SOLID_EDGE_HMAC_KEY}`,
    "--var", "SOLID_EDGE_MAX_CLOCK_SKEW_SECONDS:300",
    "--no-show-interactive-dev-session",
  ], {
    // Resolve Wrangler from the Solid package install. The root Web install
    // pins a different undici/Miniflare graph for the React Worker; using it
    // here can bundle an incompatible webidl implementation into workerd.
    cwd: path.resolve(repoRoot, "solid"),
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  worker.stdout.on("data", chunk => output.push(chunk.toString()));
  worker.stderr.on("data", chunk => output.push(chunk.toString()));
  let apiFixture = null;
  if (options.startApiFixture !== false) {
    apiFixture = createApiFixtureServer(apiPort);
    await apiFixture.listen();
  }
  await waitForWorker(worker, workerPort, output);

  const gateway = http.createServer(async (request, response) => {
    try {
      if (request.url === "/fixture.mp4") {
        response.writeHead(200, { "cache-control": "no-store", "content-type": "video/mp4" });
        response.end();
        return;
      }
      const body = await readRequestBody(request);
      await streamWorkerResponse(workerPort, request, body, true, response);
    } catch (error) {
      if (response.headersSent) return;
      response.writeHead(error.statusCode ?? 502, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
      response.end(error.message);
    }
  });
  await new Promise((resolve, reject) => {
    gateway.once("error", reject);
    gateway.listen(gatewayPort, "127.0.0.1", resolve);
  });

  return {
    baseUrl: `http://127.0.0.1:${gatewayPort}`,
    workerUrl: `http://127.0.0.1:${workerPort}`,
    async unsigned(pathname = "/", headers = {}) {
      const request = { method: "GET", url: pathname, headers: { host: "app.example.hns", ...headers } };
      return requestWorker(workerPort, request, Buffer.alloc(0), false);
    },
    async close() {
      await new Promise(resolve => gateway.close(() => resolve()));
      await apiFixture?.close();
      if (worker.exitCode === null) worker.kill("SIGTERM");
    },
  };
}
