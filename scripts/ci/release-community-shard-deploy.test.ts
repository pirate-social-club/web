import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const workflow = readFileSync(".github/workflows/release.yml", "utf8");

function deployCommand(stepName: string): string {
  const escaped = stepName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = workflow.match(new RegExp(`- name: ${escaped}[\\s\\S]*?\\n\\s+run: ([^\\n]+)`));
  expect(match).toBeTruthy();
  return match?.[1].trim() ?? "";
}

describe("community shard release environments", () => {
  test("deploys staging from the top-level Wrangler config", () => {
    expect(deployCommand("Deploy pinned staging community shard first")).toBe("bun run deploy");
  });

  test("deploys production from the named production environment", () => {
    expect(deployCommand("Deploy pinned production community shard first")).toBe(
      "bun run deploy -- --env production",
    );
  });
});
