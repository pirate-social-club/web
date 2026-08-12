import { describe, expect, test } from "bun:test";

import {
  DEFAULT_FRONTEND_FILE_LIMIT,
  countLines,
  findSizeViolations,
  shouldAuditFrontendFile,
} from "./check-frontend-size-ratchet.mjs";

describe("frontend size ratchet", () => {
  test("counts files with and without a trailing newline", () => {
    expect(countLines("one\ntwo\n")).toBe(2);
    expect(countLines("one\ntwo")).toBe(2);
    expect(countLines("")).toBe(0);
  });

  test("audits production TypeScript while excluding non-production sources", () => {
    expect(shouldAuditFrontendFile("src/app/example.tsx")).toBe(true);
    expect(shouldAuditFrontendFile("src/app/example.test.tsx")).toBe(false);
    expect(shouldAuditFrontendFile("src/app/example.spec.ts")).toBe(false);
    expect(shouldAuditFrontendFile("src/app/stories/example.stories.tsx")).toBe(false);
    expect(shouldAuditFrontendFile("src/app/generated/example.ts")).toBe(false);
    expect(shouldAuditFrontendFile("src/app/vendor/example.ts")).toBe(false);
    expect(shouldAuditFrontendFile("src/app/example.config.ts")).toBe(false);
    expect(shouldAuditFrontendFile("src/app/example.d.ts")).toBe(false);
  });

  test("uses exact debt ceilings and a stricter default for unlisted files", () => {
    const limits = new Map([["src/app/existing-debt.tsx", 750]]);
    const violations = findSizeViolations([
      { file: "src/app/existing-debt.tsx", lines: 750 },
      { file: "src/app/new-small-file.tsx", lines: DEFAULT_FRONTEND_FILE_LIMIT },
      { file: "src/app/new-oversized-file.tsx", lines: DEFAULT_FRONTEND_FILE_LIMIT + 1 },
    ], limits);

    expect(violations).toEqual([{
      file: "src/app/new-oversized-file.tsx",
      limit: DEFAULT_FRONTEND_FILE_LIMIT,
      lines: DEFAULT_FRONTEND_FILE_LIMIT + 1,
    }]);
  });

  test("rejects growth above an existing debt ceiling", () => {
    const limits = new Map([["src/app/existing-debt.tsx", 750]]);
    expect(findSizeViolations([
      { file: "src/app/existing-debt.tsx", lines: 751 },
    ], limits)).toEqual([{
      file: "src/app/existing-debt.tsx",
      limit: 750,
      lines: 751,
    }]);
  });
});
