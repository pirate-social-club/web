import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const srcDir = path.join(projectRoot, "src");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    files.push(fullPath);
  }

  return files;
}

function relative(filePath) {
  return path.relative(projectRoot, filePath);
}

export function collectImportStatements(code) {
  return [...code.matchAll(/import\s+(type\s+)?[\s\S]*?\sfrom\s+["']([^"']+)["'];?/g)].map((match) => ({
    isTypeOnly: match[1] === "type ",
    source: match[2],
    statement: match[0],
  }));
}

export function collectModuleSources(code) {
  const sources = new Set(collectImportStatements(code).map((statement) => statement.source));
  const additionalPatterns = [
    /import\s*["']([^"']+)["']/gu,
    /import\s*\(\s*["']([^"']+)["']\s*\)/gu,
    /export\s+(?:type\s+)?(?:\*|\{[\s\S]*?\})\s+from\s+["']([^"']+)["']/gu,
  ];
  for (const pattern of additionalPatterns) {
    for (const match of code.matchAll(pattern)) {
      sources.add(match[1]);
    }
  }
  return [...sources];
}

export function isTestOrStoryFile(filePath) {
  const normalized = filePath.split(path.sep).join("/");
  return /\.(?:test|spec|stories)\.[cm]?[jt]sx?$/u.test(normalized)
    || /(?:^|\/)(?:__tests__|test|tests|stories)(?:\/|$)/u.test(normalized);
}

function importsFixtureModule(source) {
  return source.split("/").includes("fixtures");
}

export function checkNoProductionFixtureImports(rootDir = srcDir) {
  const offenders = [];

  for (const filePath of walk(rootDir)) {
    if (!filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) continue;
    if (isTestOrStoryFile(filePath)) continue;

    const code = fs.readFileSync(filePath, "utf8");
    for (const source of collectModuleSources(code)) {
      if (importsFixtureModule(source)) {
        offenders.push(`${path.relative(rootDir, filePath)} -> ${source}`);
      }
    }
  }

  return {
    label: "layers/no-production-fixture-imports",
    passed: offenders.length === 0,
    details: offenders.sort(),
  };
}

function checkNoValueRwsdkImport(moduleName) {
  const allowedFile = path.join(srcDir, "worker.tsx");
  const offenders = [];

  for (const filePath of walk(srcDir)) {
    if (!filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) continue;
    if (filePath === allowedFile) continue;

    const code = fs.readFileSync(filePath, "utf8");
    const imports = collectImportStatements(code);
    for (const statement of imports) {
      if (statement.source === moduleName && !statement.isTypeOnly) {
        offenders.push(relative(filePath));
        break;
      }
    }
  }

  return {
    label: `rwsdk/no-value-import-${moduleName.split("/")[1]}`,
    passed: offenders.length === 0,
    details: offenders,
  };
}

function checkPublicRouteIsolation() {
  const files = [
    path.join(srcDir, "app", "public-route-renderer.tsx"),
    path.join(srcDir, "app", "public-profile-route.tsx"),
  ];
  const offenders = [];

  for (const filePath of files) {
    const code = fs.readFileSync(filePath, "utf8");
    const imports = collectImportStatements(code);
    for (const statement of imports) {
      if (
        statement.source.includes("@/lib/auth")
        || statement.source.includes("@privy-io/react-auth")
      ) {
        offenders.push(`${relative(filePath)} -> ${statement.source}`);
      }
    }
  }

  return {
    label: "public-routes/no-auth-imports",
    passed: offenders.length === 0,
    details: offenders,
  };
}

function checkDocumentRwsdkImportsAreTypeOnly() {
  const filePath = path.join(srcDir, "app", "document.tsx");
  const code = fs.readFileSync(filePath, "utf8");
  const offenders = collectImportStatements(code)
    .filter((statement) => (
      (statement.source === "rwsdk/worker" || statement.source === "rwsdk/router")
      && !statement.isTypeOnly
    ))
    .map((statement) => `${relative(filePath)} -> ${statement.source}`);

  return {
    label: "document/type-only-rwsdk-imports",
    passed: offenders.length === 0,
    details: offenders,
  };
}

export function runBoundaryAudit() {
  const checks = [
    checkNoValueRwsdkImport("rwsdk/worker"),
    checkNoValueRwsdkImport("rwsdk/router"),
    checkPublicRouteIsolation(),
    checkDocumentRwsdkImportsAreTypeOnly(),
    checkNoProductionFixtureImports(),
  ];

  const failures = checks.filter((check) => !check.passed);

  if (failures.length === 0) {
    console.log("boundary:audit passed");
    for (const check of checks) {
      console.log(`- ${check.label}`);
    }
    return true;
  }

  console.error("boundary:audit failed");
  for (const failure of failures) {
    console.error(`- ${failure.label}`);
    for (const detail of failure.details) {
      console.error(`  ${detail}`);
    }
  }
  return false;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  process.exit(runBoundaryAudit() ? 0 : 1);
}
