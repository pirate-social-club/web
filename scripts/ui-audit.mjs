import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(projectRoot, "..");

const primitivesDir = path.join(projectRoot, "src", "components", "primitives");
const compositionsDir = path.join(projectRoot, "src", "components", "compositions");
const srcDir = path.join(projectRoot, "src");
const solidStoryRoots = [
  path.join(projectRoot, "solid"),
  path.join(projectRoot, "packages", "solid-ui"),
];
const solidPrimitiveRoots = [
  path.join(projectRoot, "packages", "solid-ui", "src", "components"),
  path.join(projectRoot, "packages", "solid-ui", "src", "patterns"),
];
const typographyRoots = [
  path.join(projectRoot, "solid", "src"),
  path.join(projectRoot, "packages", "solid-ui", "src"),
];
const typographyPrimitivePaths = new Set([
  path.join(projectRoot, "packages", "solid-ui", "src", "components", "data-display", "type", "type.tsx"),
].map((filePath) => path.normalize(filePath)));
const typographyBaselinePath = path.join(projectRoot, "scripts", "ui-audit-typography-baseline.json");
const updateTypographyBaseline = process.argv.includes("--update-typography-baseline");
const uiSourceDirs = [
  srcDir,
  path.join(projectRoot, "solid"),
  path.join(projectRoot, "packages", "solid-ui"),
];
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
const typographyUtilityPattern = /(?:[a-z0-9-]+:)*(?:text-(?:\[[^\]]+\]|xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)|font-(?:\[[^\]]+\]|thin|extralight|light|normal|medium|semibold|bold|extrabold|black|sans|serif|mono)|leading-(?:\[[^\]]+\]|none|tight|snug|normal|relaxed|loose|[0-9]+)|tracking-(?:\[[^\]]+\]|tighter|tight|normal|wide|wider|widest))/gu;

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

function walkRoots(dirs, options = {}) {
  return dirs.flatMap((dir) => walk(dir, options));
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
  const reactPrimitiveFiles = fs
    .readdirSync(primitivesDir)
    .filter((name) => name.endsWith(".tsx") && !name.endsWith(".stories.tsx") && !name.endsWith(".test.tsx"));

  const missingReactStories = reactPrimitiveFiles
    .filter((name) => !fs.existsSync(path.join(primitivesDir, name.replace(/\.tsx$/, ".stories.tsx"))))
    .map((name) => relative(path.join(primitivesDir, name)));

  const solidPrimitiveFiles = solidPrimitiveRoots.flatMap((root) =>
    walk(root, { skipIgnoredDirs: true })
      .filter((filePath) => filePath.endsWith(".tsx"))
      .filter((filePath) => !filePath.endsWith(".stories.tsx") && !filePath.endsWith(".test.tsx") && !filePath.endsWith(".spec.tsx"))
      .filter((filePath) => path.basename(filePath, ".tsx") === path.basename(path.dirname(filePath))),
  );

  const missingSolidStories = solidPrimitiveFiles
    .filter((filePath) => !fs.existsSync(filePath.replace(/\.tsx$/, ".stories.tsx")))
    .map(relative);

  const missingStories = [...missingReactStories, ...missingSolidStories].sort();

  return {
    label: "primitives/story-coverage",
    passed: missingStories.length === 0,
    details: missingStories,
  };
}

function propertyName(property) {
  if (!property.name) return null;
  if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) || ts.isNumericLiteral(property.name)) {
    return property.name.text;
  }
  return null;
}

function normalizeNode(node, sourceFile) {
  return node.getText(sourceFile).replace(/\s+/gu, " ").trim();
}

function normalizeProperty(property, sourceFile) {
  if (!ts.isPropertyAssignment(property)) return normalizeNode(property, sourceFile);

  return `${propertyName(property)}:${normalizeNode(property.initializer, sourceFile)}`;
}

function normalizeMetadata(initializer, sourceFile) {
  if (!ts.isObjectLiteralExpression(initializer)) return normalizeNode(initializer, sourceFile);

  const properties = initializer.properties
    .filter((property) => propertyName(property) !== "viewport")
    .map((property) => normalizeProperty(property, sourceFile));

  return properties.length === 0 ? null : `{${properties.join(",")}}`;
}

function normalizeStory(story, sourceFile) {
  const properties = [];

  for (const property of story.properties) {
    const name = propertyName(property);
    if (name === "name") continue;

    if ((name === "globals" || name === "parameters") && ts.isPropertyAssignment(property)) {
      const metadata = normalizeMetadata(property.initializer, sourceFile);
      if (metadata) properties.push(`${name}:${metadata}`);
      continue;
    }

    properties.push(normalizeProperty(property, sourceFile));
  }

  return `{${properties.join(",")}}`;
}

