"use strict";

/**
 * Decides whether a release run may deploy production.
 *
 * Deferring to a newer run is correct only if that newer run can actually ship.
 * When merges arrive faster than the release lane runs (~25 min — the community
 * schema gate alone is ~18), every run finds itself behind main's tip and defers
 * to a successor that will also defer, so production stalls while every run
 * reports success (#729).
 *
 * This keeps the deferral but requires it to name a live successor, and is
 * fail-closed everywhere: any question it cannot answer positively yields
 * `stale=true`, which is exactly the previous behaviour. It can therefore only
 * ever *add* a deploy that would not otherwise happen, and only once it has
 * proven both:
 *
 *   1. no other release run is still alive that could deploy, and
 *   2. this SHA strictly descends from what production already serves, so an
 *      older validated run can never move production backwards.
 *
 * Lives in a file rather than inline in the workflow so it can be unit tested —
 * this is the production deploy gate, and its failure mode is silent.
 */
module.exports = async function productionFreshness({ github, context, core }) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const defer = (message) => {
    core.setOutput("stale", "true");
    core.warning(`Skipping production deploy: ${message}`);
  };

  const { data: ref } = await github.rest.git.getRef({ owner, repo, ref: "heads/main" });
  const tip = ref.object.sha;
  if (tip === context.sha) {
    core.setOutput("stale", "false");
    core.notice(`Run SHA ${context.sha} is the current main tip; proceeding to production.`);
    return;
  }

  // `ahead` means tip contains this SHA plus further commits. Anything else
  // (diverged, behind, unreachable) means main was rewritten under this run, so
  // it no longer describes main and must not deploy.
  const ancestry = await github.rest.repos.compareCommitsWithBasehead({
    owner,
    repo,
    basehead: `${context.sha}...${tip}`,
  }).catch(() => null);
  if (ancestry?.data?.status !== "ahead") {
    defer(
      `main has advanced to ${tip} and this run's ${context.sha} is not one of its ancestors `
      + `(status: ${ancestry?.data?.status ?? "unknown"}).`,
    );
    return;
  }

  // A successor is any release run for a different SHA that can still reach this
  // lane. If one exists it deploys and this run stands down — the original,
  // correct behaviour.
  const live = await github.rest.actions.listWorkflowRuns({
    owner,
    repo,
    workflow_id: "release.yml",
    branch: "main",
    per_page: 50,
  }).then((response) => response.data.workflow_runs.filter((run) => (
    run.head_sha !== context.sha
    && run.run_number > context.runNumber
    && run.status !== "completed"
  ))).catch(() => null);
  if (live === null) {
    defer(`main has advanced to ${tip} and the release runs could not be listed to find a live successor.`);
    return;
  }
  if (live.length > 0) {
    const names = live.map((run) => `${run.head_sha.slice(0, 7)} (run ${run.run_number})`).join(", ");
    defer(`main has advanced to ${tip}; live successor run(s) will deploy instead: ${names}.`);
    return;
  }

  // Nothing else is coming. This run passed every gate, so it may deploy —
  // provided that moves production forward.
  const deployments = await github.rest.repos.listDeployments({
    owner,
    repo,
    environment: "production",
    per_page: 20,
  }).then((response) => response.data).catch(() => null);
  if (deployments === null) {
    defer(`main has advanced to ${tip}, no live successor was found, but production deployments could not be read.`);
    return;
  }

  let deployed = null;
  for (const deployment of deployments) {
    const statuses = await github.rest.repos.listDeploymentStatuses({
      owner,
      repo,
      deployment_id: deployment.id,
      per_page: 10,
    }).then((response) => response.data).catch(() => null);
    if (statuses === null) {
      defer(
        `main has advanced to ${tip}, no live successor was found, but deployment ${deployment.id} `
        + "statuses could not be read.",
      );
      return;
    }
    if (statuses.some((status) => status.state === "success")) {
      deployed = deployment.sha;
      break;
    }
  }
  if (!deployed) {
    defer(
      `main has advanced to ${tip}, no live successor was found, but no successful production `
      + "deployment could be identified to compare against.",
    );
    return;
  }
  if (deployed === context.sha) {
    defer(`production already serves ${context.sha}.`);
    return;
  }

  const forward = await github.rest.repos.compareCommitsWithBasehead({
    owner,
    repo,
    basehead: `${deployed}...${context.sha}`,
  }).catch(() => null);
  if (forward?.data?.status !== "ahead") {
    defer(
      `deploying ${context.sha} would not move production forward from ${deployed} `
      + `(status: ${forward?.data?.status ?? "unknown"}).`,
    );
    return;
  }

  core.setOutput("stale", "false");
  core.notice(
    `main has advanced to ${tip}, but no live release run remains to deploy it. `
    + `This run's ${context.sha} passed every gate and is ahead of the deployed ${deployed}; `
    + "proceeding to production.",
  );
};
