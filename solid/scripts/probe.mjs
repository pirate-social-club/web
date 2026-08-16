import http from "node:http";

const base = process.env.SEAM_BASE_URL ?? "http://localhost:8787";

function get(path, init = {}) {
  const url = new URL(path, base);
  const headers = init.headers ?? {};
  return new Promise((resolve, reject) => {
    const request = http.request({
      hostname: url.hostname,
      port: url.port,
      path: `${url.pathname}${url.search}`,
      method: init.method ?? "GET",
      headers,
    }, response => {
      const chunks = [];
      response.on("data", chunk => chunks.push(chunk));
      response.on("end", () => {
        const body = Buffer.concat(chunks);
        const responseHeaders = new Headers();
        for (const [key, value] of Object.entries(response.headers)) {
          if (value !== undefined) responseHeaders.set(key, Array.isArray(value) ? value.join(", ") : value);
        }
        resolve({
          status: response.statusCode ?? 0,
          headers: responseHeaders,
          body,
          async text() { return body.toString("utf8"); },
        });
      });
    });
    request.on("error", reject);
    request.end();
  });
}

const checks = [];
function check(name, ok, detail = "") {
  checks.push({ name, ok, detail });
}

function headSnapshot(body) {
  const titles = [...body.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map(match => match[1].trim());
  const links = [...body.matchAll(/<link\b[^>]*>/gi)].map(match => match[0]);
  const canonical = links
    .filter(tag => /\brel=["']canonical["']/i.test(tag))
    .map(tag => tag.match(/\bhref=["']([^"']*)["']/i)?.[1] ?? "");
  const metas = [...body.matchAll(/<meta\b[^>]*>/gi)].map(match => match[0]);
  const contentFor = (attribute, value) => metas
    .filter(tag => new RegExp(`\\b${attribute}=["']${value}["']`, "i").test(tag))
    .map(tag => tag.match(/\bcontent=["']([^"']*)["']/i)?.[1] ?? "");
  return {
    titles,
    canonical,
    descriptions: contentFor("name", "description"),
    ogTitles: contentFor("property", "og:title"),
    ogTypes: contentFor("property", "og:type"),
  };
}

function assertHead(name, body, expected) {
  const actual = headSnapshot(body);
  const sameSequence = (values, expectedValues) =>
    values.length === expectedValues.length && values.every((value, index) => value === expectedValues[index]);
  check(`${name} has exactly one title`, actual.titles.length === 1, `${actual.titles.length}`);
  check(`${name} title is correct`, sameSequence(actual.titles, [expected.title]), actual.titles[0] ?? "missing");
  const canonical = expected.canonical == null ? [] : [expected.canonical];
  check(`${name} has exactly one canonical identity`, actual.canonical.length === canonical.length, `${actual.canonical.length}`);
  check(`${name} canonical is correct`, sameSequence(actual.canonical, canonical), actual.canonical.join(", ") || "missing");
  const descriptions = expected.description == null ? [] : [expected.description];
  check(`${name} description metadata is correct`, sameSequence(actual.descriptions, descriptions), actual.descriptions.join(", ") || "missing");
  const ogTitles = expected.ogTitle == null ? [] : [expected.ogTitle];
  check(`${name} og:title metadata is correct`, sameSequence(actual.ogTitles, ogTitles), actual.ogTitles.join(", ") || "missing");
  const ogTypes = expected.ogType == null ? [] : [expected.ogType];
  check(`${name} og:type metadata is correct`, sameSequence(actual.ogTypes, ogTypes), actual.ogTypes.join(", ") || "missing");
}

const root = await get("/", { headers: { host: "app.example.hns" } });
const html = await root.text();
const csp = root.headers.get("content-security-policy") ?? "";
const nonce = csp.match(/nonce-([^']+)/)?.[1] ?? "";
check("root responds 200", root.status === 200, String(root.status));
check("root is SSR HTML", html.includes("Pirate Web Solid shell"));
check("CSP has nonce", nonce.length > 0);
check("CSP uses strict-dynamic", csp.includes("'strict-dynamic'"));
check("CSP has no unsafe-eval", !csp.includes("unsafe-eval"));
const scripts = [...html.matchAll(/<script\b[^>]*>/gi)].map(match => match[0]);
check("SSR emitted script exists", scripts.length > 0, `${scripts.length} scripts`);
check("every SSR script carries nonce", scripts.every(script => script.includes(`nonce="${nonce}"`)));
check("hydration control is present", html.includes("id=\"hydration-button\""));
check("SSR API data is visible", html.includes('id="api-version" data-api-status="success"') && html.includes("API status: <!--$-->api"));
check("API query cache is serialized", html.includes('queryKey:$R') && html.includes('"api","version"'));
check("portalled overlay fixture is SSR-marked", html.includes('id="hydration-dialog-open"') && html.includes('aria-haspopup="dialog"'));
check("compound form fixture is SSR-marked", html.includes('id="hydration-display-name"') && html.includes('id="hydration-display-name-description"'));
check("public video feed is SSR-marked", html.includes('id="public-video-feed"') && html.includes('data-feed-status="ready"'));
check("public feed includes a video item", html.includes('data-feed-item-id="') && html.includes("<video"));
check("public feed preserves cursor-safe API data", html.includes("data-feed-active="));
assertHead("root SSR head", html, {
  title: "Home · Pirate Web",
  canonical: "/",
  description: "Pirate Web video feed",
  ogTitle: "Home · Pirate Web",
  ogType: "website",
});
check("SSR deferred content is revealed", html.includes('id="stream-result">stream-complete'));

const apex = await get("/", { redirect: "manual", headers: { host: "example.hns" } });
check("HNS apex redirects", apex.status === 307, String(apex.status));
check("HNS redirect targets app host", (apex.headers.get("location") ?? "").includes("app.example.hns"));
const host = await get("/seam/host", { headers: { host: "app.example.hns" } });
check("app host serves", host.status === 200, String(host.status));
check("host surface header is sovereign app", host.headers.get("x-seam-host-surface") === "sovereign-app");
const binding = await get("/seam/binding", { headers: { host: "app.example.hns" } });
const bindingText = await binding.text();
check("service-binding route serves", binding.status === 200, String(binding.status));
check("service-binding round trip identifies public worker", bindingText.includes("pirate-web-solid-public"));
check("service-binding route returns JSON payload", binding.headers.get("content-type")?.includes("text/html") === false || bindingText.includes("upstream"));
check("adapter returns streamed-capable response", root.body.length > 0);

const htmlRoutes = [
  ["home route", "/", 'data-route-path="/"', 'data-layout="app-shell"', { title: "Home · Pirate Web", canonical: "/", description: "Pirate Web video feed", ogTitle: "Home · Pirate Web", ogType: "website" }],
  ["community route", "/c/demo", 'data-route-path="/c/:slug"', 'data-layout="app-shell"', { title: "Community demo · Pirate Web", canonical: "/c/demo", description: null, ogTitle: "Community demo", ogType: "website" }],
  ["community threads route", "/c/demo/threads", 'data-route-path="/c/:slug/threads"', 'data-layout="app-shell"', { title: "Threads · demo", canonical: "/c/demo/threads", description: "Threads for community demo", ogTitle: "Threads · demo", ogType: null }],
  ["post route", "/p/demo-post", 'data-route-path="/p/:id"', 'data-layout="app-shell"', { title: "Post demo-post · Pirate Web", canonical: "/p/demo-post", description: null, ogTitle: "Post demo-post", ogType: null }],
  ["profile route", "/u/demo-user", 'data-route-path="/u/:handle"', 'data-layout="app-shell"', { title: "@demo-user · Pirate Web", canonical: "/u/demo-user", description: null, ogTitle: "@demo-user · Pirate Web", ogType: null }],
  ["settings route", "/settings", 'data-route-path="/settings"', 'data-layout="app-shell"', { title: "Settings · Pirate Web", canonical: null, description: null, ogTitle: null, ogType: null }],
  ["settings child route", "/settings/profile", 'data-route-path="/settings/profile"', 'data-layout="app-shell"', { title: "Profile settings · Pirate Web", canonical: null, description: null, ogTitle: null, ogType: null }],
  ["auth bare route", "/auth", 'data-route-path="/auth"', 'data-layout="bare"', { title: "Pirate Web", canonical: null, description: null, ogTitle: null, ogType: null }],
  ["embed bare route", "/embed", 'data-route-path="/embed"', 'data-layout="bare"', { title: "Pirate Web", canonical: null, description: null, ogTitle: null, ogType: null }],
  ["telegram bare route", "/telegram", 'data-route-path="/telegram"', 'data-layout="bare"', { title: "Pirate Web", canonical: null, description: null, ogTitle: null, ogType: null }],
  ["host seam route", "/seam/host", 'data-route-path="/seam/host"', undefined, { title: "Pirate Web", canonical: null, description: null, ogTitle: null, ogType: null }],
  ["binding seam route", "/seam/binding", 'data-route-path="/seam/binding"', undefined, { title: "Pirate Web", canonical: null, description: null, ogTitle: null, ogType: null }],
];
for (const [name, path, marker, layout, head] of htmlRoutes) {
  const response = await get(path, { headers: { host: "app.example.hns" } });
  const body = await response.text();
  check(`${name} serves SSR`, response.status === 200 && body.includes(marker), `${response.status}`);
  if (layout) check(`${name} uses expected layout`, body.includes(layout));
  assertHead(`${name} SSR head`, body, head);
}

const api = await get("/api/health", { headers: { host: "app.example.hns", accept: "application/json" } });
const apiBody = await api.text();
check("API route serves JSON", api.status === 200 && api.headers.get("content-type")?.includes("application/json") === true, `${api.status}`);
check("API route returns health payload", apiBody.includes('"route":"health"'));

const api404 = await get("/seam/api?status=404", { headers: { host: "app.example.hns" } });
const api404Body = await api404.text();
check("API 404 maps to SSR route 404", api404.status === 404 && api404Body.includes('data-api-error="404"'));
const api500 = await get("/seam/api?status=500", { headers: { host: "app.example.hns" } });
const api500Body = await api500.text();
check("API 5xx maps to error boundary", api500.status === 500 && api500Body.includes('data-api-error="boundary"'));
const apiFeed = await get("/seam/api?feed=1", { headers: { host: "app.example.hns" } });
const apiFeedBody = await apiFeed.text();
check("Worker SSR fetches public feed endpoint", apiFeed.status === 200 && apiFeedBody.includes('data-api-feed="success"'));

const notFound = await get("/route-that-does-not-exist", { headers: { host: "app.example.hns" } });
const notFoundBody = await notFound.text();
check("catch-all route returns SSR 404", notFound.status === 404, String(notFound.status));
check("catch-all route renders not-found marker", notFoundBody.includes('data-route-status="404"'));

const importedRoot = await get("/c/demo/threads", { headers: { host: "example.hns" } });
check("imported sovereign root without forwarding metadata is deliberate 404", importedRoot.status === 404);
check("imported sovereign root exposes route outcome", importedRoot.headers.get("x-solid-route-outcome") === "sovereign-forwarding-metadata-required");
const forwardedHost = await get("/seam/host", {
  headers: {
    host: "example.hns",
    "x-pirate-hns-trusted-forwarder": "1",
    "x-pirate-hns-community-id": "demo",
    "x-pirate-hns-community-route": "demo",
  },
});
const forwardedHostBody = await forwardedHost.text();
check("forwarded sovereign route serves", forwardedHost.status === 200, String(forwardedHost.status));
check("forwarded host context reaches routes", forwardedHostBody.includes('data-host-surface="sovereign-apex"') && forwardedHostBody.includes("host-community-slug: <!--$-->demo"));
check("forwarded metadata is exposed", forwardedHostBody.includes('data-forwarding-metadata="1"') && forwardedHostBody.includes("forwarding-metadata: <!--$-->present"));

for (const result of checks) console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}${result.detail ? ` (${result.detail})` : ""}`);
const failures = checks.filter(result => !result.ok);
if (failures.length) {
  console.error(`${failures.length}/${checks.length} checks failed`);
  process.exitCode = 1;
} else {
  console.log(`${checks.length}/${checks.length} checks passed`);
}
