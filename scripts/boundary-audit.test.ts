import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  checkNoProductionFixtureImports,
  isTestOrStoryFile,
} from "./boundary-audit.mjs";

const temporaryRoots: string[] = [];

function createSourceRoot(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "boundary-audit-"));
  temporaryRoots.push(root);
  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents);
  }
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("production fixture import boundary", () => {
  test("rejects value and type imports from fixtures in production modules", () => {
    const root = createSourceRoot({
      "app/value.ts": 'import { helper } from "@/domain/fixtures/helper";\nvoid helper;\n',
      "app/types.ts": 'import type { Example } from "../fixtures/types";\nexport type Alias = Example;\n',
      "app/side-effect.ts": 'import "../fixtures/setup";\n',
      "app/dynamic.ts": 'export const load = () => import("../fixtures/lazy");\n',
      "app/clean.ts": 'import { helper } from "@/domain/helper";\nvoid helper;\n',
    });

    const result = checkNoProductionFixtureImports(root);

    expect(result.passed).toBe(false);
    expect(result.details).toEqual([
      "app/dynamic.ts -> ../fixtures/lazy",
      "app/side-effect.ts -> ../fixtures/setup",
      "app/types.ts -> ../fixtures/types",
      "app/value.ts -> @/domain/fixtures/helper",
    ]);
  });

  test("allows fixture imports from tests and stories", () => {
    const root = createSourceRoot({
      "app/example.test.ts": 'import { fixture } from "./fixtures/example";\nvoid fixture;\n',
      "app/example.stories.tsx": 'import { fixture } from "./fixtures/example";\nvoid fixture;\n',
      "app/__tests__/helper.ts": 'import { fixture } from "../fixtures/example";\nvoid fixture;\n',
    });

    expect(checkNoProductionFixtureImports(root)).toMatchObject({
      passed: true,
      details: [],
    });
  });
});

describe("test and story classification", () => {
  test("does not exempt production files merely containing test-like words", () => {
    expect(isTestOrStoryFile("src/app/contest-route.tsx")).toBe(false);
    expect(isTestOrStoryFile("src/app/storytelling-route.tsx")).toBe(false);
    expect(isTestOrStoryFile("src/app/route.spec.tsx")).toBe(true);
  });
});
