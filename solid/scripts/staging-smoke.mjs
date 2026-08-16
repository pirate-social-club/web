const [solidOrigin, publicOrigin, expectedSha] = process.argv.slice(2);

if (!solidOrigin || !publicOrigin || !/^[0-9a-f]{40}$/.test(expectedSha ?? "")) {
  throw new Error("usage: staging-smoke.mjs <solid-origin> <public-origin> <expected-sha>");
}

async function get(origin, pathname) {
  const url = new URL(pathname, `${origin.replace(/\/$/u, "")}/`);
  const response = await fetch(url, {
    headers: { "cache-control": "no-store" },
    signal: AbortSignal.timeout(5_000),
  });
  return { response, body: await response.text() };
}

async function assertVersion(origin, service) {
  const { response, body } = await get(origin, "/__version");
  if (!response.ok) throw new Error(`${service} version returned HTTP ${response.status}`);
  const payload = JSON.parse(body);
  if (payload.service !== service || payload.environment !== "staging" || payload.git_sha !== expectedSha) {
    throw new Error(`${service} version mismatch: ${body}`);
  }
}

await assertVersion(solidOrigin, "pirate-web-solid");
await assertVersion(publicOrigin, "pirate-web-solid-public");

const root = await get(solidOrigin, "/");
if (!root.response.ok) throw new Error(`Solid staging root returned HTTP ${root.response.status}`);

for (const path of ["/seam/host", "/seam/api", "/seam/binding"]) {
  const seam = await get(solidOrigin, path);
  if (seam.response.status !== 404) {
    throw new Error(`${path} is reachable on Solid staging: HTTP ${seam.response.status}`);
  }
}

console.log(`Solid isolated staging smoke passed for ${expectedSha}`);
