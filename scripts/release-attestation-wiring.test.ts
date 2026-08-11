import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const productionDeploy = readFileSync(resolve(root, "scripts/deploy-production.sh"), "utf8");
const stagingDeploy = readFileSync(resolve(root, "scripts/deploy-staging.sh"), "utf8");
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
  scripts?: Record<string, string>;
};

describe("release attestation wiring", () => {
  test("staging and production pass the embedded release tuple to API", () => {
    for (const script of [productionDeploy, stagingDeploy]) {
      expect(script).toContain("__PIRATE_BUILD_RELEASE_ID__");
      expect(script).toContain("__PIRATE_BUILD_ID__");
      expect(script).toContain("__PIRATE_BUILD_WEB_SHA__");
      expect(script).toContain("__PIRATE_BUILD_API_SHA__");
      expect(script).toContain("__PIRATE_BUILD_CORE_SHA__");
    }
  });

  test("staging also creates and emits provenance during its build", () => {
    expect(packageJson.scripts?.["build:staging"]).toContain("bun run build:provenance");
    expect(packageJson.scripts?.["build:staging"]).toContain("bun run build:provenance:emit");
    expect(stagingDeploy).toContain("verify-dist");
  });
});
