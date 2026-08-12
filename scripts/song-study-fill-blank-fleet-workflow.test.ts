import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

const workflow = readFileSync(
  new URL("../.github/workflows/song-study-fill-blank-fleet-migration.yml", import.meta.url),
  "utf8",
);
const knip = readFileSync(new URL("../knip.jsonc", import.meta.url), "utf8");

describe("Song Study fill-blank fleet workflow", () => {
  test("keeps audit, canary, and fleet phases for staging and production", () => {
    for (const target of [
      "staging-audit",
      "staging-canary",
      "staging-fleet",
      "production-audit",
      "production-canary",
      "production-fleet",
    ]) {
      expect(workflow).toContain(`- ${target}`);
    }
  });

  test("requires full-fleet audit evidence before a canary write", () => {
    expect(workflow).toContain("AUDIT_RUN_ID");
    expect(workflow).toContain("EXPECTED_ATTEMPT_ROWS");
    expect(workflow).toContain("migration-output/canary-preflight.json");
    expect(workflow).toContain("actual_rows");
    expect(workflow).toContain("migration-output/canary-selection.json");
  });

  test("uses the pinned Core runner and preserves resumable write evidence", () => {
    expect(workflow).toContain(".github/release-refs/core.sha");
    expect(workflow).toContain("apply-song-study-fill-blank-d1-migration.ts");
    expect(workflow).toContain("--resume-file migration-output/resume.txt --confirm-time-travel --execute");
    expect(workflow).toContain("migration-output/verification-manifest.json");
    expect(workflow).toContain("migration-output/row-count-mismatches.json");
    expect(workflow).toContain("changed attempt/review row counts during rebuild");
    expect(workflow).toContain("retention-days: 30");
    expect(knip).toContain("core/scripts/community/apply-song-study-fill-blank-d1-migration.ts");
  });

  test("caps fleet concurrency at eight", () => {
    expect(workflow).toContain('default: "8"');
    expect(workflow).toContain('- "4"');
    expect(workflow).toContain('- "8"');
    expect(workflow).not.toContain('- "12"');
  });
});
