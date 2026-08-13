import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const productionDeploy = readFileSync(resolve(root, "scripts/deploy-production.sh"), "utf8");
const stagingDeploy = readFileSync(resolve(root, "scripts/deploy-staging.sh"), "utf8");
const releaseSource = readFileSync(resolve(root, "scripts/lib/release-source.sh"), "utf8");
const releaseWorkflow = readFileSync(resolve(root, ".github/workflows/release.yml"), "utf8");
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
      expect(script).toContain("__PIRATE_BUILD_SOURCE_STATE__");
      expect(script).toContain("__PIRATE_BUILD_DEPLOY_REASON_SLUG__");
      expect(script).toContain("__PIRATE_BUILD_HOTFIX_REASON_SLUG__");
      expect(script).toContain("__PIRATE_BUILD_PATCH_SHA256__");
    }
  });

  test("staging also creates and emits provenance during its build", () => {
    expect(packageJson.scripts?.["build:staging"]).toContain("bun run build:provenance");
    expect(packageJson.scripts?.["build:staging"]).toContain("bun run build:service-worker");
    expect(packageJson.scripts?.["build:staging"]).toContain("bun run build:provenance:emit");
    expect(stagingDeploy).toContain("verify-dist");
  });

  test("allows only postinstall to fall back to non-release provenance", () => {
    expect(packageJson.scripts?.postinstall).toContain("--allow-placeholder");
    expect(packageJson.scripts?.["build:provenance"]).not.toContain("--allow-placeholder");
  });

  test("derives manual staging authority from the explicitly deployed SHAs", () => {
    const manualGate = releaseWorkflow.slice(
      releaseWorkflow.indexOf("gate-builder-staging-verification:"),
      releaseWorkflow.indexOf("api-staging-contract-gate:"),
    );
    expect(manualGate).toContain("WEB_SHA: ${{ inputs.expected_staging_web_sha }}");
    expect(manualGate).toContain("API_SHA: ${{ inputs.expected_staging_api_sha }}");
    expect(manualGate).toContain("CORE_SHA: ${{ needs.release-inputs.outputs.core_sha }}");
    expect(manualGate).toContain("EXPECTED_RELEASE_ID: ${{ steps.expected_deployed_release.outputs.value }}");
    expect(manualGate).not.toContain("EXPECTED_RELEASE_ID: ${{ needs.release-inputs.outputs.release_id }}");
  });

  test("keeps full commit identity separate from hotfix content", () => {
    expect(releaseSource).toContain('git -C "$1" rev-parse HEAD');
    expect(releaseSource).not.toContain("rev-parse --short HEAD");
    expect(productionDeploy).not.toContain('WEB_SHA="${WEB_SHA}-hotfix-');
    expect(productionDeploy).not.toContain('API_SHA="${API_SHA}-hotfix-');
    expect(stagingDeploy).not.toContain('WEB_SHA="${WEB_SHA}-non-main-');
    expect(stagingDeploy).not.toContain('API_SHA="${API_SHA}-non-main-');
  });

  test("activates the generic-goods schema requirement from the release flag in both fleet scans", () => {
    expect(releaseWorkflow).toContain(
      "GENERIC_DIGITAL_GOODS_ENABLED: ${{ vars.GENERIC_DIGITAL_GOODS_ENABLED || 'false' }}",
    );
    expect(releaseWorkflow.match(/true\) schema_feature_args\+=\(--features generic_digital_goods\)/g)).toHaveLength(2);
    expect(releaseWorkflow.match(/GENERIC_DIGITAL_GOODS_ENABLED must be exactly true or false/g)).toHaveLength(2);
    expect(releaseWorkflow.match(/"\$\{schema_feature_args\[@\]\}"/g)).toHaveLength(2);
  });
});
