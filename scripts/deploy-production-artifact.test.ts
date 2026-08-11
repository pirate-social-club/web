import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const deployScript = readFileSync(resolve(root, "scripts/deploy-production.sh"), "utf8");
const releaseWorkflow = readFileSync(resolve(root, ".github/workflows/release.yml"), "utf8");
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
  scripts?: Record<string, string>;
};

describe("production Web artifact provenance", () => {
  test("does not permit production to reuse an existing dist directory", () => {
    expect(deployScript).not.toContain("--skip-build");
    expect(releaseWorkflow).not.toContain("--skip-build");
  });

  test("generates and emits the in-artifact stamp as part of build:prod", () => {
    expect(packageJson.scripts?.["build:prod"]).toContain("bun run build:provenance");
    expect(packageJson.scripts?.["build:prod"]).toContain("bun run build:provenance:emit");
  });

  test("checks the dist stamp before the first service deploy", () => {
    const verifyIndex = deployScript.indexOf("verify web artifact provenance");
    const apiDeployIndex = deployScript.indexOf("deploy api production");

    expect(verifyIndex).toBeGreaterThan(0);
    expect(apiDeployIndex).toBeGreaterThan(verifyIndex);
    expect(deployScript).toContain("verify-dist");
    expect(deployScript).toContain("$WEB_FULL_SHA");
    expect(deployScript).toContain("$API_FULL_SHA");
    expect(deployScript).toContain("$CORE_RELEASE_SHA");
    expect(deployScript).toContain("PIRATE_BUILD_HOTFIX_REASON");
  });
});
