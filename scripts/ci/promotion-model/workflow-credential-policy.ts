import { parse } from "yaml";

export const SHADOW_WORKFLOW_PATH = ".github/workflows/promotion-shadow-ingestion.yml";
export const ALLOWED_SECRETS = ["PROMOTION_SHADOW_DATABASE_URL"];

function visit(value: unknown, visitor: (key: string, value: unknown) => void): void {
  if (Array.isArray(value)) {
    for (const entry of value) visit(entry, visitor);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    visitor(key, entry);
    visit(entry, visitor);
  }
}

export function auditShadowWorkflow(source: string): string[] {
  const workflow = parse(source) as Record<string, any>;
  const violations: string[] = [];
  const trigger = workflow.on?.workflow_run;
  if (
    !trigger
    || JSON.stringify(trigger.workflows) !== JSON.stringify(["Release"])
    || JSON.stringify(trigger.types) !== JSON.stringify(["completed"])
    || Object.keys(workflow.on).length !== 1
  ) {
    violations.push("trigger must be only Release workflow_run:completed");
  }

  const permissions = workflow.permissions ?? {};
  if (
    JSON.stringify(Object.keys(permissions).sort()) !== JSON.stringify(["actions", "contents"])
    || permissions.actions !== "read"
    || permissions.contents !== "read"
  ) {
    violations.push("workflow permissions must be exactly actions:read and contents:read");
  }

  const jobs = workflow.jobs ?? {};
  if (JSON.stringify(Object.keys(jobs)) !== JSON.stringify(["ingest"])) {
    violations.push("workflow must contain only the ingest job");
  }
  const ingest = jobs.ingest ?? {};
  const condition = String(ingest.if ?? "").replace(/\s+/g, " ").trim();
  if (
    !condition.includes("github.event.workflow_run.event == 'push'")
    || !condition.includes("github.event.workflow_run.head_branch == 'main'")
  ) {
    violations.push("ingest job must filter to push releases on main");
  }

  const secretMatches = [...source.matchAll(
    /\bsecrets(?:\.([A-Za-z0-9_]+)|\[['"]([^'"]+)['"]\])/g,
  )];
  const secretNames = secretMatches
    .map((match) => match[1] ?? match[2])
    .filter((value): value is string => Boolean(value));
  if (
    secretMatches.length !== (source.match(/\bsecrets\b/g) ?? []).length
    ||
    JSON.stringify([...new Set(secretNames)].sort())
    !== JSON.stringify([...ALLOWED_SECRETS].sort())
  ) {
    violations.push(`secret references must equal ${ALLOWED_SECRETS.join(",")}`);
  }

  const uses: string[] = [];
  visit(workflow, (key, value) => {
    if (key === "uses" && typeof value === "string") uses.push(value);
    if (key === "environment") violations.push("environment attachment is forbidden");
    if (value === "write") violations.push("write permission is forbidden");
  });
  if (uses.length === 0 || uses.some((value) => !/@[0-9a-f]{40}$/.test(value))) {
    violations.push("every action must be pinned to a full commit SHA");
  }

  const steps = Array.isArray(ingest.steps) ? ingest.steps : [];
  const checkout = steps.find((step: any) => String(step?.uses ?? "").startsWith("actions/checkout@"));
  if (
    checkout?.with?.ref !== "${{ github.event.workflow_run.head_sha }}"
    || checkout?.with?.["persist-credentials"] !== false
  ) {
    violations.push("checkout must use the observed SHA with persisted credentials disabled");
  }
  const recording = steps.find((step: any) => step?.name === "Record shadow evidence");
  if (
    recording?.run !== "bun scripts/ci/promotion-model/workflow-ingestion.ts"
    || recording?.env?.GITHUB_TOKEN !== "${{ github.token }}"
    || recording?.env?.PROMOTION_SHADOW_DATABASE_URL
      !== "${{ secrets.PROMOTION_SHADOW_DATABASE_URL }}"
    || JSON.stringify(Object.keys(recording?.env ?? {}).sort())
      !== JSON.stringify(["GITHUB_TOKEN", "PROMOTION_SHADOW_DATABASE_URL"])
  ) {
    violations.push("recording step command and credential environment must match the allowlist");
  }
  return [...new Set(violations)];
}
