import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

// Merging a pin to main IS the production deploy — there is no separate promote
// step. If the push trigger is ever dropped from release.yml, merges keep going
// green while nothing ships, and the gap is invisible until someone checks
// /__version by hand.
//
// This asserts the trigger is present in the file. It deliberately cannot
// detect the workflow being DISABLED in the GitHub UI, which is repository
// state rather than repository content and is what actually happened on
// 2026-08-03 — that needs the production version-gap monitor, not a unit test.
describe("release workflow triggers", () => {
  const source = readFileSync(new URL("../.github/workflows/release.yml", import.meta.url), "utf8");
  const triggerBlock = source.slice(0, source.indexOf("\njobs:"));

  test("release.yml still deploys on push to main", () => {
    expect(triggerBlock).toContain("push:");

    const pushSection = triggerBlock.slice(triggerBlock.indexOf("push:"));
    const nextTrigger = pushSection.search(/\n {2}\w[\w_]*:/);
    const pushTrigger = nextTrigger === -1 ? pushSection : pushSection.slice(0, nextTrigger);

    expect(pushTrigger).toContain("branches:");
    expect(pushTrigger).toMatch(/-\s+main\b/);
  });

  test("the push trigger is not narrowed by a paths filter", () => {
    // A paths/paths-ignore filter on push would silently skip releases for pin
    // bumps that touch files outside the list.
    const pushSection = triggerBlock.slice(triggerBlock.indexOf("push:"));
    const nextTrigger = pushSection.search(/\n {2}\w[\w_]*:/);
    const pushTrigger = nextTrigger === -1 ? pushSection : pushSection.slice(0, nextTrigger);

    expect(pushTrigger).not.toContain("paths:");
    expect(pushTrigger).not.toContain("paths-ignore:");
  });

  test("the focused gate-builder check is opt-in on both SHA inputs", () => {
    const start = source.indexOf("gate-builder-staging-verification:");
    const end = source.indexOf("\n  release-gate:", start);
    const gateBuilder = source.slice(start, end);

    expect(gateBuilder).toMatch(/github\.event_name == 'workflow_dispatch'/u);
    expect(gateBuilder).toMatch(/&& inputs\.expected_staging_web_sha\s*\n\s*&& inputs\.expected_staging_api_sha/u);
  });

  test("preserves raw version responses from staging and production smoke", () => {
    expect(source).toContain("SMOKE_EVIDENCE_FILE: ${{ github.workspace }}/smoke-evidence-staging.jsonl");
    expect(source).toContain("name: smoke-evidence-staging-${{ github.run_id }}-${{ github.run_attempt }}");
    expect(source).toContain("SMOKE_EVIDENCE_FILE: ${{ github.workspace }}/smoke-evidence-production.jsonl");
    expect(source).toContain("name: smoke-evidence-production-${{ github.run_id }}-${{ github.run_attempt }}");
  });
});
