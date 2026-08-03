export function findSuccessfulApiMainPush(checkSuites) {
  return checkSuites?.find((suite) =>
    suite.branch?.name === "main" &&
    suite.workflowRun?.workflow?.name === "api-ci" &&
    suite.workflowRun.event === "push" &&
    suite.conclusion === "SUCCESS"
  );
}
