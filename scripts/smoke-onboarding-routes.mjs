#!/usr/bin/env node

const VALID_AVAILABILITY = new Set([
  "available",
  "taken",
  "reserved",
  "manual_review",
  "invalid",
]);

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

function hasArg(name) {
  return process.argv.includes(name);
}

function printUsage() {
  console.log(
    [
      "Usage:",
      "  node ./scripts/smoke-onboarding-routes.mjs --url <api-base-url> [--token <pirate-access-token>]",
      "",
      "Examples:",
      "  rtk bun run smoke:onboarding -- --url https://api-staging.pirate.sc",
      "  rtk bun run smoke:onboarding -- --url https://api-staging.pirate.sc --token <token>",
    ].join("\n"),
  );
}

function requireBaseUrl() {
  const value = readArg("--url") || process.env.PIRATE_API_BASE_URL || process.env.VITE_PIRATE_API_BASE_URL;
  if (!value) {
    printUsage();
    throw new Error("Missing --url");
  }
  return value.replace(/\/+$/u, "");
}

function buildUrl(baseUrl, path) {
  return new URL(path, `${baseUrl}/`).toString();
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { body, response };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runCheck(name, task) {
  process.stdout.write(`- ${name}... `);
  await task();
  process.stdout.write("ok\n");
}

async function expectUnauthorized(baseUrl, path, init) {
  const { response, body } = await fetchJson(buildUrl(baseUrl, path), init);
  assert(response.status === 401, `${path} returned ${response.status}, expected 401`);
  assert(body && typeof body === "object" && body.code === "auth_error", `${path} returned unexpected auth body`);
}

async function main() {
  if (hasArg("--help") || hasArg("-h")) {
    printUsage();
    return;
  }

  const baseUrl = requireBaseUrl();
  const token = readArg("--token") || process.env.PIRATE_ACCESS_TOKEN || null;

  console.log(`Onboarding smoke target: ${baseUrl}`);
  console.log(token ? "Mode: authenticated surface check" : "Mode: unauthenticated route-surface check");

  await runCheck("GET /health", async () => {
    const { response, body } = await fetchJson(buildUrl(baseUrl, "/health"));
    assert(response.status === 200, `/health returned ${response.status}`);
    assert(body && typeof body === "object" && body.ok === true, "/health returned unexpected body");
  });

  await runCheck("OPTIONS /onboarding/reddit-verification", async () => {
    const response = await fetch(buildUrl(baseUrl, "/onboarding/reddit-verification"), {
      method: "OPTIONS",
      headers: {
        origin: "https://pirate.test",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type,authorization",
      },
    });
    assert([200, 204].includes(response.status), `preflight returned ${response.status}`);
    const allowOrigin = response.headers.get("access-control-allow-origin");
    assert(allowOrigin === "*" || allowOrigin === "https://pirate.test", "missing CORS allow-origin");
  });

  await runCheck("GET /onboarding/status", async () => {
    if (!token) {
      await expectUnauthorized(baseUrl, "/onboarding/status");
      return;
    }

    const { response, body } = await fetchJson(buildUrl(baseUrl, "/onboarding/status"), {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    assert(response.status === 200, `/onboarding/status returned ${response.status}`);
    assert(body && typeof body === "object", "/onboarding/status returned unexpected body");
  });

  await runCheck("POST /onboarding/reddit-verification", async () => {
    await expectUnauthorized(baseUrl, "/onboarding/reddit-verification", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        reddit_username: "smokecheck",
      }),
    });
  });

  await runCheck("POST /onboarding/reddit-imports", async () => {
    await expectUnauthorized(baseUrl, "/onboarding/reddit-imports", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        reddit_username: "smokecheck",
      }),
    });
  });

  await runCheck("GET /onboarding/reddit-imports/latest", async () => {
    await expectUnauthorized(baseUrl, "/onboarding/reddit-imports/latest");
  });

  await runCheck("GET /onboarding/global-handle-availability", async () => {
    if (!token) {
      await expectUnauthorized(baseUrl, "/onboarding/global-handle-availability?label=smokecheck");
      return;
    }

    const { response, body } = await fetchJson(
      buildUrl(baseUrl, "/onboarding/global-handle-availability?label=smokecheck"),
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    );
    assert(response.status === 200, `availability returned ${response.status}`);
    assert(
      body
        && typeof body === "object"
        && typeof body.label === "string"
        && VALID_AVAILABILITY.has(body.status),
      "availability returned unexpected body",
    );
  });

  await runCheck("POST /profiles/me/global-handle/rename", async () => {
    await expectUnauthorized(baseUrl, "/profiles/me/global-handle/rename", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        desired_label: "smokecheck",
      }),
    });
  });

  console.log("Onboarding smoke check passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
