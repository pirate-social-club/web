// Generates `build-info.json` at the package root from package.json version + the
// current git SHA. Run before `bun test` and before `npm pack` (prepack) so the
// tested/published tarball carries provenance (spec §6). Gitignored — never committed.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const pkgRoot = resolve(import.meta.dir, "..");
const pkg = JSON.parse(readFileSync(resolve(pkgRoot, "package.json"), "utf8")) as { version: string };

function gitSha(): string {
  try {
    return execSync("git rev-parse HEAD", { cwd: pkgRoot, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const buildInfo = { version: pkg.version, gitSha: gitSha() } as const;
writeFileSync(resolve(pkgRoot, "build-info.json"), `${JSON.stringify(buildInfo, null, 2)}\n`);
console.info(`[karaoke-runtime] build-info.json -> ${buildInfo.version} @ ${buildInfo.gitSha.slice(0, 12) || "(no git)"}`);