#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const gateArgs = process.argv.slice(2);
if (gateArgs.length === 0) {
  console.error("Usage: bun run test:e2e:required-gate -- <playwright test arguments>");
  process.exit(2);
}

const reportDir = mkdtempSync(path.join(tmpdir(), "pirate-playwright-gate-"));
const jsonReportPath = path.join(reportDir, "report.json");

try {
  const result = spawnSync(
    "playwright",
    ["test", ...gateArgs, "--retries=0", "--reporter=line,html,json"],
    {
      env: {
        ...process.env,
        PLAYWRIGHT_HTML_OPEN: "never",
        PLAYWRIGHT_JSON_OUTPUT_FILE: jsonReportPath,
      },
      stdio: "inherit",
    },
  );

  if (result.error) {
    throw result.error;
  }

  const report = JSON.parse(readFileSync(jsonReportPath, "utf8"));
  const stats = report.stats ?? {};
  const expected = Number(stats.expected ?? 0);
  const flaky = Number(stats.flaky ?? 0);
  const skipped = Number(stats.skipped ?? 0);
  const unexpected = Number(stats.unexpected ?? 0);
  const exitCode = result.status ?? 1;

  const passedExactlyOnce =
    exitCode === 0
    && expected === 1
    && flaky === 0
    && skipped === 0
    && unexpected === 0;

  if (!passedExactlyOnce) {
    console.error(
      `Required Playwright gate did not pass exactly once: exit=${exitCode} expected=${expected} flaky=${flaky} skipped=${skipped} unexpected=${unexpected}`,
    );
    process.exitCode = 1;
  } else {
    console.log("Required Playwright gate passed exactly once.");
  }
} finally {
  rmSync(reportDir, { force: true, recursive: true });
}
