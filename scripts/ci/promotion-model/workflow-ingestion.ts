import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { classifyJob } from "./ingestion.mjs";
import { findJob, GATE_POLICY_VERSION, REQUIRED_GATES } from "./gate-policy.mjs";
import { PromotionShadowStore } from "./postgres-store";

export type ObservedWorkflowRun = {
  id: number;
  run_attempt: number;
  event: string;
  head_branch: string;
  head_sha: string;
  conclusion: string | null;
  html_url?: string;
  updated_at: string;
};

export type ObservedJob = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
};

type Store = Pick<
  PromotionShadowStore,
  "mintCandidate" | "recordTerminalAttempt" | "recordObservation"
>;

export const SHADOW_SCHEMA_VERSION = 1;

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function evidenceId(
  kind: "delivery" | "attempt" | "observation",
  input: { candidateId: string; gateId: string; runId: string; runAttempt: number },
): string {
  return `${kind}_${digest([input.candidateId, input.gateId, input.runId, input.runAttempt]).slice(0, 32)}`;
}

export function buildShadowCandidate(input: {
  run: ObservedWorkflowRun;
  apiSha: string;
  coreSha: string;
}) {
  const manifest = {
    shadow_schema_version: SHADOW_SCHEMA_VERSION,
    gate_policy_version: GATE_POLICY_VERSION,
    web_sha: input.run.head_sha,
    api_sha: input.apiSha,
    core_sha: input.coreSha,
  };
  return {
    candidateId: `shc_${digest(manifest)}`,
    webSha: input.run.head_sha,
    apiSha: input.apiSha,
    coreSha: input.coreSha,
    manifest,
  };
}

export async function ingestCompletedRelease(input: {
  run: ObservedWorkflowRun;
  jobs: ObservedJob[];
  apiSha: string;
  coreSha: string;
  store: Store;
}) {
  if (input.run.event !== "push" || input.run.head_branch !== "main") {
    throw new Error(
      `refusing non-main push release: event=${input.run.event} branch=${input.run.head_branch}`,
    );
  }
  if (!input.run.head_sha || !Number.isInteger(input.run.run_attempt) || input.run.run_attempt < 1) {
    throw new Error("workflow run is missing an immutable SHA or valid run attempt");
  }

  const candidate = buildShadowCandidate(input);
  await input.store.mintCandidate(candidate);

  const report = {
    candidateId: candidate.candidateId,
    runId: String(input.run.id),
    runAttempt: input.run.run_attempt,
    attempts: 0,
    observations: 0,
    duplicates: 0,
  };
  for (const gate of REQUIRED_GATES) {
    const job = findJob(input.jobs, gate.jobName) as ObservedJob | null;
    const classified = classifyJob(job);
    const identity = {
      candidateId: candidate.candidateId,
      gateId: gate.id,
      gateVersion: gate.version,
      sourceRunId: String(input.run.id),
      sourceRunAttempt: input.run.run_attempt,
    };
    const deliveryIdentity = {
      candidateId: candidate.candidateId,
      gateId: gate.id,
      runId: String(input.run.id),
      runAttempt: input.run.run_attempt,
    };
    if (classified.kind === "observation") {
      const result = await input.store.recordObservation({
        ...identity,
        deliveryId: evidenceId("delivery", deliveryIdentity),
        observationId: evidenceId("observation", deliveryIdentity),
        observation: classified.observation,
      });
      if (result === "duplicate") report.duplicates += 1;
      else report.observations += 1;
      continue;
    }

    const completedAt = new Date(job?.completed_at ?? input.run.updated_at);
    const startedAt = new Date(job?.started_at ?? job?.completed_at ?? input.run.updated_at);
    if (
      Number.isNaN(startedAt.valueOf())
      || Number.isNaN(completedAt.valueOf())
      || completedAt < startedAt
    ) {
      throw new Error(`gate ${gate.id} has an invalid observed time range`);
    }
    const result = await input.store.recordTerminalAttempt({
      ...identity,
      deliveryId: evidenceId("delivery", deliveryIdentity),
      attemptId: evidenceId("attempt", deliveryIdentity),
      result: classified.result,
      startedAt,
      completedAt,
    });
    if (result.kind === "duplicate") report.duplicates += 1;
    else report.attempts += 1;
  }
  return report;
}

async function fetchAttemptJobs(input: {
  repository: string;
  token: string;
  runId: number;
  runAttempt: number;
}): Promise<ObservedJob[]> {
  const jobs: ObservedJob[] = [];
  for (let page = 1; ; page += 1) {
    const response = await fetch(
      `https://api.github.com/repos/${input.repository}/actions/runs/${input.runId}`
        + `/attempts/${input.runAttempt}/jobs?per_page=100&page=${page}`,
      {
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${input.token}`,
          "x-github-api-version": "2022-11-28",
          "user-agent": "promotion-shadow-ingestion",
        },
      },
    );
    if (!response.ok) {
      throw new Error(`GitHub jobs API returned ${response.status}: ${await response.text()}`);
    }
    const payload = await response.json() as { jobs?: ObservedJob[] };
    const pageJobs = payload.jobs ?? [];
    jobs.push(...pageJobs);
    if (pageJobs.length < 100) break;
  }
  return jobs;
}

async function main(): Promise<void> {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const databaseUrl = process.env.PROMOTION_SHADOW_DATABASE_URL;
  if (!eventPath || !repository || !token || !databaseUrl) {
    throw new Error(
      "GITHUB_EVENT_PATH, GITHUB_REPOSITORY, GITHUB_TOKEN, and "
      + "PROMOTION_SHADOW_DATABASE_URL are required",
    );
  }
  const event = JSON.parse(await readFile(eventPath, "utf8")) as {
    workflow_run?: ObservedWorkflowRun;
  };
  const run = event.workflow_run;
  if (!run) throw new Error("event payload has no workflow_run");

  const [apiSha, coreSha, jobs] = await Promise.all([
    readFile(".github/release-refs/api.sha", "utf8").then((value) => value.trim()),
    readFile(".github/release-refs/core.sha", "utf8").then((value) => value.trim()),
    fetchAttemptJobs({
      repository,
      token,
      runId: run.id,
      runAttempt: run.run_attempt,
    }),
  ]);
  if (!apiSha || !coreSha) throw new Error("release refs must not be empty");

  const store = new PromotionShadowStore(databaseUrl);
  try {
    const report = await ingestCompletedRelease({ run, jobs, apiSha, coreSha, store });
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await store.close();
  }
}

if (import.meta.main) {
  await main();
}
