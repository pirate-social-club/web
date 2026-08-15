import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const requiredFlows = [
  "src/components/compositions/posts/post-composer/stories/file/flow.stories.tsx",
  "src/components/compositions/digital-goods/stories/file-access-flow.stories.tsx",
] as const;

describe("generic goods Storybook launch flows", () => {
  test("all required flows expose interaction coverage and stay local", async () => {
    for (const relativePath of requiredFlows) {
      const source = await readFile(resolve(process.cwd(), relativePath), "utf8");
      expect(source).toContain("Flow.play");
      expect(source).toContain("digital-goods");
      expect(source).not.toMatch(/fetch\s*\(|axios|walletClient|localStorage|sessionStorage/iu);
    }
  });
});