function checkNoDuplicateStoryBodies() {
  const offenders = [];

  for (const filePath of walkRoots(solidStoryRoots, { skipIgnoredDirs: true })) {
    if (!filePath.endsWith(".stories.tsx")) continue;

    const source = fs.readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const stories = new Map();

    for (const statement of sourceFile.statements) {
      if (!ts.isVariableStatement(statement) || !statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;

      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !ts.isObjectLiteralExpression(declaration.initializer)) continue;
        if (!declaration.initializer.properties.some((property) => ["render", "args", "play"].includes(propertyName(property)))) continue;

        const normalized = normalizeStory(declaration.initializer, sourceFile);
        const hash = createHash("sha256").update(normalized).digest("hex");
        const entries = stories.get(hash) ?? [];
        entries.push({ name: declaration.name.text, line: sourceFile.getLineAndCharacterOfPosition(declaration.getStart(sourceFile)).line + 1 });
        stories.set(hash, entries);
      }
    }

    for (const entries of stories.values()) {
      if (entries.length < 2) continue;
      const file = relative(filePath);
      offenders.push(`${file}: ${entries.map(({ name, line }) => `${name} (${line})`).join(", ")}`);
    }
  }

  return {
    label: "stories/no-duplicate-render-bodies",
    passed: offenders.length === 0,
    details: offenders,
  };
}

function checkNoStoryNondeterminism() {
  const offenders = [];
  const bannedPatterns = [
    { label: "setInterval", pattern: /\bsetInterval\s*\(/u },
    { label: "setTimeout", pattern: /\bsetTimeout\s*\(/u },
    { label: "Math.random", pattern: /\bMath\.random\s*\(/u },
    { label: "Date.now", pattern: /\bDate\.now\s*\(/u },
    { label: "fetch", pattern: /\bfetch\s*\(/u },
  ];

  for (const filePath of walkRoots(solidStoryRoots, { skipIgnoredDirs: true })) {
    if (!filePath.endsWith(".stories.tsx")) continue;

    const lines = fs.readFileSync(filePath, "utf8").split("\n");
    lines.forEach((line, index) => {
      for (const bannedPattern of bannedPatterns) {
        if (bannedPattern.pattern.test(line)) {
          offenders.push(`${relative(filePath)}:${index + 1}: ${bannedPattern.label}`);
        }
      }
    });
  }

  return {
    label: "stories/no-nondeterminism",
    passed: offenders.length === 0,
    details: offenders,
  };
}

function checkNoSmallText() {
  const offenders = [];

  for (const filePath of walkRoots(uiSourceDirs, { skipIgnoredDirs: true })) {
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

function collectTypographyViolationCounts() {
  const counts = {};

  for (const filePath of walkRoots(typographyRoots, { skipIgnoredDirs: true })) {
    if (
      !filePath.endsWith(".tsx") ||
      filePath.endsWith(".test.tsx") ||
      filePath.endsWith(".spec.tsx") ||
      typographyPrimitivePaths.has(path.normalize(filePath))
    ) continue;

    const count = fs
      .readFileSync(filePath, "utf8")
      .split("\n")
      .reduce((total, line) => total + (line.match(typographyUtilityPattern)?.length ?? 0), 0);

    if (count > 0) counts[relative(filePath)] = count;
  }

  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function checkTypographyRatchet() {
  const current = collectTypographyViolationCounts();

  if (updateTypographyBaseline) {
    fs.writeFileSync(
      typographyBaselinePath,
      `${JSON.stringify({ version: 1, files: current }, null, 2)}\n`,
    );
    return {
      label: "typography/no-raw-utility-increase",
      passed: true,
      details: [`updated ${relative(typographyBaselinePath)}`],
    };
  }

  if (!fs.existsSync(typographyBaselinePath)) {
    return {
      label: "typography/no-raw-utility-increase",
      passed: false,
      details: [`missing ${relative(typographyBaselinePath)}; run bun run ui:audit:typography-baseline`],
    };
  }

  const baseline = JSON.parse(fs.readFileSync(typographyBaselinePath, "utf8"));
  const baselineFiles = baseline.files ?? {};
  const offenders = [];

  for (const [filePath, count] of Object.entries(current)) {
    const previous = Number(baselineFiles[filePath] ?? 0);
    if (count > previous) {
      offenders.push(`${filePath}: ${previous} -> ${count} (+${count - previous})`);
    }
  }

  return {
    label: "typography/no-raw-utility-increase",
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

  for (const filePath of walkRoots(uiSourceDirs, { skipIgnoredDirs: true })) {
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

  for (const filePath of walkRoots(uiSourceDirs, { skipIgnoredDirs: true })) {
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
  checkNoDuplicateStoryBodies(),
  checkNoStoryNondeterminism(),
  checkTypographyRatchet(),
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
