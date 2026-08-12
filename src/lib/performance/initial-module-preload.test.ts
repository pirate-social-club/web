import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  OPTIONAL_INITIAL_PRELOAD_CHUNKS,
  resolveInitialModulePreloadDependencies,
} from "./initial-module-preload";

describe("resolveInitialModulePreloadDependencies", () => {
  test("keeps critical dependencies and excludes optional interaction chunks", () => {
    const optional = OPTIONAL_INITIAL_PRELOAD_CHUNKS.map(({ token }) => `assets/${token}hash.js`);
    expect(resolveInitialModulePreloadDependencies([
      "assets/client-hash.js",
      "assets/app-hash.js",
      ...optional,
    ])).toEqual([
      "assets/client-hash.js",
      "assets/app-hash.js",
    ]);
  });

  test("keeps every exclusion tied to an existing source module", () => {
    for (const { source } of OPTIONAL_INITIAL_PRELOAD_CHUNKS) {
      expect(existsSync(join(import.meta.dir, "../../..", source))).toBe(true);
    }
  });
});
