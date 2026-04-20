import { createPrivateKey, createPublicKey, sign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const POLL_INTERVAL_MS = 5_000;

function printHelp() {
  process.stdout.write(
    [
      "Usage: node ./scripts/build-openclaw-challenge.mjs [options]",
      "",
      "Options:",
      "  --identity <path>      OpenClaw identity file path",
      "  --message <value>      Override challenge message",
      "  --timestamp <ms>       Override challenge timestamp",
      "  --api-url <url>        Pirate API base URL for connector mode",
      "  --token <token>        Pirate bearer token (or PIRATE_SESSION env var)",
      "  --wait                 Poll Pirate completion every 5 seconds",
      "  --open                 Attempt to open the ClawKey registration URL",
      "  --print-bundle         Print the full browser import bundle",
      "  -h, --help             Show this help",
      "",
    ].join("\n"),
  );
}

function parseArgs(argv) {
  const args = {
    identityPath: join(homedir(), ".openclaw/identity/device.json"),
    message: null,
    timestamp: Date.now(),
    apiUrl: null,
    token: null,
    wait: false,
    open: false,
    printBundle: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if ((value === "-h" || value === "--help")) {
      args.help = true;
      continue;
    }
    if (value === "--wait") {
      args.wait = true;
      continue;
    }
    if (value === "--open") {
      args.open = true;
      continue;
    }
    if (value === "--print-bundle") {
      args.printBundle = true;
      continue;
    }
    if (value === "--identity" && argv[index + 1]) {
      args.identityPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (value === "--message" && argv[index + 1]) {
      args.message = argv[index + 1];
      index += 1;
      continue;
    }
    if (value === "--timestamp" && argv[index + 1]) {
      args.timestamp = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (value === "--api-url" && argv[index + 1]) {
      args.apiUrl = argv[index + 1];
      index += 1;
      continue;
    }
    if (value === "--token" && argv[index + 1]) {
      args.token = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${value}`);
  }

  return args;
}

async function loadIdentity(identityPath) {
  const rawIdentity = await readFile(identityPath, "utf8");
  const identity = JSON.parse(rawIdentity);

  if (
    !identity
    || typeof identity !== "object"
    || typeof identity.deviceId !== "string"
    || typeof identity.publicKeyPem !== "string"
    || typeof identity.privateKeyPem !== "string"
  ) {
    throw new Error("OpenClaw identity file is missing deviceId/publicKeyPem/privateKeyPem");
  }

  return identity;
}

function buildRegistrationBundle(identity, input) {
  const timestamp = Number.isFinite(input.timestamp) ? input.timestamp : Date.now();
  const message = input.message ?? `clawkey-register-${timestamp}`;
  const privateKey = createPrivateKey(identity.privateKeyPem);
  const publicKeyDer = createPublicKey(identity.publicKeyPem).export({ type: "spki", format: "der" });
  const signature = sign(null, Buffer.from(message, "utf8"), privateKey);

  return {
    display_name: "OpenClaw Agent",
    agent_challenge: {
      device_id: identity.deviceId,
      public_key: publicKeyDer.toString("base64"),
      message,
      signature: signature.toString("base64"),
      timestamp,
    },
    public_key_pem: identity.publicKeyPem,
    private_key_pem: identity.privateKeyPem,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeApiUrl(value) {
  const url = new URL(value);
  return url.toString().endsWith("/") ? url.toString().slice(0, -1) : url.toString();
}

async function callPirateJson(input) {
  const response = await fetch(input.url, {
    method: input.method,
    headers: {
      "accept": "application/json",
      "authorization": `Bearer ${input.token}`,
      ...(input.body ? { "content-type": "application/json" } : {}),
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload?.message === "string"
      ? payload.message
      : `Pirate API request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Pirate API response was not valid JSON");
  }

  return payload;
}

async function openUrl(url) {
  const command = process.platform === "darwin"
    ? "open"
    : process.platform === "win32"
      ? "cmd"
      : "xdg-open";
  const args = process.platform === "win32"
    ? ["/c", "start", "", url]
    : [url];

  await new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: "ignore",
      detached: true,
    });
    child.on("error", () => resolve());
    child.unref();
    resolve();
  });
}

async function runConnectorMode(input) {
  const apiUrl = normalizeApiUrl(input.apiUrl);
  const token = input.token || process.env.PIRATE_SESSION || null;
  if (!token) {
    throw new Error("Connector mode requires --token or PIRATE_SESSION");
  }

  const startResult = await callPirateJson({
    method: "POST",
    url: `${apiUrl}/agent-ownership-sessions`,
    token,
    body: {
      session_kind: "register",
      ownership_provider: "clawkey",
      display_name: input.bundle.display_name,
      agent_challenge: input.bundle.agent_challenge,
    },
  });

  const launch = startResult?.launch?.clawkey_registration;
  if (!launch || typeof launch.registration_url !== "string") {
    throw new Error("Pirate did not return a ClawKey registration URL");
  }

  process.stdout.write(`ClawKey registration URL: ${launch.registration_url}\n`);
  process.stdout.write(`Session ID: ${startResult.agent_ownership_session_id}\n`);

  if (input.open) {
    await openUrl(launch.registration_url);
  }

  if (!input.wait) {
    return;
  }

  while (true) {
    const completedSession = await callPirateJson({
      method: "POST",
      url: `${apiUrl}/agent-ownership-sessions/${encodeURIComponent(startResult.agent_ownership_session_id)}/complete`,
      token,
      body: {},
    });

    switch (completedSession.status) {
      case "verified":
        process.stdout.write(`Agent registered: ${completedSession.agent_id}\n`);
        return;
      case "failed":
      case "expired":
      case "cancelled":
        process.stdout.write(`Registration ended with status: ${completedSession.status}\n`);
        if (typeof completedSession.failure_reason === "string" && completedSession.failure_reason.trim()) {
          process.stdout.write(`${completedSession.failure_reason.trim()}\n`);
        }
        return;
      default:
        process.stdout.write(`Waiting for verification: ${completedSession.status}\n`);
        await sleep(POLL_INTERVAL_MS);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const identity = await loadIdentity(args.identityPath);
  const bundle = buildRegistrationBundle(identity, args);

  if (!args.apiUrl) {
    process.stdout.write(`${JSON.stringify(bundle, null, 2)}\n`);
    return;
  }

  await runConnectorMode({
    apiUrl: args.apiUrl,
    token: args.token,
    wait: args.wait,
    open: args.open,
    bundle,
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
