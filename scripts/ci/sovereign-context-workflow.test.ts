import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

const release = parse(readFileSync(".github/workflows/release.yml", "utf8"));
const observer = parse(readFileSync(".github/workflows/prod-version-gap.yml", "utf8"));
const probe = readFileSync("scripts/ci/probe-sovereign-context.sh", "utf8");
const sovereignProbe = readFileSync("scripts/ci/probe-sovereign-context.sh", "utf8");

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
    expect(steps[probeIndex].env.HNS_PROBE_ALLOW_EMPTY_INVENTORY).toBe("true");
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
    const observerProbe = job.steps.find((step: { name?: string }) => (
      step.name === "Probe the sovereign apex and app origin"
    ));
    expect(observerProbe?.env?.HNS_PROBE_ALLOW_EMPTY_INVENTORY).toBeUndefined();
  });

  test("fetches the namespace inventory from the exact API route and checks HTTP status", () => {
    expect(sovereignProbe).toContain('"https://api.pirate.sc/public-namespaces")');
    expect(sovereignProbe).not.toContain('"https://api.pirate.sc/public-namespaces/")');
    expect(sovereignProbe).toContain("--write-out '%{http_code}'");
    expect(sovereignProbe).toContain('if [[ "$namespace_status" != "200" ]]');
  });

  test("checks all four reciprocal navigation edges for every activated root", () => {
    expect(sovereignProbe).toContain('"/c/${encoded_route_slug}/threads"');
    expect(sovereignProbe).toContain('"/c/${encoded_route_slug}/videos"');
    expect(sovereignProbe).toContain("--navigation-only");
    expect(sovereignProbe).toContain("--canonical-threads-html");
  });

  // `request_redirect_status` binds `$3` to a headers file. The script runs under
  // `set -u`, so a call site that omits it aborts the probe with "unbound variable"
  // instead of asserting anything — which silently disarms this security control
  // until someone reads the job's step detail.
  test("passes a headers file to every redirect probe call", () => {
    const invocations = [...sovereignProbe.matchAll(/request_redirect_status((?:\s+"[^"]*")+)/gu)];

    expect(invocations.length).toBeGreaterThanOrEqual(2);
    for (const [, args] of invocations) {
      expect(args.match(/"[^"]*"/gu)).toHaveLength(3);
    }
  });

  // Every mktemp'd file must be removed on exit; a probe that leaks temp files on
  // the 6-hour cron accumulates them on the runner.
  test("cleans up every temporary file it creates", () => {
    const created = [...sovereignProbe.matchAll(/^(\w+)="\$\(mktemp\)"$/gmu)].map(([, name]) => name);
    const trapLine = sovereignProbe.split("\n").find((line) => line.startsWith("trap "));

    expect(created.length).toBeGreaterThan(0);
    for (const name of created) {
      expect(trapLine).toContain(`"$${name}"`);
    }
  });

  test("fails when a sovereign redirect becomes cacheable", () => {
    expect(probe).toContain('root_apex_cache_control" != "no-store"');
    expect(probe).toContain('root_apex_cdn_cache_control" != "no-store"');
    expect(probe).toContain('-n "$root_apex_cache_tag"');
    expect(probe).toContain('root_apex_cf_cache_status');
    expect(probe).toContain('root_apex_cf_ray');
  });

  test("allows the final redirect probe to omit a headers output path", () => {
    expect(probe).toContain('local headers_file="${3:-/dev/null}"');
  });
});
