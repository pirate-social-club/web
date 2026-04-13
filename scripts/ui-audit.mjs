import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const primitivesDir = path.join(projectRoot, "src", "components", "primitives");
const compositionsDir = path.join(projectRoot, "src", "components", "compositions");
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

const checks = [
  checkPrimitiveStoryCoverage(),
  checkNoSmallText(),
  checkCompositionFolderRule(),
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
