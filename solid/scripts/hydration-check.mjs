import { chromium } from "playwright";

const base = process.env.WEB_SOLID_BASE_URL ?? "http://localhost:4173";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});

async function assertHead(page, name, expected) {
  const actual = await page.evaluate(() => ({
    titles: [...document.head.querySelectorAll("title")].map(element => element.textContent ?? ""),
    canonicals: [...document.head.querySelectorAll('link[rel="canonical"]')].map(element => element.getAttribute("href") ?? ""),
    descriptions: [...document.head.querySelectorAll('meta[name="description"]')].map(element => element.getAttribute("content") ?? ""),
    ogTitles: [...document.head.querySelectorAll('meta[property="og:title"]')].map(element => element.getAttribute("content") ?? ""),
    ogTypes: [...document.head.querySelectorAll('meta[property="og:type"]')].map(element => element.getAttribute("content") ?? ""),
  }));
  const expectedState = {
    titles: [expected.title],
    canonicals: expected.canonical == null ? [] : [expected.canonical],
    descriptions: expected.description == null ? [] : [expected.description],
    ogTitles: expected.ogTitle == null ? [] : [expected.ogTitle],
    ogTypes: expected.ogType == null ? [] : [expected.ogType],
  };
  if (JSON.stringify(actual) !== JSON.stringify(expectedState)) {
    throw new Error(`${name} head mismatch: expected=${JSON.stringify(expectedState)} actual=${JSON.stringify(actual)}`);
  }
}

