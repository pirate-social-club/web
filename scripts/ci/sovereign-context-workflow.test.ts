import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

const release = parse(readFileSync(".github/workflows/release.yml", "utf8"));
const observer = parse(readFileSync(".github/workflows/prod-version-gap.yml", "utf8"));
const probe = readFileSync("scripts/ci/probe-sovereign-context.sh", "utf8");

describe("sovereign production context workflow", () => {
  test("runs after the production deploy checks", () => {
    const steps = release.jobs.production.steps;
    const probeIndex = steps.findIndex((step: { name?: string }) => (
      step.name === "Verify sovereign HNS production context"
    ));
    const deployIndex = steps.findIndex((step: { name?: string }) => step.name === "Deploy production");
    const multipartIndex = steps.findIndex((step: { name?: string }) => (
      step.name === "Verify production multipart storage"
    ));

    expect(probeIndex).toBeGreaterThan(deployIndex);
    expect(probeIndex).toBeGreaterThan(multipartIndex);
    expect(steps[probeIndex].run).toContain("probe-sovereign-context.sh");
  });

  test("keeps an event-driven and scheduled external observer", () => {
    expect(observer.on.workflow_run.workflows).toContain("Release");
    expect(observer.on.schedule).toBeTruthy();

    const job = observer.jobs["sovereign-context"];
    expect(job).toBeTruthy();
    expect(job.permissions.issues).toBe("write");
    expect(job.steps.some((step: { name?: string }) => (
      step.name === "Probe the sovereign apex and app origin"
    ))).toBe(true);
    expect(job.steps.some((step: { name?: string }) => (
      step.name === "Reflect sovereign-context failure"
    ))).toBe(true);
  });

  test("makes namespace inventory failures distinguishable from empty data", () => {
    expect(probe).toContain('namespace_endpoint="https://api.pirate.sc/public-namespaces"');
    expect(probe).not.toContain("https://api.pirate.sc/public-namespaces/");
    expect(probe).toContain("--write-out '%{http_code}'");
    expect(probe).toContain("public namespace inventory request failed: status=");
    expect(probe).toContain("public namespace inventory is empty: status=");
  });
});
