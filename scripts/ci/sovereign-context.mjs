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

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const htmlPath = argument("--html");
  const root = argument("--root");
  const communityId = argument("--community-id");
  if (!htmlPath || !root || !communityId) {
    throw new Error("usage: sovereign-context.mjs --html <path> --root <root> --community-id <id>");
  }

  const result = verifySovereignHtml(await readFile(htmlPath, "utf8"), { root, communityId });
  if (result.errors.length > 0) {
    throw new Error(result.errors.join("; "));
  }
  console.log(JSON.stringify({
    canonical: result.canonical,
    community_id: communityId,
    scoped_feed: result.scopedFeedPath,
    status: "ok",
  }));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
