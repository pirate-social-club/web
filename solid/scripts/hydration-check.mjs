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

async function readApiVersionAttempts(page) {
  return page.evaluate(() => [...(window.__solidHydrationApiAttempts ?? [])]);
}

async function readQueryCacheState(page) {
  return page.evaluate(() => {
    const queryClient = window.__solidQueryClient;
    if (!queryClient) return { error: "QueryClient diagnostic hook was not installed" };
    return queryClient.getQueryCache().getAll().map(query => ({
      key: query.queryKey,
      status: query.state.status,
      fetchStatus: query.state.fetchStatus,
      dataUpdatedAt: query.state.dataUpdatedAt,
      observers: query.getObserversCount(),
      staleTime: query.options.staleTime,
    }));
  });
}

async function logApiVersionPhase(page, phase, diagnostics = []) {
  const attempts = await readApiVersionAttempts(page);
  const queries = await readQueryCacheState(page);
  console.log(JSON.stringify({ apiVersionPhase: phase, attempts, diagnostics, queries }));
  return attempts;
}

async function readPublicFeedAttempts(page) {
  return page.evaluate(() => [...(window.__solidPublicFeedAttempts ?? [])]);
}

async function readPublicFeedAttemptStates(page) {
  return page.evaluate(() => [...(window.__solidPublicFeedAttemptStates ?? [])]);
}

async function assertNoPublicFeedAttempts(page, phase, diagnostics = []) {
  const attempts = await readPublicFeedAttempts(page);
  const queries = await readQueryCacheState(page);
  const attemptStates = await readPublicFeedAttemptStates(page);
  console.log(JSON.stringify({ publicFeedPhase: phase, attempts, attemptStates, diagnostics, queries }));
  if (attempts.length) {
    throw new Error(`Public feed query attempted during ${phase} ${attempts.length} time(s): ${attempts.join(", ")} attemptStates=${JSON.stringify(attemptStates)} cache=${JSON.stringify(queries)} diagnostics=${diagnostics.join(" | ") || "none"}`);
  }
  return attempts;
}

async function clearPhaseAttempts(page) {
  await page.evaluate(() => {
    window.__solidHydrationApiAttempts?.splice(0);
    window.__solidPublicFeedAttempts?.splice(0);
    window.__solidPublicFeedAttemptStates?.splice(0);
  });
}

async function installApiVersionInstrumentation(page) {
  await page.addInitScript(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.__solidHydrationDiagnostics = true;
    const attempts = [];
    const publicFeedAttempts = [];
    const publicFeedAttemptStates = [];
    Object.defineProperty(window, "__solidHydrationApiAttempts", {
      value: attempts,
      configurable: true,
    });
    Object.defineProperty(window, "__solidPublicFeedAttempts", {
      value: publicFeedAttempts,
      configurable: true,
    });
    Object.defineProperty(window, "__solidPublicFeedAttemptStates", {
      value: publicFeedAttemptStates,
      configurable: true,
    });
    const readQueryState = () => [...(window.__solidQueryClient?.getQueryCache().getAll() ?? [])].map(query => ({
      key: query.queryKey,
      status: query.state.status,
      fetchStatus: query.state.fetchStatus,
      dataUpdatedAt: query.state.dataUpdatedAt,
      observers: query.getObserversCount(),
      staleTime: query.options.staleTime,
    }));
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const rawUrl = input instanceof Request ? input.url : String(input);
      const url = new URL(rawUrl, window.location.href);
      if (url.pathname === "/__version") attempts.push(`${url.origin}${url.pathname}`);
      if (url.pathname === "/feed/home/videos/public") {
        const attemptedUrl = `${url.origin}${url.pathname}${url.search}`;
        publicFeedAttempts.push(attemptedUrl);
        publicFeedAttemptStates.push({ url: attemptedUrl, queries: readQueryState() });
      }
      return originalFetch(input, init);
    };
  });
}

