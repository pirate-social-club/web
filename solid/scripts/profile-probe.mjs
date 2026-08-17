import http from "node:http";
import { JSDOM } from "jsdom";
import { createProfileFixtureServer, profileFixtureRequests } from "./profile-probe-fixture.mjs";
import { startSolidBoundaryHarness } from "./local-boundary-harness.mjs";

const fixture = createProfileFixtureServer();
await fixture.listen();
const externalBase = process.env.SOLID_BOUNDARY_BASE_URL;
const harness = externalBase ? null : await startSolidBoundaryHarness({ startApiFixture: false });
const base = externalBase ?? harness.baseUrl;

const checks = [];
const trustedHost = process.env.SOLID_PROFILE_PROBE_HOST ?? "localhost";
function check(name, ok, detail = "") {
  checks.push({ name, ok, detail });
}

async function get(path, init = {}) {
  const url = new URL(path, base);
  const headers = new Headers(init.headers);
  const defaultHost = trustedHost === "localhost" ? `${trustedHost}:${url.port}` : trustedHost;
  headers.set("host", init.host ?? defaultHost);
  return new Promise((resolve, reject) => {
    const request = http.request({
      hostname: url.hostname,
      port: url.port,
      path: `${url.pathname}${url.search}`,
      method: init.method ?? "GET",
      headers: Object.fromEntries(headers),
    }, response => {
      const chunks = [];
      response.on("data", chunk => chunks.push(chunk));
      response.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        const responseHeaders = new Headers();
        for (const [key, value] of Object.entries(response.headers)) {
          if (value !== undefined) responseHeaders.set(key, Array.isArray(value) ? value.join(", ") : value);
        }
        resolve({
          status: response.statusCode ?? 0,
          headers: responseHeaders,
          async text() { return body; },
        });
      });
    });
    request.on("error", reject);
    request.end();
  });
}

async function waitForPreview() {
  if (!harness) return;
  const response = await get("/u/captain.pirate");
  if (response.status <= 0) throw new Error("Local Solid boundary did not serve a profile");
}

function normalizeNonce(body) {
  return body
    .replaceAll(/nonce="[^"]+"/g, 'nonce="<nonce>"')
    .replaceAll(/nonce-[A-Za-z0-9_-]+/g, "nonce-<nonce>");
}