try {
  const page = await browser.newPage();
  const violations = [];
  let apiVersionRequests = 0;
  page.on("console", message => {
    if (message.type() === "error") violations.push(`console: ${message.text()}`);
  });
  page.on("pageerror", error => violations.push(`pageerror: ${error.message}`));
  page.on("requestfailed", request => violations.push(`request: ${request.url()} ${request.failure()?.errorText ?? "failed"}`));
  page.on("request", request => {
    if (new URL(request.url()).pathname === "/__version") apiVersionRequests += 1;
  });
  const response = await page.goto(base, { waitUntil: "networkidle" });
  if (!response?.ok()) throw new Error(`SSR page returned ${response?.status()}`);
  await assertHead(page, "initial SSR/hydrated home", {
    title: "Home · Pirate Web",
    canonical: "/",
    description: "Pirate Web video feed",
    ogTitle: "Home · Pirate Web",
    ogType: "website",
  });

  const csp = response.headers()["content-security-policy"] ?? "";
  const nonce = csp.match(/nonce-([^']+)/)?.[1];
  if (!nonce) throw new Error("CSP nonce missing");
  const noncedScripts = await page.locator("script").evaluateAll((elements, expectedNonce) =>
    elements.every(element => element.nonce === expectedNonce || element.getAttribute("nonce") === expectedNonce),
    nonce,
  );
  if (!noncedScripts) throw new Error("SSR script missing nonce");

  const apiVersion = page.locator("#api-version");
  await apiVersion.waitFor({ state: "attached" });
  if (await apiVersion.getAttribute("data-api-status") !== "success") {
    throw new Error(`SSR API query did not resolve: ${await apiVersion.textContent()}`);
  }
  if (!(await apiVersion.textContent()).includes("api")) throw new Error("SSR API data is not visible in the streamed HTML");
  await page.locator("#stream-result").waitFor({ state: "attached" });
  await assertHead(page, "deferred/Suspense reveal", {
    title: "Home · Pirate Web",
    canonical: "/",
    description: "Pirate Web video feed",
    ogTitle: "Home · Pirate Web",
    ogType: "website",
  });

  const feed = page.locator("#public-video-feed");
  await feed.waitFor({ state: "attached" });
  if (await feed.getAttribute("data-feed-status") !== "ready") throw new Error("SSR public video feed did not resolve");
  const feedItems = page.locator("[data-feed-item-id]");
  if (await feedItems.count() < 1) throw new Error("SSR public video feed returned no video cards");
  if (await page.locator("[data-feed-item-id] video[controls]").count() !== await feedItems.count()) {
    throw new Error("Every public feed card must expose reachable native video controls");
  }
  if (await page.locator('[data-feed-active="true"]').count() !== 1) throw new Error("Feed must have exactly one active item");

  const button = page.locator("#hydration-button");
  const before = await button.textContent();
  const markup = await button.evaluate(element => element.outerHTML);
  await button.click();
  const after = await button.textContent();
  if (before === after) throw new Error(`Hydration did not update state: ${before}; markup=${markup}; ${violations.join(" | ") || "no browser diagnostics"}`);

  const dialogTrigger = page.locator("#hydration-dialog-open");
  await dialogTrigger.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible" });
  if (await page.locator("#hydration-dialog-marker").textContent() !== "portal-ready") {
    throw new Error("Portalled design-system dialog did not render after hydration");
  }
  await page.getByRole("button", { name: "Close" }).click();
  await dialog.waitFor({ state: "hidden" });
  await dialogTrigger.focus();

  const displayName = page.locator("#hydration-display-name");
  if (await displayName.getAttribute("aria-describedby") !== "hydration-display-name-description") {
    throw new Error("TextField description wiring was not preserved through hydration");
  }
  await displayName.fill("Gate test");
  if (await displayName.inputValue() !== "Gate test") throw new Error("TextField controlled value did not update");
  if (apiVersionRequests !== 0) throw new Error(`Hydrated API query refetched ${apiVersionRequests} time(s)`);

  if (await feedItems.count() > 1) {
    await feedItems.nth(1).scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    if (await page.locator('[data-feed-active="true"]').count() !== 1) throw new Error("Feed changed to more than one active item");
  }

  const threadsLink = page.locator('a[href="/c/demo/threads"]').first();
  await threadsLink.click();
  await page.waitForURL(url => url.pathname === "/c/demo/threads");
  const threadsRoute = page.locator('[data-route-path="/c/:slug/threads"]');
  try {
    await threadsRoute.waitFor({ state: "attached", timeout: 5000 });
  } catch (error) {
    const state = await page.evaluate(() => ({
      url: location.href,
      markers: [...document.querySelectorAll("[data-route-path]")].map(element => element.getAttribute("data-route-path")),
      text: document.body.innerText,
      resources: performance.getEntriesByType("resource").map(entry => entry.name).filter(name => name.includes("assets/")),
    }));
    throw new Error(`Client navigation did not render the community threads route: ${JSON.stringify(state)} diagnostics=${violations.join(" | ") || "none"}; ${error.message}`);
  }
  if (await threadsRoute.count() !== 1) {
    const markers = await page.locator("[data-route-path]").evaluateAll(elements => elements.map(element => element.getAttribute("data-route-path")));
    throw new Error(`Client navigation did not render the community threads route: url=${page.url()} markers=${markers.join(",")} diagnostics=${violations.join(" | ") || "none"}`);
  }
  if (await threadsRoute.getAttribute("data-route-slug") !== "demo") throw new Error("Dynamic community slug was not preserved during client navigation");
  await assertHead(page, "client navigation to threads", {
    title: "Threads · demo",
    canonical: "/c/demo/threads",
    description: "Threads for community demo",
    ogTitle: "Threads · demo",
    ogType: null,
  });

  await page.reload({ waitUntil: "networkidle" });
  await page.locator('[data-route-path="/c/:slug/threads"]').waitFor({ state: "attached" });
  if (await page.locator('[data-route-path="/c/:slug/threads"]').count() !== 1) throw new Error("Dynamic route did not survive refresh");
  await assertHead(page, "threads refresh", {
    title: "Threads · demo",
    canonical: "/c/demo/threads",
    description: "Threads for community demo",
    ogTitle: "Threads · demo",
    ogType: null,
  });

  await page.goBack({ waitUntil: "networkidle" });
  await page.waitForURL(url => url.pathname === "/");
  await page.locator('[data-route-path="/"]').waitFor({ state: "attached" });
  await assertHead(page, "back navigation to home", {
    title: "Home · Pirate Web",
    canonical: "/",
    description: "Pirate Web video feed",
    ogTitle: "Home · Pirate Web",
    ogType: "website",
  });

  await page.locator('a[href="/seam/host"]').first().click();
  await page.waitForURL(url => url.pathname === "/seam/host");
  await page.locator('[data-route-path="/seam/host"]').waitFor({ state: "attached" });
  await assertHead(page, "route disposal restores fallback head", {
    title: "Pirate Web",
    canonical: null,
    description: null,
    ogTitle: null,
    ogType: null,
  });

  await page.goBack({ waitUntil: "networkidle" });
  await page.waitForURL(url => url.pathname === "/");
  await page.locator('[data-route-path="/"]').waitFor({ state: "attached" });
  const homeLinks = await page.locator('a[href="/p/demo-post"], a[href="/u/demo-user"]').all();
  if (homeLinks.length !== 2) throw new Error("Home route did not expose both overlap navigation links");
  await page.evaluate(() => {
    const links = [...document.querySelectorAll("a")];
    const post = links.find(link => link.getAttribute("href") === "/p/demo-post");
    const profile = links.find(link => link.getAttribute("href") === "/u/demo-user");
    if (!post || !profile) throw new Error("Overlap navigation links are missing");
    post.click();
    profile.click();
  });
  await page.waitForURL(url => ["/p/demo-post", "/u/demo-user"].includes(url.pathname));
  const overlapPath = await page.evaluate(() => location.pathname);
  const overlap = {
    "/p/demo-post": {
      marker: '[data-route-path="/p/:id"]',
      title: "Post demo-post · Pirate Web",
      canonical: "/p/demo-post",
      description: null,
      ogTitle: "Post demo-post",
      ogType: null,
    },
    "/u/demo-user": {
      marker: '[data-route-path="/u/:handle"]',
      title: "@demo-user · Pirate Web",
      canonical: "/u/demo-user",
      description: null,
      ogTitle: "@demo-user · Pirate Web",
      ogType: null,
    },
  }[overlapPath];
  if (!overlap) throw new Error(`Rapid overlapping navigation ended at an unexpected path: ${overlapPath}`);
  await page.locator(overlap.marker).waitFor({ state: "attached" });
  await assertHead(page, "competing navigation final head cleanliness", overlap);

  if (apiVersionRequests !== 0) throw new Error(`API query refetched during navigation/refresh (${apiVersionRequests})`);
  if (violations.length) throw new Error(`Browser console errors: ${violations.join(" | ")}`);

  console.log(JSON.stringify({ ok: true, before, after, navigated: "/c/demo/threads", backNavigation: true, routeDisposal: true, overlapPath, deferredReveal: true, nonceLength: nonce.length, apiVersionRequests, overlay: true, form: true }));
} finally {
  await browser.close();
}
