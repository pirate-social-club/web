import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

function canonicalFromHtml(html) {
  return html.match(/<link rel="canonical" href="([^"]+)"/u)?.[1] ?? null;
}

function surfaceNavigationFromHtml(html) {
  return html.match(
    /<link data-surface-navigation-contract="true" href="([^"]+)" rel="alternate"/u,
  )?.[1] ?? null;
}

export function verifySurfaceNavigationContracts(input) {
  const expected = {
    appThreads: "/",
    appVideos: `/c/${encodeURIComponent(input.routeSlug).replace(/^%40/u, "@")}/threads`,
    canonicalThreads: `/c/${encodeURIComponent(input.routeSlug)}/videos`,
    canonicalVideos: `/c/${encodeURIComponent(input.routeSlug)}/threads`,
  };
  const actual = {
    appThreads: surfaceNavigationFromHtml(input.appThreadsHtml),
    appVideos: surfaceNavigationFromHtml(input.appVideosHtml),
    canonicalThreads: surfaceNavigationFromHtml(input.canonicalThreadsHtml),
    canonicalVideos: surfaceNavigationFromHtml(input.canonicalVideosHtml),
  };
  const errors = Object.entries(expected).flatMap(([surface, href]) =>
    actual[surface] === href
      ? []
      : [`${surface} navigation=${JSON.stringify(actual[surface])} expected=${JSON.stringify(href)}`]
  );
  return { actual, errors };
}

export function verifySovereignHtml(appThreadsHtml, appHtml, input) {
  const threadsCanonical = canonicalFromHtml(appThreadsHtml);
  const appCanonical = canonicalFromHtml(appHtml);
  const expectedCanonical = `https://pirate.sc/c/${encodeURIComponent(input.routeSlug)}`;
  const scopedFeedPath = `/public-communities/${input.communityId}/feed/videos`;
  const errors = [];
  const bootstrapMarker = "window.__pirateHomeVideoFeedBootstrap";
  const markerIndex = appHtml.indexOf(bootstrapMarker);
  const scriptStart = markerIndex >= 0 ? appHtml.lastIndexOf("<script", markerIndex) : -1;
  const scriptBodyStart = scriptStart >= 0 ? appHtml.indexOf(">", scriptStart) + 1 : -1;
  const scriptEnd = markerIndex >= 0 ? appHtml.indexOf("</script>", markerIndex) : -1;
  const bootstrap = scriptBodyStart > 0 && scriptEnd > markerIndex
    ? appHtml.slice(scriptBodyStart, scriptEnd)
    : "";

  if (threadsCanonical !== expectedCanonical) {
    errors.push(`app threads canonical=${JSON.stringify(threadsCanonical)} expected=${JSON.stringify(expectedCanonical)}`);
  }
  if (appCanonical !== expectedCanonical) {
    errors.push(`app canonical=${JSON.stringify(appCanonical)} expected=${JSON.stringify(expectedCanonical)}`);
  }
  for (const [surface, html] of [["app threads", appThreadsHtml], ["app videos", appHtml]]) {
    if (!html.includes('<meta name="robots" content="noindex, nofollow"')) {
      errors.push(`missing noindex metadata on sovereign ${surface}`);
    }
  }
  if (appThreadsHtml.includes(bootstrapMarker)) {
    errors.push("video bootstrap is present on the sovereign thread route");
  }
  if (!bootstrap) {
    errors.push("missing home-video bootstrap script on app origin");
  } else if (!bootstrap.includes(scopedFeedPath)) {
    errors.push(`missing scoped feed bootstrap ${scopedFeedPath}`);
  }
  if (bootstrap.includes("/feed/home/videos")) {
    errors.push("global video feed bootstrap is present");
  }
  if (bootstrap.includes(`/public-communities/${input.communityId}/posts`)) {
    errors.push("thread-feed bootstrap is present on the sovereign video app");
  }

  return { appCanonical, errors, scopedFeedPath, threadsCanonical };
}

export function verifyBrandScopes(appThreadsHtml, appHtml, canonicalHtml) {
  const errors = [];
  const sovereignBrandLabel = appThreadsHtml.match(
    /data-brand-label="([^"]+)" data-brand-scope="community"/u,
  )?.[1] ?? null;

  if (!sovereignBrandLabel) {
    errors.push("missing sovereign community brand");
  } else if (sovereignBrandLabel.trim().toLowerCase() === "pirate") {
    errors.push("sovereign community brand uses the Pirate label");
  }
  if (appThreadsHtml.includes('data-brand-scope="pirate"')) {
    errors.push("Pirate brand is present on the sovereign thread route");
  }
  if (!appHtml.includes('data-brand-scope="community"')) {
    errors.push("missing community brand on the sovereign app");
  }
  if (appHtml.includes('data-brand-scope="pirate"')) {
    errors.push("Pirate brand is present on the sovereign app");
  }
  if (!canonicalHtml.includes('data-brand-scope="pirate"')) {
    errors.push("missing Pirate brand on the canonical community page");
  }
  if (canonicalHtml.includes('data-brand-scope="community"')) {
    errors.push("community brand replaced Pirate on the canonical community page");
  }

  return { errors, sovereignBrandLabel };
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const htmlPath = argument("--html");
  const appHtmlPath = argument("--app-html");
  const canonicalHtmlPath = argument("--canonical-html");
  const root = argument("--root");
  const communityId = argument("--community-id");
  const routeSlug = argument("--route-slug");
  const canonicalThreadsPath = argument("--canonical-threads-html");
  const navigationOnly = process.argv.includes("--navigation-only");
  if (!htmlPath || !appHtmlPath || !canonicalHtmlPath || !root || !communityId || !routeSlug) {
    throw new Error("usage: sovereign-context.mjs --html <path> --app-html <path> --canonical-html <path> --root <root> --community-id <id> --route-slug <slug>");
  }

  const appThreadsHtml = await readFile(htmlPath, "utf8");
  const appHtml = await readFile(appHtmlPath, "utf8");
  const canonicalHtml = await readFile(canonicalHtmlPath, "utf8");
  const canonicalThreadsHtml = canonicalThreadsPath
    ? await readFile(canonicalThreadsPath, "utf8")
    : null;
  if (navigationOnly) {
    if (!canonicalThreadsHtml) {
      throw new Error("--canonical-threads-html is required with --navigation-only");
    }
    const navigation = verifySurfaceNavigationContracts({
      appThreadsHtml,
      appVideosHtml: appHtml,
      canonicalThreadsHtml,
      canonicalVideosHtml: canonicalHtml,
      root,
      routeSlug,
    });
    if (navigation.errors.length > 0) throw new Error(navigation.errors.join("; "));
    console.log(JSON.stringify({ community_id: communityId, status: "navigation-ok" }));
    return;
  }
  const result = verifySovereignHtml(appThreadsHtml, appHtml, { root, communityId, routeSlug });
  const brandResult = verifyBrandScopes(appThreadsHtml, appHtml, canonicalHtml);
  const errors = [...result.errors, ...brandResult.errors];
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
  console.log(JSON.stringify({
    brand_label: brandResult.sovereignBrandLabel,
    app_canonical: result.appCanonical,
    app_threads_canonical: result.threadsCanonical,
    community_id: communityId,
    scoped_feed: result.scopedFeedPath,
    status: "ok",
  }));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
