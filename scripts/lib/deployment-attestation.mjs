const VERSION_SHA_PATTERN = /^([0-9a-f]{7,40})(?:$|-)/i;
const REQUIRED_FIELDS = ["service", "environment", "git_sha", "git_ref", "build_timestamp"];

export function field(body, name) {
  return body && typeof body === "object" && name in body ? body[name] : null;
}

export function nestedField(body, path) {
  return path.split(".").reduce((current, part) => {
    if (!current || typeof current !== "object") return null;
    return part in current ? current[part] : null;
  }, body);
}

export function parseVersionSha(value) {
  if (typeof value !== "string") return null;
  const match = value.match(VERSION_SHA_PATTERN);
  if (!match) return null;
  return { sha: match[1], suffix: value.slice(match[1].length) || null };
}

export function versionShasMatch(expected, actual) {
  const expectedVersion = parseVersionSha(expected);
  const actualVersion = parseVersionSha(actual);
  if (!expectedVersion || !actualVersion) return false;
  if (expectedVersion.sha === actualVersion.sha) return true;
  return expectedVersion.sha.startsWith(actualVersion.sha)
    || actualVersion.sha.startsWith(expectedVersion.sha);
}

export function targetIdentityFromUrl(value) {
  const hostname = new URL(value).hostname;
  if (hostname === "pirate.sc") return { service: "web", environment: "production" };
  if (hostname === "api.pirate.sc") return { service: "api", environment: "production" };
  if (hostname === "staging.pirate.sc") return { service: "web", environment: "staging" };
  if (hostname === "api-staging.pirate.sc") return { service: "api", environment: "staging" };
  return {};
}

function display(value) {
  return value == null || value === "" ? "-" : String(value);
}

export function validateVersionPayload(body, expected = {}) {
  const failures = [];
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { failures: ["version payload must be a JSON object"], metadata: null };
  }

  for (const name of REQUIRED_FIELDS) {
    const value = field(body, name);
    if (typeof value !== "string" || value.length === 0) {
      failures.push(`${name} is missing`);
    }
  }

  const service = field(body, "service");
  const environment = field(body, "environment");
  const gitSha = field(body, "git_sha");
  const operatorSha = nestedField(body, "operator.git_sha");

  if (expected.service && service !== expected.service) {
    failures.push(`expected service=${expected.service}, got ${display(service)}`);
  }
  if (expected.environment && environment !== expected.environment) {
    failures.push(`expected environment=${expected.environment}, got ${display(environment)}`);
  }
  if (gitSha && !parseVersionSha(gitSha)) {
    failures.push(`git_sha is malformed: ${display(gitSha)}`);
  }
  if (expected.gitSha && !versionShasMatch(expected.gitSha, gitSha)) {
    failures.push(`expected git_sha=${expected.gitSha}, got ${display(gitSha)}`);
  }
  if (expected.operatorGitSha && !versionShasMatch(expected.operatorGitSha, operatorSha)) {
    failures.push(`expected operator git_sha=${expected.operatorGitSha}, got ${display(operatorSha)}`);
  }

  return {
    failures,
    metadata: {
      service,
      environment,
      gitSha,
      gitRef: field(body, "git_ref"),
      buildTimestamp: field(body, "build_timestamp"),
      operatorGitSha: operatorSha,
    },
  };
}
