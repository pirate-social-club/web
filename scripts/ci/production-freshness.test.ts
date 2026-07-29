import { describe, expect, test } from "bun:test";

// Required, not imported: the workflow loads this same CommonJS module through
// actions/github-script, so the test exercises the exact entry point.
const productionFreshness = require("./production-freshness.cjs") as (input: {
  github: unknown;
  context: unknown;
  core: unknown;
}) => Promise<void>;

const OURS = "a".repeat(40);
const TIP = "b".repeat(40);
const DEPLOYED = "c".repeat(40);

type Scenario = {
  ancestry?: string;
  deployments?: Array<{ id: number; sha: string }>;
  deploymentsThrow?: boolean;
  forward?: string;
  runs?: Array<{ head_sha: string; run_number: number; status: string }>;
  runsThrow?: boolean;
  statuses?: Array<{ state: string }>;
  statusesThrow?: boolean;
  tip?: string;
};

async function decide(scenario: Scenario) {
  const {
    ancestry = "ahead",
    deployments = [{ id: 1, sha: DEPLOYED }],
    deploymentsThrow = false,
    forward = "ahead",
    runs = [],
    runsThrow = false,
    statuses = [{ state: "success" }],
    statusesThrow = false,
    tip = TIP,
  } = scenario;

  const outputs: Record<string, string> = {};
  const warnings: string[] = [];
  const notices: string[] = [];

  await productionFreshness({
    context: { repo: { owner: "pirate-social-club", repo: "web" }, runNumber: 100, sha: OURS },
    core: {
      notice: (message: string) => notices.push(message),
      setOutput: (key: string, value: string) => { outputs[key] = value; },
      warning: (message: string) => warnings.push(message),
    },
    github: {
      rest: {
        actions: {
          listWorkflowRuns: async () => {
            if (runsThrow) throw new Error("actions api unavailable");
            return { data: { workflow_runs: runs } };
          },
        },
        git: { getRef: async () => ({ data: { object: { sha: tip } } }) },
        repos: {
          compareCommitsWithBasehead: async ({ basehead }: { basehead: string }) => ({
            // Two different comparisons share this stub: ours...tip proves
            // ancestry, deployed...ours proves forward motion.
            data: { status: basehead.startsWith(OURS) ? ancestry : forward },
          }),
          listDeployments: async () => {
            if (deploymentsThrow) throw new Error("deployments api unavailable");
            return { data: deployments };
          },
          listDeploymentStatuses: async () => {
            if (statusesThrow) throw new Error("statuses api unavailable");
            return { data: statuses };
          },
        },
      },
    },
  });

  return { notices, stale: outputs.stale, warnings };
}

describe("production freshness", () => {
  test("deploys when this run is the current main tip", async () => {
    expect((await decide({ tip: OURS })).stale).toBe("false");
  });

  test("defers to a live successor run for a newer commit", async () => {
    const result = await decide({
      runs: [{ head_sha: TIP, run_number: 101, status: "in_progress" }],
    });
    expect(result.stale).toBe("true");
    expect(result.warnings[0]).toContain("live successor");
  });

  // The bug this whole module exists for (#729): main advanced, but the run
  // that was supposed to deploy it has already finished without deploying.
  // Deferring here is what stalled production for ~95 minutes across nine green
  // runs.
  test("deploys when main advanced but no live run remains to ship it", async () => {
    const result = await decide({
      runs: [{ head_sha: TIP, run_number: 101, status: "completed" }],
    });
    expect(result.stale).toBe("false");
    expect(result.notices[0]).toContain("no live release run remains");
  });

  test("ignores this run's own entry when looking for a successor", async () => {
    expect((await decide({
      runs: [{ head_sha: OURS, run_number: 100, status: "in_progress" }],
    })).stale).toBe("false");
  });

  test("ignores older live runs, which cannot be the successor", async () => {
    expect((await decide({
      runs: [{ head_sha: DEPLOYED, run_number: 99, status: "in_progress" }],
    })).stale).toBe("false");
  });

  test("defers when main was rewritten and this commit is no longer an ancestor", async () => {
    const result = await decide({ ancestry: "diverged" });
    expect(result.stale).toBe("true");
    expect(result.warnings[0]).toContain("not one of its ancestors");
  });

  test("never moves production backwards", async () => {
    const result = await decide({ forward: "behind" });
    expect(result.stale).toBe("true");
    expect(result.warnings[0]).toContain("would not move production forward");
  });

  test("defers when production already serves this commit", async () => {
    expect((await decide({ deployments: [{ id: 1, sha: OURS }] })).stale).toBe("true");
  });

  // Every branch below is a question the gate could not answer. Each one must
  // fall back to the pre-existing behaviour rather than guess, because guessing
  // wrong here deploys twice or deploys backwards.
  describe("fails closed", () => {
    test("when the workflow runs cannot be listed", async () => {
      expect((await decide({ runsThrow: true })).stale).toBe("true");
    });

    test("when production deployments cannot be read", async () => {
      expect((await decide({ deploymentsThrow: true })).stale).toBe("true");
    });

    test("when deployment statuses cannot be read", async () => {
      expect((await decide({ statusesThrow: true })).stale).toBe("true");
    });

    test("when no successful production deployment can be identified", async () => {
      expect((await decide({ statuses: [{ state: "failure" }] })).stale).toBe("true");
    });
  });
});
