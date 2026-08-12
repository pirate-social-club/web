import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

function canonicalFromHtml(html) {
  return html.match(/<link rel="canonical" href="([^"]+)"/u)?.[1] ?? null;
}

export function verifySovereignHtml(apexHtml, appHtml, input) {
  const apexCanonical = canonicalFromHtml(apexHtml);
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

  if (apexCanonical !== expectedCanonical) {
    errors.push(`apex canonical=${JSON.stringify(apexCanonical)} expected=${JSON.stringify(expectedCanonical)}`);
  }
  if (appCanonical !== expectedCanonical) {
    errors.push(`app canonical=${JSON.stringify(appCanonical)} expected=${JSON.stringify(expectedCanonical)}`);
  }
  for (const [surface, html] of [["apex", apexHtml], ["app", appHtml]]) {
    if (!html.includes('<meta name="robots" content="noindex, nofollow"')) {
      errors.push(`missing noindex metadata on sovereign ${surface}`);
    }
  }
  if (apexHtml.includes(bootstrapMarker)) {
    errors.push("video bootstrap is present on the sovereign community apex");
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

  return { apexCanonical, appCanonical, errors, scopedFeedPath };
}

export function verifyBrandScopes(sovereignHtml, appHtml, canonicalHtml) {
  const errors = [];
  const sovereignBrandLabel = sovereignHtml.match(
    /data-brand-label="([^"]+)" data-brand-scope="community"/u,
  )?.[1] ?? null;

  if (!sovereignBrandLabel) {
    errors.push("missing sovereign community brand");
  } else if (sovereignBrandLabel.trim().toLowerCase() === "pirate") {
    errors.push("sovereign community brand uses the Pirate label");
  }
  if (sovereignHtml.includes('data-brand-scope="pirate"')) {
    errors.push("Pirate brand is present on the sovereign apex");
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
  if (!htmlPath || !appHtmlPath || !canonicalHtmlPath || !root || !communityId || !routeSlug) {
    throw new Error("usage: sovereign-context.mjs --html <path> --app-html <path> --canonical-html <path> --root <root> --community-id <id> --route-slug <slug>");
  }

  const sovereignHtml = await readFile(htmlPath, "utf8");
  const appHtml = await readFile(appHtmlPath, "utf8");
  const canonicalHtml = await readFile(canonicalHtmlPath, "utf8");
  const result = verifySovereignHtml(sovereignHtml, appHtml, { root, communityId, routeSlug });
  const brandResult = verifyBrandScopes(sovereignHtml, appHtml, canonicalHtml);
  const errors = [...result.errors, ...brandResult.errors];
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
  console.log(JSON.stringify({
    brand_label: brandResult.sovereignBrandLabel,
    apex_canonical: result.apexCanonical,
    app_canonical: result.appCanonical,
    community_id: communityId,
    scoped_feed: result.scopedFeedPath,
    status: "ok",
  }));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
