#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const heapMb = readIntEnv("TSC_SAFE_HEAP_MB", defaultHeapMb());
const nicePriority = clamp(readIntEnv("TSC_SAFE_NICE", 10), -20, 19);
const buildInfoFile =
  process.env.TSC_SAFE_BUILD_INFO ?? "node_modules/.tmp/tsconfig.safe.tsbuildinfo";
const buildInfoPath = path.resolve(rootDir, buildInfoFile);
const tscBin = path.join(rootDir, "node_modules", "typescript", "bin", "tsc");

fs.mkdirSync(path.dirname(buildInfoPath), { recursive: true });

const args = [
  `--max-old-space-size=${heapMb}`,
  tscBin,
  "--noEmit",
  "--incremental",
  "--tsBuildInfoFile",
  buildInfoPath,
  ...process.argv.slice(2),
];

console.error(
  `[types:safe] heap=${heapMb}MB nice=${nicePriority} buildInfo=${path.relative(
    rootDir,
    buildInfoPath,
  )}`,
);

const child = spawn(process.execPath, args, {
  cwd: rootDir,
  env: process.env,
  stdio: "inherit",
});

try {
  os.setPriority(child.pid, nicePriority);
} catch (error) {
  console.error(`[types:safe] priority unchanged: ${error.message}`);
}

child.on("error", (error) => {
  console.error(`[types:safe] failed to start TypeScript: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

function defaultHeapMb() {
  const totalMb = Math.floor(os.totalmem() / 1024 / 1024);
  const availableMb = readLinuxMemAvailableMb() ?? Math.floor(os.freemem() / 1024 / 1024);

  return Math.max(
    768,
    Math.min(2048, Math.floor(totalMb / 4), Math.floor(availableMb / 2)),
  );
}

function readIntEnv(name, fallback) {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function readLinuxMemAvailableMb() {
  try {
    const meminfo = fs.readFileSync("/proc/meminfo", "utf8");
    const match = meminfo.match(/^MemAvailable:\s+(\d+)\s+kB$/m);
    return match ? Math.floor(Number.parseInt(match[1], 10) / 1024) : null;
  } catch {
    return null;
  }
}
