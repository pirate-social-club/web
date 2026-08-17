import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultSolidDirectory = resolve(scriptDirectory, "..");

const expectedManifest = {
  name: "@pirate/api-client",
  version: "0.3.0",
  type: "module",
  exports: {
    ".": {
      types: "./src/index.ts",
      import: "./src/index.ts",
      default: "./src/index.ts",
    },
    "./provenance.json": "./src/generated/provenance.json",
  },
  files: ["src/index.ts", "src/generated/client.ts", "src/generated/provenance.json"],
  sideEffects: false,
};

const expectedFiles = [
  "package.json",
  "src/index.ts",
  "src/generated/client.ts",
  "src/generated/provenance.json",
];

const expectedFileSha256 = {
  "package.json": "583076affdde6f4cc96ef51be752ddb74eb35f2c87f311fceeb2a96c7fba8962",
  "src/index.ts": "11fb7dcb53eaa17459277ca2d97380b767c44ac906ded043d812e000a5cca177",
  "src/generated/client.ts": "50ceb368b4030e5e86743b1dc6e4f3e93257f0a06a1a6fa92ff0cd3326d7e974",
  "src/generated/provenance.json": "a94c2a16f35a8b1f59ef3d18334dc53e3329b3f3fb5b9e4472f73c0e8614a47d",
};

function fail(message) {
  throw new Error(`api-next vendor verification failed: ${message}`);
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function collectFiles(directory, packageDirectory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(entryPath, packageDirectory)));
    else if (entry.isFile()) files.push(relative(packageDirectory, entryPath));
    else fail(`unexpected non-file entry ${relative(packageDirectory, entryPath)}`);
  }
  return files;
}

export async function verifyApiNextVendor(solidDirectory = defaultSolidDirectory) {
  const packageDirectory = join(solidDirectory, "vendor", "api-next");
  const bindingPath = join(solidDirectory, "vendor", "api-next-binding.json");
  const binding = JSON.parse(await readFile(bindingPath, "utf8"));
  if (binding.apiNextCommit !== "0c8af3845da4c8fdc59bfb1a2caf183831228a65") fail("api-next commit binding drifted");
  if (binding.package !== "@pirate/api-client" || binding.version !== "0.3.0") {
    fail("package identity or version drifted");
  }
  if (binding.openapiSha256 !== "e2c2a1fc3141708b6f9798070ec270c73274d648e3e63759bcd30f53c126b35b") {
    fail("OpenAPI checksum drifted");
  }
  if (binding.clientSha256 !== expectedFileSha256["src/generated/client.ts"]
    || binding.packageSha256 !== expectedFileSha256["package.json"]
    || JSON.stringify(binding.fileSha256) !== JSON.stringify(expectedFileSha256)) {
    fail("file checksum binding drifted");
  }

  const packageStats = await stat(packageDirectory);
  if (!packageStats.isDirectory()) fail("vendor package is not a directory");
  const actualFiles = (await collectFiles(packageDirectory, packageDirectory)).sort();
  const sortedExpectedFiles = [...expectedFiles].sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(sortedExpectedFiles)) {
    fail(`unexpected vendored file set: ${actualFiles.join(", ")}`);
  }

  const manifest = JSON.parse(await readFile(join(packageDirectory, "package.json"), "utf8"));
  if (JSON.stringify(manifest) !== JSON.stringify(expectedManifest)) fail("package manifest drifted");
  if (Object.keys(manifest).some(key => key === "dependencies" || key === "optionalDependencies")) {
    fail("vendored package gained runtime dependencies");
  }

  for (const file of expectedFiles) {
    const expected = expectedFileSha256[file];
    const actual = await sha256(join(packageDirectory, file));
    if (actual !== expected) fail(`${file} checksum drifted (${actual})`);
  }

  const provenance = JSON.parse(await readFile(join(packageDirectory, "src/generated/provenance.json"), "utf8"));
  if (provenance.package !== "@pirate/api-client" || provenance.version !== "0.3.0") {
    fail("generated provenance identity drifted");
  }
  if (provenance.openapiSha256 !== binding.openapiSha256 || provenance.clientSha256 !== binding.clientSha256) {
    fail("generated provenance checksum binding drifted");
  }
  return binding;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const binding = await verifyApiNextVendor();
    console.log(`api-next vendor verified: ${binding.apiNextCommit} @ ${binding.version}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