function installBrowserDiagnostics(page, report) {
  page.on("console", message => {
    if (message.type() === "error" && !message.location().url.endsWith("/favicon.ico")) {
      report(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", error => report(`pageerror: ${error.message}`));
  page.on("requestfailed", request => {
    const errorText = request.failure()?.errorText ?? "failed";
    if (request.resourceType() === "media" && errorText === "net::ERR_ABORTED") return;
    report(`request: ${request.url()} ${errorText}`);
  });
}

async function assertResolvedApiVersion(page, name, diagnostics = []) {
  const apiVersion = page.locator("#api-version");
  await apiVersion.waitFor({ state: "attached" });
  if (await apiVersion.getAttribute("data-api-status") !== "success") {
    throw new Error(`${name} API query did not resolve: ${await apiVersion.textContent()} cache=${JSON.stringify(await readQueryCacheState(page))} diagnostics=${diagnostics.join(" | ") || "none"}`);
  }
  if (!(await apiVersion.textContent()).includes("api")) {
    throw new Error(`${name} API data is not visible in the streamed HTML`);
  }
}

async function assertResolvedPublicFeed(page, name, diagnostics = []) {
  const feed = page.locator("#public-video-feed");
  await feed.waitFor({ state: "attached" });
  try {
    await page.waitForFunction(() =>
      document.querySelector("#public-video-feed")?.getAttribute("data-feed-status") === "ready"
      && document.querySelectorAll("[data-feed-item-id]").length > 0,
    undefined, { timeout: 5_000 });
  } catch (error) {
    const state = await page.evaluate(() => ({
      status: document.querySelector("#public-video-feed")?.getAttribute("data-feed-status"),
      itemCount: document.querySelectorAll("[data-feed-item-id]").length,
      streamResult: document.querySelector("#stream-result")?.textContent,
    }));
    throw new Error(`${name} public video feed did not resolve: ${JSON.stringify(state)} attempts=${JSON.stringify(await readPublicFeedAttempts(page))} attemptStates=${JSON.stringify(await readPublicFeedAttemptStates(page))} cache=${JSON.stringify(await readQueryCacheState(page))} diagnostics=${diagnostics.join(" | ") || "none"}; ${error.message}`);
  }
}

async function assertSerializedPublicFeed(response, page, name) {
  const html = await response.text();
  if (!html.includes("public-videos") || !html.includes("best")) {
    throw new Error(`${name} streamed HTML is missing the public-feed query key`);
  }
  const itemId = await page.locator("[data-feed-item-id]").first().getAttribute("data-feed-item-id");
  if (!itemId || !html.includes(itemId)) {
    throw new Error(`${name} streamed HTML is missing resolved public-feed data`);
  }
}

try {
  const page = await browser.newPage();
  const violations = [];
  await installApiVersionInstrumentation(page);
  installBrowserDiagnostics(page, violation => violations.push(violation));
  const response = await page.goto(base, { waitUntil: "networkidle" });
  if (!response?.ok()) throw new Error(`SSR page returned ${response?.status()}`);
  await assertSerializedPublicFeed(response, page, "initial SSR");
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

  await assertResolvedApiVersion(page, "SSR", violations);
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
  await page.waitForFunction(
    () => document.querySelectorAll('[data-feed-active="true"]').length === 1,
    undefined,
    { timeout: 5_000 },
  );
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
  const apiVersionAttemptsAfterHydration = await logApiVersionPhase(page, "initial hydration");
  if (apiVersionAttemptsAfterHydration.length) {
    throw new Error(`Hydrated API query attempted ${apiVersionAttemptsAfterHydration.length} time(s): ${apiVersionAttemptsAfterHydration.join(", ")}`);
  }
  await assertNoPublicFeedAttempts(page, "initial hydration", violations);

  const homeReloadPage = await browser.newPage();
  const reloadDiagnostics = { fresh: [], reload: [] };
  let reloadPhase = "fresh";
  await installApiVersionInstrumentation(homeReloadPage);
  installBrowserDiagnostics(homeReloadPage, violation => reloadDiagnostics[reloadPhase].push(violation));
  const homeResponse = await homeReloadPage.goto(base, { waitUntil: "networkidle" });
  if (!homeResponse?.ok()) throw new Error(`Fresh Home page returned ${homeResponse?.status()}`);
  await assertSerializedPublicFeed(homeResponse, homeReloadPage, "fresh Home");
  await assertResolvedPublicFeed(homeReloadPage, "Fresh Home", reloadDiagnostics.fresh);
  const freshReloadButton = homeReloadPage.locator("#hydration-button");
  const freshReloadBefore = await freshReloadButton.textContent();
  await freshReloadButton.click();
  if (freshReloadBefore === await freshReloadButton.textContent()) {
    throw new Error(`Fresh Home did not hydrate: ${freshReloadBefore}`);
  }
  await logApiVersionPhase(homeReloadPage, "fresh Home", reloadDiagnostics.fresh);
  await assertNoPublicFeedAttempts(homeReloadPage, "fresh Home", reloadDiagnostics.fresh);
  if (reloadDiagnostics.fresh.length) {
    throw new Error(`Fresh Home browser diagnostics: ${reloadDiagnostics.fresh.join(" | ")}`);
  }

  await clearPhaseAttempts(homeReloadPage);
  reloadPhase = "reload";
  const homeReloadResponse = await homeReloadPage.reload({ waitUntil: "networkidle" });
  if (!homeReloadResponse?.ok()) throw new Error(`Reloaded Home page returned ${homeReloadResponse?.status()}`);
  await assertSerializedPublicFeed(homeReloadResponse, homeReloadPage, "reloaded Home");
  await homeReloadPage.locator('[data-route-path="/"]').waitFor({ state: "attached" });
  await assertResolvedApiVersion(homeReloadPage, "Reloaded Home", reloadDiagnostics.reload);
  await assertResolvedPublicFeed(homeReloadPage, "Reloaded Home", reloadDiagnostics.reload);
  await homeReloadPage.locator("#stream-result").waitFor({ state: "attached" });
  const reloadButton = homeReloadPage.locator("#hydration-button");
  const reloadBefore = await reloadButton.textContent();
  await reloadButton.click();
  const reloadAfter = await reloadButton.textContent();
  if (reloadBefore === reloadAfter) throw new Error(`Reloaded Home did not hydrate: ${reloadBefore}`);
  await assertHead(homeReloadPage, "reloaded Home", {
    title: "Home · Pirate Web",
    canonical: "/",
    description: "Pirate Web video feed",
    ogTitle: "Home · Pirate Web",
    ogType: "website",
  });
  const apiVersionAttemptsAfterReload = await logApiVersionPhase(homeReloadPage, "Home reload");
  if (apiVersionAttemptsAfterReload.length) {
    throw new Error(`Reloaded Home query attempted ${apiVersionAttemptsAfterReload.length} time(s): ${apiVersionAttemptsAfterReload.join(", ")}`);
  }
  await assertNoPublicFeedAttempts(homeReloadPage, "reloaded Home", reloadDiagnostics.reload);
  if (reloadDiagnostics.reload.length) throw new Error(`Reload browser diagnostics: ${reloadDiagnostics.reload.join(" | ")}`);
  await homeReloadPage.close();

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
  await logApiVersionPhase(page, "client navigation", violations);

  const refreshPage = await browser.newPage();
  await installApiVersionInstrumentation(refreshPage);
  await refreshPage.goto(new URL("/c/demo/threads", base).toString(), { waitUntil: "networkidle" });
  await refreshPage.reload({ waitUntil: "networkidle" });
  await refreshPage.locator('[data-route-path="/c/:slug/threads"]').waitFor({ state: "attached" });
  if (await refreshPage.locator('[data-route-path="/c/:slug/threads"]').count() !== 1) {
    throw new Error("Dynamic route did not survive refresh");
  }
  await assertHead(refreshPage, "threads refresh", {
    title: "Threads · demo",
    canonical: "/c/demo/threads",
    description: "Threads for community demo",
    ogTitle: "Threads · demo",
    ogType: null,
  });
  await logApiVersionPhase(refreshPage, "refresh (threads route; no Home query)");
  await refreshPage.close();

  await page.goBack({ waitUntil: "networkidle" });
  await page.waitForURL(url => url.pathname === "/");
  await page.locator('[data-route-path="/"]').waitFor({ state: "attached" });
  await assertResolvedApiVersion(page, "Back navigation", violations);
  await assertHead(page, "same-document back navigation to home", {
    title: "Home · Pirate Web",
    canonical: "/",
    description: "Pirate Web video feed",
    ogTitle: "Home · Pirate Web",
    ogType: "website",
  });
  await logApiVersionPhase(page, "back navigation", violations);

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
  await assertResolvedApiVersion(page, "Home remount", violations);
  await logApiVersionPhase(page, "remount", violations);
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

  const apiVersionAttemptsAfterNavigation = await logApiVersionPhase(page, "competing navigation", violations);
  if (apiVersionAttemptsAfterNavigation.length) {
    throw new Error(`API query attempted during cache-warm navigation ${apiVersionAttemptsAfterNavigation.length} time(s): ${apiVersionAttemptsAfterNavigation.join(", ")}`);
  }
  if (violations.length) throw new Error(`Browser console errors: ${violations.join(" | ")}`);

  console.log(JSON.stringify({ ok: true, before, after, navigated: "/c/demo/threads", backNavigation: true, routeDisposal: true, overlapPath, deferredReveal: true, nonceLength: nonce.length, apiVersionAttempts: apiVersionAttemptsAfterNavigation, overlay: true, form: true }));
} finally {
  await browser.close();
}
