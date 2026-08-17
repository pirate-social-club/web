import { chromium } from "playwright";
import { createProfileFixtureServer } from "./profile-probe-fixture.mjs";
import { startSolidBoundaryHarness } from "./local-boundary-harness.mjs";

const fixture = createProfileFixtureServer();
await fixture.listen();
const externalBase = process.env.SOLID_BOUNDARY_BASE_URL;
const harness = externalBase ? null : await startSolidBoundaryHarness({ startApiFixture: false });
const base = externalBase ?? harness.baseUrl;

let browser;
try {
  const boundaryResponse = await fetch(`${base}/u/captain.pirate`, { headers: { host: "app.example.hns" } });
  if (boundaryResponse.status !== 200) throw new Error(`Local Solid boundary returned ${boundaryResponse.status}`);

  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {}),
  });
  const page = await browser.newPage();
  await page.addInitScript(() => {
    const profileFetches = [];
    Object.defineProperty(window, "__solidProfileFetches", { value: profileFetches, configurable: true });
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const rawUrl = input instanceof Request ? input.url : String(input);
      const url = new URL(rawUrl, window.location.href);
      if (url.pathname.startsWith("/public-profiles/")) profileFetches.push(url.toString());
      return originalFetch(input, init);
    };
  });
  const response = await page.goto(`${base}/u/captain.pirate`, { waitUntil: "networkidle" });
  if (!response?.ok()) throw new Error(`Profile hydration page returned ${response?.status()}`);
  await page.locator('[data-profile-status="ready"]').waitFor({ state: "attached" });
  const result = await page.evaluate(() => ({
    fetches: [...(window.__solidProfileFetches ?? [])],
    status: document.querySelector("[data-profile-status]")?.getAttribute("data-profile-status"),
    title: document.title,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    heading: document.querySelector("#public-profile-heading")?.textContent,
    preload: document.querySelector("[data-profile-preload]")?.getAttribute("data-profile-preload") ?? null,
  }));
  if (result.status !== "ready") throw new Error(`Profile hydration status was ${result.status}`);
  if (result.fetches.length !== 0) throw new Error(`SSR preload caused ${result.fetches.length} duplicate profile fetch(es): ${result.fetches.join(", ")}`);
  if (!result.preload) throw new Error("Serialized profile preload is missing");
  if (!result.heading?.includes("Captain")) throw new Error(`Hydrated profile heading is missing: ${result.heading}`);
  if (!result.title.includes("Pirate") || !result.canonical?.endsWith("/u/captain.pirate")) {
    throw new Error(`Hydrated profile metadata mismatch: ${JSON.stringify({ title: result.title, canonical: result.canonical })}`);
  }
  console.log("Profile SSR preload/hydration passed (0 duplicate profile fetches, metadata and UI retained)");
} finally {
  await browser?.close();
  await harness?.close();
  await fixture.close();
}
