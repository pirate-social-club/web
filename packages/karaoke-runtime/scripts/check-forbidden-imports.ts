#!/usr/bin/env bun
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const packageRoot = import.meta.dir.replace(/\/scripts$/, "");
const srcDir = join(packageRoot, "src");

const FORBIDDEN: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /from\s+["']react["']/, reason: "react import not allowed in runtime" },
  { pattern: /from\s+["']react-dom["']/, reason: "react-dom import not allowed in runtime" },
  { pattern: /from\s+["']@pirate\/karaoke-runtime\/test["']/, reason: "test subpath import not allowed in production sources" },
  { pattern: /from\s+["']\.\/test["']/, reason: "test module must not be imported by production sources" },
  { pattern: /import\.meta\.env/, reason: "Vite env access not allowed in runtime" },
  { pattern: /Date\.now\s*\(/, reason: "Date.now is non-deterministic; runtime must be pure" },
  { pattern: /crypto\.randomUUID\s*\(/, reason: "crypto.randomUUID is non-deterministic; runtime must be pure" },
  { pattern: /Math\.random\s*\(/, reason: "Math.random is non-deterministic; runtime must be pure" },
  { pattern: /\bAbortController\b/, reason: "Web API global not allowed in runtime" },
];

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      yield* walk(fullPath);
      continue;
    }
    if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
      yield fullPath;
    }
  }
}

let bad = 0;
const errors: string[] = [];

for (const file of walk(srcDir)) {
  const text = readFileSync(file, "utf8");
  for (const { pattern, reason } of FORBIDDEN) {
    if (pattern.test(text)) {
      errors.push(`${relative(packageRoot, file)}: ${reason}`);
      bad += 1;
    }
  }
}

if (bad > 0) {
  console.error("Forbidden imports detected in runtime sources:");
  for (const err of errors) {
    console.error(`  ${err}`);
  }
  process.exit(1);
}

console.log("Runtime sources are free of forbidden imports.");
