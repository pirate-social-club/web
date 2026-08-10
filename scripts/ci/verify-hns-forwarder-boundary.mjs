import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

export const FORGED_CONTEXT = Object.freeze({
  communityId: "com_cmt_forged_context_probe",
  host: "app.forged-context-probe",
  root: "forged-context-probe",
  route: "forged-context-probe",
});

const PROBE_VARIANTS = ["unsigned", "malformed-signature"];
const MAX_ATTEMPTS = 3;

export function buildForgedHeaders(
  variant,
  timestampSeconds = Math.floor(Date.now() / 1_000),
  pathAndQuery = "/",
) {
  assert(PROBE_VARIANTS.includes(variant), `Unknown probe variant: ${variant}`);
  const headers = new Headers({
    accept: "text/html",
    "cache-control": "no-cache",
    "x-forwarded-for": "94.103.168.161",
    "x-pirate-hns-community-id": FORGED_CONTEXT.communityId,
    "x-pirate-hns-community-route": FORGED_CONTEXT.route,
    "x-pirate-hns-host": FORGED_CONTEXT.host,
    "x-pirate-hns-root": FORGED_CONTEXT.root,
    "x-pirate-hns-subdomain": "app",
    "x-pirate-hns-wallet-interactive": "1",
  });

  if (variant === "malformed-signature") {
    headers.set("x-pirate-hns-forwarder-path", pathAndQuery);
    headers.set("x-pirate-hns-forwarder-signature", `v1=${"0".repeat(64)}`);
    headers.set("x-pirate-hns-forwarder-timestamp", String(timestampSeconds));
  }

  return headers;
}

export function assertCanonicalResponse(input) {
  assert.equal(input.status, 200, `${input.variant}: expected HTTP 200, got ${input.status}`);
  assert.match(
    input.contentType,
    /^text\/html(?:;|$)/iu,
    `${input.variant}: expected HTML, got ${input.contentType || "no content type"}`,
  );
  assert.match(
    input.body,
    new RegExp(
      `<link\\s+rel="canonical"\\s+href="${input.expectedCanonicalOrigin.replaceAll(".", "\\.")}\\/"\\s*\\/>`,
      "iu",
    ),
    `${input.variant}: canonical origin ${input.expectedCanonicalOrigin}/ is missing`,
  );
  assert.doesNotMatch(
    input.body,
    /data-hns-wallet-interactive="1"/iu,
    `${input.variant}: forged request acquired wallet interactivity`,
  );

  for (const value of Object.values(FORGED_CONTEXT)) {
    assert.equal(
      input.body.includes(value),
      false,
      `${input.variant}: forged HNS context leaked into the rendered document`,
    );
  }
}

async function fetchWithRetry(url, init) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
      }
    }
  }
  throw lastError;
}

function parseOrigin(argv) {
  const index = argv.indexOf("--origin");
  const raw = index >= 0 ? argv[index + 1] : null;
  assert(raw, "Usage: verify-hns-forwarder-boundary.mjs --origin <https-origin>");
  const origin = new URL(raw);
  assert.equal(origin.protocol, "https:", "Probe origin must use HTTPS");
  assert.equal(origin.pathname, "/", "Probe origin must not include a path");
  return origin;
}

export async function verifyHnsForwarderBoundary(origin) {
  const results = [];
  for (const variant of PROBE_VARIANTS) {
    const url = new URL("/", origin);
    url.searchParams.set("hns-forwarder-boundary-probe", `${variant}-${Date.now()}`);
    const response = await fetchWithRetry(url, {
      headers: buildForgedHeaders(variant, Math.floor(Date.now() / 1_000), `${url.pathname}${url.search}`),
      redirect: "error",
    });
    const body = await response.text();
    assertCanonicalResponse({
      body,
      contentType: response.headers.get("content-type") ?? "",
      expectedCanonicalOrigin: origin.origin,
      status: response.status,
      variant,
    });
    results.push({ status: response.status, variant });
  }
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const origin = parseOrigin(process.argv.slice(2));
  const results = await verifyHnsForwarderBoundary(origin);
  process.stdout.write(`${JSON.stringify({ origin: origin.origin, results })}\n`);
}
