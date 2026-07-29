#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const gateArgs = process.argv.slice(2);
const expectedCountArgs = gateArgs.filter((arg) => arg.startsWith("--expected-count="));
if (expectedCountArgs.length > 1) {
  console.error("Pass --expected-count exactly once.");
  process.exit(2);
}

let expectedCount = 1;
if (expectedCountArgs.length === 1) {
  const expectedCountArg = expectedCountArgs[0];
  const parsed = Number(expectedCountArg.slice("--expected-count=".length));
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    console.error("--expected-count must be a positive integer.");
    process.exit(2);
  }
  expectedCount = parsed;
  gateArgs.splice(gateArgs.indexOf(expectedCountArg), 1);
}

if (gateArgs.length === 0) {
  console.error(
    "Usage: bun run test:e2e:required-gate -- [--expected-count=N] <playwright test arguments>",
  );
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

  const passedExpectedCount =
    exitCode === 0
    && expected === expectedCount
    && flaky === 0
    && skipped === 0
    && unexpected === 0;

  if (!passedExpectedCount) {
    console.error(
      `Required Playwright gate did not pass exactly ${expectedCount} time(s): exit=${exitCode} expected=${expected} flaky=${flaky} skipped=${skipped} unexpected=${unexpected}`,
    );
    process.exitCode = 1;
  } else {
    console.log(`Required Playwright gate passed exactly ${expectedCount} time(s).`);
  }
} finally {
  rmSync(reportDir, { force: true, recursive: true });
}
