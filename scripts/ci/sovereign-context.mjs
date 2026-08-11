import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export function verifySovereignHtml(html, input) {
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/u)?.[1] ?? null;
  const expectedCanonical = `https://${input.root}/`;
  const scopedFeedPath = `/public-communities/${input.communityId}/feed/videos`;
  const errors = [];
  const bootstrapMarker = "window.__pirateHomeVideoFeedBootstrap";
  const markerIndex = html.indexOf(bootstrapMarker);
  const scriptStart = markerIndex >= 0 ? html.lastIndexOf("<script", markerIndex) : -1;
  const scriptBodyStart = scriptStart >= 0 ? html.indexOf(">", scriptStart) + 1 : -1;
  const scriptEnd = markerIndex >= 0 ? html.indexOf("</script>", markerIndex) : -1;
  const bootstrap = scriptBodyStart > 0 && scriptEnd > markerIndex
    ? html.slice(scriptBodyStart, scriptEnd)
    : "";

  if (canonical !== expectedCanonical) {
    errors.push(`canonical=${JSON.stringify(canonical)} expected=${JSON.stringify(expectedCanonical)}`);
  }
  if (!bootstrap) {
    errors.push("missing home-video bootstrap script");
  } else if (!bootstrap.includes(scopedFeedPath)) {
    errors.push(`missing scoped feed bootstrap ${scopedFeedPath}`);
  }
  if (bootstrap.includes("/feed/home/videos")) {
    errors.push("global video feed bootstrap is present");
  }
  if (bootstrap.includes(`/public-communities/${input.communityId}/posts`)) {
    errors.push("thread-feed bootstrap is present on the sovereign apex");
  }

  return { canonical, errors, scopedFeedPath };
}

export function verifyBrandScopes(sovereignHtml, canonicalHtml) {
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
  const canonicalHtmlPath = argument("--canonical-html");
  const root = argument("--root");
  const communityId = argument("--community-id");
  if (!htmlPath || !canonicalHtmlPath || !root || !communityId) {
    throw new Error("usage: sovereign-context.mjs --html <path> --canonical-html <path> --root <root> --community-id <id>");
  }

  const sovereignHtml = await readFile(htmlPath, "utf8");
  const canonicalHtml = await readFile(canonicalHtmlPath, "utf8");
  const result = verifySovereignHtml(sovereignHtml, { root, communityId });
  const brandResult = verifyBrandScopes(sovereignHtml, canonicalHtml);
  const errors = [...result.errors, ...brandResult.errors];
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
  console.log(JSON.stringify({
    brand_label: brandResult.sovereignBrandLabel,
    canonical: result.canonical,
    community_id: communityId,
    scoped_feed: result.scopedFeedPath,
    status: "ok",
  }));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
