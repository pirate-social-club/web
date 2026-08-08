// Dependency advisory audit with a reviewed exception baseline.
//
// Two modes, deliberately different, because they answer different questions:
//
//   --mode release    "is there a critical advisory we have not consciously
//                     accepted?" Blocks the release. Applies EVERY baseline
//                     exception, expired or not — expiry must never turn a
//                     release red on a date nobody chose. Expiry is enforced by
//                     the scheduled mode instead.
//
//   --mode scheduled  "is our accepted risk still what we think it is?" Reports
//                     high and critical, applies only UNEXPIRED exceptions, and
//                     fails on an expired one. Runs off the release path, so
//                     failing here forces review without blocking deploys.
//
// Advisory publication is a time-varying input we do not control. Keeping it out
// of the release path is the entire point: before this, a newly published high
// advisory turned every release red until somebody hand-patched an --ignore.

import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { constants as zlibConstants, gunzipSync } from "node:zlib";

const SEVERITY_RANK = { critical: 4, high: 3, moderate: 2, low: 1, info: 0 };

function parseArgs(argv) {
  const args = { mode: "scheduled", baseline: null, targets: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--mode") args.mode = argv[++i];
    else if (argv[i] === "--baseline") args.baseline = argv[++i];
    else if (argv[i] === "--target") args.targets.push(argv[++i]);
  }
  if (!["release", "scheduled"].includes(args.mode)) {
    throw new Error(`--mode must be release or scheduled, got ${args.mode}`);
  }
  if (!args.baseline) throw new Error("--baseline is required");
  if (args.targets.length === 0) throw new Error("at least one --target dir:tool is required");
  return args;
}

function run(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [];
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout.push(Buffer.from(chunk)); });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => resolve({ code: -1, stderr: String(error), stdout: Buffer.alloc(0) }));
    child.on("close", (code) => resolve({ code, stderr, stdout: Buffer.concat(stdout) }));
  });
}

export function decodeBunAuditOutput(raw) {
  const bytes = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    // Bun exposes only the response body, not HTTP Content-Encoding. Accept
    // gzip-framed stdout as well as the documented plain JSON form. Z_SYNC_FLUSH
    // also recovers a complete JSON body when a proxy omits the gzip trailer.
    const decoded = gunzipSync(bytes, { finishFlush: zlibConstants.Z_SYNC_FLUSH }).toString("utf8");
    if (!decoded.trim()) throw new Error("bun audit gzip output decoded to an empty body");
    return decoded;
  }
  return bytes.toString("utf8");
}

// `bun audit --json` keys advisories by package name. Exit code is non-zero when
// anything is found at all, so it cannot be used to decide policy — we always
// parse and judge the findings ourselves.
export function normalizeBun(raw) {
  const parsed = JSON.parse(raw);
  const findings = [];
  for (const [name, advisories] of Object.entries(parsed)) {
    if (!Array.isArray(advisories)) continue;
    for (const advisory of advisories) {
      findings.push({
        ghsa: String(advisory.url ?? "").split("/").pop() ?? null,
        package: name,
        severity: String(advisory.severity ?? "info").toLowerCase(),
        title: advisory.title ?? "",
        url: advisory.url ?? "",
      });
    }
  }
  return findings;
}

// `npm audit --json` nests advisories under vulnerabilities[pkg].via, where a via
// entry is either an advisory object or a string naming another package (an
// indirect path). Only the objects carry a GHSA.
export function normalizeNpm(raw) {
  const parsed = JSON.parse(raw);
  const findings = [];
  for (const [name, entry] of Object.entries(parsed.vulnerabilities ?? {})) {
    for (const via of entry.via ?? []) {
      if (typeof via !== "object") continue;
      findings.push({
        ghsa: String(via.url ?? "").split("/").pop() ?? null,
        package: via.name ?? name,
        severity: String(via.severity ?? entry.severity ?? "info").toLowerCase(),
        title: via.title ?? "",
        url: via.url ?? "",
      });
    }
  }
  return findings;
}

