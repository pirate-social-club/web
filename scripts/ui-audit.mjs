import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(projectRoot, "..");

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

function relativeWorkspace(filePath) {
  return path.relative(workspaceRoot, filePath);
}

function checkNoDuplicateWebTrees() {
  const duplicateTree = path.join(workspaceRoot, "web-publisher-flow-clean");

  return {
    label: "repo/no-duplicate-web-tree",
    passed: !fs.existsSync(duplicateTree),
    details: fs.existsSync(duplicateTree) ? [relativeWorkspace(duplicateTree)] : [],
  };
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

function checkNoHardcodedColors() {
  const offenders = [];
  const bannedPatterns = [
    /\bbg-\[#/,
    /\btext-\[#/,
    /\bborder-\[#/,
    /\bring-\[#/,
    /\bshadow-\[.*rgba\(/,
    /\bbg-\[color-mix\(/,
    /style\.backgroundColor\s*=\s*["']#/,
    /\b(?:bg|text|border|ring|from|via|to)-(?:amber|blue|brown|cyan|emerald|fuchsia|gray|green|indigo|lime|neutral|orange|pink|purple|red|rose|sky|slate|stone|teal|violet|yellow|zinc)-\d{2,3}\b/,
  ];

  for (const filePath of walk(srcDir)) {
    if (!filePath.endsWith(".tsx") && !filePath.endsWith(".ts")) continue;

    const lines = fs.readFileSync(filePath, "utf8").split("\n");
    lines.forEach((line, index) => {
      for (const pattern of bannedPatterns) {
        if (pattern.test(line)) {
          offenders.push(`${relative(filePath)}:${index + 1}`);
          break;
        }
      }
    });
  }

  return {
    label: "color/no-hardcoded-colors",
    passed: offenders.length === 0,
    details: offenders,
  };
}

function checkNoArbitrarySpacing() {
  const offenders = [];
  const bannedPatterns = [
    /\bborder-\[\d+(?:\.\d+)?(?:px|rem)\]/,
    /\brounded-\[1\.75rem\]/,
    /\brounded-\[1\.25rem\]/,
    /\brounded-\[1\.5rem\]/,
    /\brounded-\[2rem\]/,
    /\brounded-\[2\.5rem\]/,
    /\brounded-\[0\.4rem\]/,
    /\brounded-\[28px\]/,
    /\bw-\[360px\]/,
    /\bmax-w-\[64rem\]/,
    /\bmax-w-\[72rem\]/,
    /\bmax-w-\[78rem\]/,
    /\bmax-w-\[40rem\]/,
    /\bmax-w-\[24rem\]/,
    /\bw-\[12rem\]/,
    /\bw-\[18rem\]/,
    /\bxl:w-\[21rem\]/,
    /\bmin-w-\[8rem\]/,
    /\bmin-w-\[10rem\]/,
    /\bmin-w-\[12rem\]/,
    /\bmin-h-\[88px\]/,
    /\bmin-h-\[18rem\]/,
    /\bmin-h-\[20rem\]/,
    /\bh-\[4\.5rem\]/,
    /\btop-\[4\.5rem\]/,
    /\bh-\[1px\]/,
    /\bw-\[1px\]/,
  ];

  for (const filePath of walk(srcDir)) {
    if (!filePath.endsWith(".tsx") && !filePath.endsWith(".ts")) continue;

    const lines = fs.readFileSync(filePath, "utf8").split("\n");
    lines.forEach((line, index) => {
      for (const pattern of bannedPatterns) {
        if (pattern.test(line)) {
          offenders.push(`${relative(filePath)}:${index + 1}`);
          break;
        }
      }
    });
  }

  return {
    label: "spacing/no-arbitrary-spacing",
    passed: offenders.length === 0,
    details: offenders,
  };
}

function checkNoCompositionRouteMessages() {
  const offenders = [];
  const routeMessagesImport = /from\s+["']@\/hooks\/use-route-messages["']/u;

  for (const filePath of walk(compositionsDir)) {
    if (!filePath.endsWith(".tsx") && !filePath.endsWith(".ts")) continue;

    const lines = fs.readFileSync(filePath, "utf8").split("\n");
    lines.forEach((line, index) => {
      if (routeMessagesImport.test(line)) {
        offenders.push(`${relative(filePath)}:${index + 1}`);
      }
    });
  }

  return {
    label: "compositions/no-route-messages-hook",
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

function todayUtcDateOnly() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function parseUtcDateOnly(year, month, day) {
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
}

function checkNoExpiredDatedTodos() {
  const offenders = [];
  const self = path.normalize(__filename);
  const today = todayUtcDateOnly();
  const datedTodoPattern = /remove after (\d{4})-(\d{2})-(\d{2})/iu;

  for (const filePath of walk(projectRoot, { skipIgnoredDirs: true })) {
    if (path.normalize(filePath) === self) continue;
    if (!scannedExtensions.has(path.extname(filePath))) continue;

    const lines = fs.readFileSync(filePath, "utf8").split("\n");
    lines.forEach((line, index) => {
      const match = line.match(datedTodoPattern);
      if (!match) return;

      const expiry = parseUtcDateOnly(match[1], match[2], match[3]);
      if (today > expiry) {
        offenders.push(`${relative(filePath)}:${index + 1}: ${match[0]}`);
      }
    });
  }

  return {
    label: "repo/no-expired-dated-todos",
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
  checkNoDuplicateWebTrees(),
  checkPrimitiveStoryCoverage(),
  checkNoSmallText(),
  checkNoHardcodedColors(),
  checkNoArbitrarySpacing(),
  checkNoCompositionRouteMessages(),
  checkCompositionFolderRule(),
  checkNoExpiredDatedTodos(),
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
