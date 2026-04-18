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

function collectImportStatements(code) {
  return [...code.matchAll(/import\s+(type\s+)?[\s\S]*?\sfrom\s+["']([^"']+)["'];?/g)].map((match) => ({
    isTypeOnly: match[1] === "type ",
    source: match[2],
    statement: match[0],
  }));
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

const checks = [
  checkNoValueRwsdkImport("rwsdk/worker"),
  checkNoValueRwsdkImport("rwsdk/router"),
  checkPublicRouteIsolation(),
  checkDocumentRwsdkImportsAreTypeOnly(),
];

const failures = checks.filter((check) => !check.passed);

if (failures.length === 0) {
  console.log("boundary:audit passed");
  for (const check of checks) {
    console.log(`- ${check.label}`);
  }
  process.exit(0);
}

console.error("boundary:audit failed");
for (const failure of failures) {
  console.error(`- ${failure.label}`);
  for (const detail of failure.details) {
    console.error(`  ${detail}`);
  }
}
process.exit(1);