try {
  await waitForPreview();
  const expectedOrigin = trustedHost === "localhost" ? `http://localhost:${new URL(base).port}` : `https://${trustedHost}`;

  const canonical = await get("/u/captain.pirate");
  const canonicalBody = await canonical.text();
  const document = new JSDOM(canonicalBody).window.document;
  const hostileName = 'Captain <img src=x onerror="alert(1)">';
  const hostileBio = `A public bio with hostile <script>alert(1)</script> text ${"x".repeat(230)}`;
  const expectedDescription = `${hostileBio.slice(0, 177).trimEnd()}...`;
  const description = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? null;
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? null;
  const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute("content") ?? null;
  const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute("content") ?? null;
  const twitterDescription = document.querySelector('meta[name="twitter:description"]')?.getAttribute("content") ?? null;
  const heading = document.querySelector("#public-profile-heading");
  check("canonical profile is 200", canonical.status === 200, String(canonical.status));
  check("canonical profile renders the route", canonicalBody.includes('data-route-path="/u/:handle"'));
  check("canonical profile renders narrow SSR data", canonicalBody.includes("Captain") && canonicalBody.includes("community-fixture"));
  check("canonical profile serializes preload", canonicalBody.includes("data-profile-preload="));
  check("canonical profile escapes hostile text", heading?.textContent === hostileName && heading.querySelector("img") === null);
  check("canonical profile omits hostile image scheme", !canonicalBody.includes("javascript:alert(1)"));
  check("canonical profile cache policy is exact", canonical.headers.get("cache-control") === "public, max-age=60, s-maxage=300");
  check("canonical profile varies by language", canonical.headers.get("vary") === "Accept-Language");
  check("canonical profile uses absolute canonical URL", canonicalBody.includes(`${expectedOrigin}/u/captain.pirate`));
  check("canonical profile uses default share image", canonicalBody.includes(`${expectedOrigin}/og/pirate-share-card.jpg`));
  check("canonical profile emits OG site name", canonicalBody.includes('property="og:site_name" content="Pirate"'));
  check("canonical profile emits Twitter card metadata", canonicalBody.includes('name="twitter:card" content="summary_large_image"')
    && canonicalBody.includes('name="twitter:title"')
    && canonicalBody.includes('name="twitter:description"')
    && canonicalBody.includes('name="twitter:image"'));
  check("parsed profile metadata preserves hostile text safely", ogTitle === `${hostileName} • Pirate`
    && twitterTitle === `${hostileName} • Pirate`
    && ogDescription === expectedDescription
    && twitterDescription === expectedDescription);
  const defaultImage = await get("/og/pirate-share-card.jpg");
  check("default share image is served by the Solid host", defaultImage.status === 200
    && defaultImage.headers.get("content-type")?.startsWith("image/") === true, String(defaultImage.status));
  check("parsed canonical description is capped at 180 characters", description !== null && description.length <= 180);
  const localized = await get("/u/captain.pirate", { headers: { "accept-language": "ar" } });
  check("Accept-Language cache variance is explicit", localized.status === 200
    && localized.headers.get("cache-control") === "public, max-age=60, s-maxage=300"
    && localized.headers.get("vary") === "Accept-Language");

  const bearer = await get("/u/captain.pirate", {
    headers: { authorization: "Bearer should-not-forward", cookie: "session=secret" },
  });
  const bearerBody = await bearer.text();
  check("bearer profile is still 200", bearer.status === 200, String(bearer.status));
  check("bearer profile is no-store", bearer.headers.get("cache-control") === "no-store");
  check("bearer and anonymous profile bodies match", normalizeNonce(bearerBody) === normalizeNonce(canonicalBody));
  check("profile API never receives bearer or cookie", profileFixtureRequests().every(request => !request.authorization && !request.cookie));

  const alias = await get("/u/oldcaptain.pirate");
  check("alias profile is a redirect", alias.status === 302, String(alias.status));
  check("alias redirect uses resolved canonical label", alias.headers.get("location") === "/u/captain.pirate", alias.headers.get("location") ?? "missing");
  check("alias redirect keeps public cache policy", alias.headers.get("cache-control") === "public, max-age=60, s-maxage=300");
  check("alias redirect varies by language", alias.headers.get("vary") === "Accept-Language");
  const aliasBearer = await get("/u/oldcaptain.pirate", { headers: { authorization: "Bearer secret" } });
  check("bearer alias is still a redirect", aliasBearer.status === 302, String(aliasBearer.status));
  check("bearer alias is no-store", aliasBearer.headers.get("cache-control") === "no-store");

  const invalid = await get("/u/invalid%2Fsegment");
  check("invalid profile path is 400", invalid.status === 400, String(invalid.status));
  check("invalid profile path is no-store", invalid.headers.get("cache-control") === "no-store");
  check("invalid profile path varies by language", invalid.headers.get("vary") === "Accept-Language");
  const missing = await get("/u/missing.pirate");
  check("missing profile is 404", missing.status === 404, String(missing.status));
  check("missing profile is no-store", missing.headers.get("cache-control") === "no-store");
  const upstream = await get("/u/upstream.pirate");
  check("upstream profile failure is 502", upstream.status === 502, String(upstream.status));
  check("upstream profile failure is no-store", upstream.headers.get("cache-control") === "no-store");
  const unknownHost = await get("/u/captain.pirate", { host: "evil.hns" });
  check("unknown host remains behind the perimeter", unknownHost.status === 404, String(unknownHost.status));
  check("HNS apex without forwarding stays behind the perimeter", unknownHost.headers.get("x-solid-route-outcome") === null);

  for (const result of checks) console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}${result.detail ? ` (${result.detail})` : ""}`);
  const failures = checks.filter(result => !result.ok);
  if (failures.length) {
    console.error(`${failures.length}/${checks.length} profile checks failed`);
    process.exitCode = 1;
  } else {
    console.log(`${checks.length}/${checks.length} profile checks passed`);
  }
} finally {
  await harness?.close();
  await fixture.close();
}
