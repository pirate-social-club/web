import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tsgoCandidates = [
  path.join(rootDir, "node_modules", "@typescript", "native-preview", "bin", "tsgo.js"),
  path.join(rootDir, "node_modules", "@typescript", "native-preview", "bin", "tsgo"),
];
const tsgoBin = tsgoCandidates.find((bin) => fs.existsSync(bin));
const platformPkg = `native-preview-${process.platform}-${process.arch}`;
const hasPlatformBinary = fs.existsSync(
  path.join(rootDir, "node_modules", "@typescript", platformPkg),
);
const tscBin = path.join(rootDir, "node_modules", "typescript", "bin", "tsc");
const typecheckBin = tsgoBin && hasPlatformBinary ? tsgoBin : tscBin;

const userArgs = process.argv.slice(2);
const hasProjectFlag = userArgs.some(
  (a) => a === "-p" || a.startsWith("-p") || a === "--project" || a.startsWith("--project="),
);

const args = [
  typecheckBin,
  "--noEmit",
  ...(hasProjectFlag ? [] : ["-p", "tsconfig.json"]),
  ...userArgs,
];

console.error(`[typecheck] compiler=${path.relative(rootDir, typecheckBin)}`);

const child = spawn(process.execPath, args, { cwd: rootDir, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
