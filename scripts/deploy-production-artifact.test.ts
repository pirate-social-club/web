import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const deployScript = readFileSync(resolve(root, "scripts/deploy-production.sh"), "utf8");
const releaseWorkflow = readFileSync(resolve(root, ".github/workflows/release.yml"), "utf8");
const smokeScript = readFileSync(resolve(root, "scripts/smoke-test.sh"), "utf8");
const viteConfig = readFileSync(resolve(root, "vite.config.ts"), "utf8");
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
    expect(packageJson.scripts?.["build:prod"]).toContain("bun run build:service-worker");
    expect(packageJson.scripts?.["build:prod"]).toContain("bun run build:provenance:emit");
    expect(packageJson.scripts?.["build:prod"]).toContain("bun run build:asset-inventory");
    expect(packageJson.scripts?.["build:staging"]).toContain("bun run build:asset-inventory");
    expect(packageJson.scripts?.["build:staging"]).toContain("--minify oxc");
    expect(packageJson.scripts?.["build:prod"]).toContain("--minify oxc");
    expect(packageJson.scripts?.["build:staging"]).not.toContain("--minify false");
    expect(packageJson.scripts?.["build:prod"]).not.toContain("--minify false");
  });

  test("keeps browser-only SDKs out of the Worker and SSR module graphs", () => {
    expect(viteConfig).toContain('environment.name === "worker" || environment.name === "ssr"');
    expect(viteConfig).toContain('resolve(__dirname, "./src/lib/ssr/browser-sdk.ssr.tsx")');

    for (const moduleId of [
      "@selfxyz/qrcode",
      "@story-protocol/core-sdk",
      "@veryai/widget",
      "@vidstack/react",
      "@vidstack/react/player/layouts/default",
      "@zkpassport/sdk",
      "agora-rtc-sdk-ng",
    ]) {
      expect(viteConfig).toContain(`"${moduleId}"`);
    }
  });

  test("measures and durably uploads the production asset inventory without blocking deploy", () => {
    expect(releaseWorkflow).toContain("id: deploy-production");
    expect(releaseWorkflow).toContain("bun run scripts/asset-inventory.ts measure-edge");
    expect(releaseWorkflow).toContain("continue-on-error: true");
    expect(releaseWorkflow).toContain("name: asset-inventory-production-${{ github.run_id }}-${{ github.run_attempt }}");
    expect(releaseWorkflow).toContain("web/dist/asset-inventory.json");
    expect(releaseWorkflow).toContain("web/dist/client/.vite/manifest.json");
    expect(releaseWorkflow).toContain("retention-days: 90");
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

  test("records complete raw version responses before validating release metadata", () => {
    const recordIndex = smokeScript.indexOf("recordVersionEvidence(requestUrl, { body_raw: raw");
    const parseIndex = smokeScript.indexOf("body = raw ? JSON.parse(raw) : null");

    expect(recordIndex).toBeGreaterThan(0);
    expect(parseIndex).toBeGreaterThan(recordIndex);
    expect(smokeScript).toContain('requestUrl.pathname !== "/__version"');
    expect(smokeScript).not.toContain("body_raw: raw.slice");
  });
});
