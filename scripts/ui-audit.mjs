import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const primitivesDir = path.join(projectRoot, "src", "components", "primitives");
const compositionsDir = path.join(projectRoot, "src", "components", "compositions");
const srcDir = path.join(projectRoot, "src");
const scannedExtensions = new Set([".json", ".md", ".ts", ".tsx", ".yml", ".yaml"]);
const ignoredDirs = new Set([".git", "node_modules", ".wrangler", "dist", "storybook-static"]);
const staleMarkers = [
  "pirate-v2",
  "/home/t42/Documents/pirate-v2",
  "pirate-api/services",
  "pirate-web/",
  "pirate-contracts/",
  "docs/ci",
  "docs/plans",
  "LEGACY-DO-NOT-USE",
  "Status: draft",
  "to be written",
  "hns-public-profile-routing",
  "coming soon",
  "terminal client",
];
const staleRegexMarkers = [
  { label: "TUI", pattern: /\bTUI\b/u },
  { label: "tui", pattern: /\btui\b/u },
];

function walk(dir, options = {}) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!options.skipIgnoredDirs || !ignoredDirs.has(entry.name)) files.push(...walk(fullPath, options));
      continue;
    }
    files.push(fullPath);
  }

  return files;
}

function relative(filePath) {
  return path.relative(projectRoot, filePath);
}

function checkPrimitiveStoryCoverage() {
  const primitiveFiles = fs
    .readdirSync(primitivesDir)
    .filter((name) => name.endsWith(".tsx") && !name.endsWith(".stories.tsx"));

  const missingStories = primitiveFiles
    .filter((name) => !fs.existsSync(path.join(primitivesDir, name.replace(/\.tsx$/, ".stories.tsx"))))
    .map((name) => relative(path.join(primitivesDir, name)));

  return {
    label: "primitives/story-coverage",
    passed: missingStories.length === 0,
    details: missingStories,
  };
}

function checkNoSmallText() {
  const offenders = [];

  for (const filePath of walk(srcDir)) {
    if (!filePath.endsWith(".tsx")) continue;

    const lines = fs.readFileSync(filePath, "utf8").split("\n");
    lines.forEach((line, index) => {
      if (/\btext-(xs|sm)\b/.test(line)) {
        offenders.push(`${relative(filePath)}:${index + 1}`);
      }
    });
  }

  return {
    label: "typography/no-small-text",
    passed: offenders.length === 0,
    details: offenders,
  };
}

function checkCompositionFolderRule() {
  const offenders = fs
    .readdirSync(compositionsDir)
    .filter((name) => name.endsWith(".tsx"))
    .filter((name) => !name.endsWith(".test.tsx") && !name.endsWith(".spec.tsx") && !name.endsWith(".stories.tsx"))
    .map((name) => relative(path.join(compositionsDir, name)));

  return {
    label: "compositions/folder-rule",
    passed: offenders.length === 0,
    details: offenders,
  };
}

function checkStaleMarkers() {
  const offenders = [];
  const self = path.normalize(__filename);

  for (const filePath of walk(projectRoot, { skipIgnoredDirs: true })) {
    if (path.normalize(filePath) === self) continue;
    if (!scannedExtensions.has(path.extname(filePath))) continue;

    const lines = fs.readFileSync(filePath, "utf8").split("\n");
    lines.forEach((line, index) => {
      for (const marker of staleMarkers) {
        if (line.includes(marker)) offenders.push(`${relative(filePath)}:${index + 1}: ${marker}`);
      }
      for (const marker of staleRegexMarkers) {
        if (marker.pattern.test(line)) offenders.push(`${relative(filePath)}:${index + 1}: ${marker.label}`);
      }
    });
  }

  return {
    label: "repo/no-stale-markers",
    passed: offenders.length === 0,
    details: offenders,
  };
}

const checks = [
  checkPrimitiveStoryCoverage(),
  checkNoSmallText(),
  checkCompositionFolderRule(),
  checkStaleMarkers(),
];

const failures = checks.filter((check) => !check.passed);

if (failures.length === 0) {
  console.log("ui:audit passed");
  for (const check of checks) {
    console.log(`- ${check.label}`);
  }
  process.exit(0);
}

console.error("ui:audit failed");
for (const failure of failures) {
  console.error(`- ${failure.label}`);
  for (const detail of failure.details) {
    console.error(`  ${detail}`);
  }
}
process.exit(1);