async function auditTarget(target) {
  const [dir, tool] = target.split(":");
  const command = tool === "npm" ? "npm" : "bun";
  const { code, stderr, stdout } = await run(command, ["audit", "--json"], dir);
  if (stdout.length === 0) {
    throw new Error(`${command} audit in ${dir} produced no output (exit ${code}): ${stderr.slice(0, 400)}`);
  }
  const decoded = tool === "npm" ? stdout.toString("utf8") : decodeBunAuditOutput(stdout);
  const findings = tool === "npm" ? normalizeNpm(decoded) : normalizeBun(decoded);
  return findings.map((finding) => ({ ...finding, target: dir }));
}

export function loadExceptions(baseline, now) {
  const byGhsa = new Map();
  for (const entry of baseline.exceptions ?? []) {
    if (!entry.advisory) throw new Error("every baseline exception needs an `advisory`");
    if (!entry.reason) throw new Error(`baseline exception ${entry.advisory} needs a \`reason\``);
    if (!entry.expires) throw new Error(`baseline exception ${entry.advisory} needs an \`expires\` date`);
    const expires = new Date(entry.expires);
    if (Number.isNaN(expires.getTime())) {
      throw new Error(`baseline exception ${entry.advisory} has an unparseable \`expires\`: ${entry.expires}`);
    }
    byGhsa.set(entry.advisory, { ...entry, expired: expires.getTime() < now.getTime(), expiresAt: expires });
  }
  return byGhsa;
}

function dedupe(findings) {
  const seen = new Map();
  for (const finding of findings) {
    const key = `${finding.target}|${finding.package}|${finding.ghsa}`;
    if (!seen.has(key)) seen.set(key, finding);
  }
  return [...seen.values()];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = new Date();
  const baseline = JSON.parse(await readFile(args.baseline, "utf8"));
  const exceptions = loadExceptions(baseline, now);

  const threshold = args.mode === "release" ? SEVERITY_RANK.critical : SEVERITY_RANK.high;
  const all = dedupe((await Promise.all(args.targets.map(auditTarget))).flat());
  const atOrAbove = all.filter((f) => (SEVERITY_RANK[f.severity] ?? 0) >= threshold);

  const blocking = [];
  const accepted = [];
  for (const finding of atOrAbove) {
    const exception = finding.ghsa ? exceptions.get(finding.ghsa) : undefined;
    // Release mode honours expired exceptions on purpose: a date passing must not
    // block a deploy. Scheduled mode is where expiry bites.
    const applies = exception && (args.mode === "release" || !exception.expired);
    if (applies) accepted.push({ ...finding, exception });
    else blocking.push(finding);
  }

  const expired = args.mode === "scheduled"
    ? [...exceptions.values()].filter((entry) => entry.expired)
    : [];

  const lines = [];
  lines.push(`mode=${args.mode} threshold=${args.mode === "release" ? "critical" : "high"}`);
  lines.push(`scanned ${args.targets.length} target(s); ${all.length} advisory instance(s) total`);
  for (const finding of blocking) {
    lines.push(`BLOCKING  [${finding.severity}] ${finding.package} ${finding.ghsa ?? "?"} (${finding.target}) — ${finding.title}`);
  }
  for (const finding of accepted) {
    const note = finding.exception.expired ? " EXPIRED" : "";
    lines.push(`accepted  [${finding.severity}] ${finding.package} ${finding.ghsa} — ${finding.exception.reason} (expires ${finding.exception.expires}${note})`);
  }
  for (const entry of expired) {
    lines.push(`EXPIRED   ${entry.advisory} — exception lapsed ${entry.expires}: ${entry.reason}`);
  }
  if (blocking.length === 0 && expired.length === 0) lines.push("no action required");

  const report = lines.join("\n");
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFile } = await import("node:fs/promises");
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Dependency audit (${args.mode})\n\n\`\`\`\n${report}\n\`\`\`\n`);
  }
  if (process.env.GITHUB_OUTPUT) {
    const { appendFile } = await import("node:fs/promises");
    const body = report.replace(/%/gu, "%25").replace(/\n/gu, "%0A").replace(/\r/gu, "%0D");
    await appendFile(process.env.GITHUB_OUTPUT, `report=${body}\nblocking=${blocking.length}\nexpired=${expired.length}\n`);
  }

  if (blocking.length > 0 || expired.length > 0) process.exit(1);
}

// Only run when invoked directly, so the normalizers above stay unit-testable.
if (process.argv[1] && import.meta.url === (await import("node:url")).pathToFileURL(process.argv[1]).href) {
  await main();
}
