import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import { parse, stringify } from "yaml";
import {
  auditShadowWorkflow,
  SHADOW_WORKFLOW_PATH,
} from "./workflow-credential-policy";

describe("promotion shadow workflow credential policy", () => {
  test("audits the real workflow target, not a fixture", async () => {
    const source = await readFile(SHADOW_WORKFLOW_PATH, "utf8");
    expect(auditShadowWorkflow(source)).toEqual([]);
  });

  test("fails closed on an added secret, write permission, environment, or unpinned action", async () => {
    const source = await readFile(SHADOW_WORKFLOW_PATH, "utf8");
    const mutate = (change: (workflow: Record<string, any>) => void) => {
      const workflow = parse(source) as Record<string, any>;
      change(workflow);
      return stringify(workflow);
    };
    const cases = [
      mutate((workflow) => {
        workflow.jobs.ingest.steps.at(-1).env.EXTRA = "${{ secrets.PRODUCTION_TOKEN }}";
      }),
      mutate((workflow) => {
        workflow.permissions.contents = "write";
      }),
      mutate((workflow) => {
        workflow.jobs.ingest.environment = "production";
      }),
      mutate((workflow) => {
        workflow.jobs.ingest.permissions = { issues: "write" };
      }),
      mutate((workflow) => {
        workflow.jobs.ingest.steps.at(-1).env.EXTRA = "${{ secrets['productionToken'] }}";
      }),
      mutate((workflow) => {
        workflow.jobs.ingest.steps[0].uses = "actions/checkout@main";
      }),
    ];
    for (const sourceWithViolation of cases) {
      expect(auditShadowWorkflow(sourceWithViolation).length).toBeGreaterThan(0);
    }
  });

  test("fails when the real target broadens its trigger or loses the immutable checkout", async () => {
    const workflow = parse(await readFile(SHADOW_WORKFLOW_PATH, "utf8")) as Record<string, any>;
    workflow.on.workflow_dispatch = {};
    workflow.jobs.ingest.steps[0].with.ref = "main";
    expect(auditShadowWorkflow(stringify(workflow))).toContain(
      "trigger must be only Release workflow_run:completed",
    );
    expect(auditShadowWorkflow(stringify(workflow))).toContain(
      "checkout must use the observed SHA with persisted credentials disabled",
    );
  });
});
