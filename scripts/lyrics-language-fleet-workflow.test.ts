import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

const workflow = readFileSync(
  new URL("../.github/workflows/lyrics-language-fleet-migration.yml", import.meta.url),
  "utf8",
);
const knip = readFileSync(new URL("../knip.jsonc", import.meta.url), "utf8");

describe("Lyrics language 1143 fleet workflow", () => {
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

  test("requires the reviewed migration and runner from the pinned Core checkout", () => {
    expect(workflow).toContain(".github/release-refs/core.sha");
    expect(workflow).toContain("1143_lyrics_language.sql");
    expect(workflow).toContain("apply-lyrics-language-d1-migration.ts");
    expect(knip).toContain("core/scripts/community/apply-lyrics-language-d1-migration.ts");
  });

  test("keeps writes resumable and verifies the final state read-only", () => {
    expect(workflow).toContain("--resume-file migration-output/resume.txt --confirm-time-travel --execute");
    expect(workflow).toContain("migration-output/verification-manifest.json");
    expect(workflow).toContain("retention-days: 30");
  });

  test("requires explicit environment-scoped confirmation", () => {
    expect(workflow).toContain('expected="$action 1143 TO $environment_name"');
    expect(workflow).toContain("Canary target requires an exact database name");
  });
});
