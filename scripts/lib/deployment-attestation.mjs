import { createHash } from "node:crypto";

const REQUIRED_FIELDS = ["service", "environment", "git_sha", "git_ref", "build_timestamp"];
const ATTESTATION_FIELDS = ["release_id", "build_id", "web_sha", "api_sha", "core_sha"];
const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const HOTFIX_REASON_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PLACEHOLDERS = new Set(["null", "placeholder", "string", "unknown", "undefined"]);

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
  return typeof value === "string" && FULL_SHA_PATTERN.test(value)
    ? { sha: value, suffix: null }
    : null;
}

export function versionShasMatch(expected, actual) {
  const expectedVersion = parseVersionSha(expected);
  const actualVersion = parseVersionSha(actual);
  if (!expectedVersion || !actualVersion) return false;
  return expectedVersion.sha === actualVersion.sha;
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

function isPlaceholder(value) {
  return typeof value === "string" && PLACEHOLDERS.has(value.trim().toLowerCase());
}

function expectedReleaseId(body) {
  return createHash("sha256")
    .update(JSON.stringify({
      apiSha: field(body, "api_sha"),
      coreSha: field(body, "core_sha"),
      webSha: field(body, "web_sha"),
    }))
    .digest("hex");
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
    } else if (isPlaceholder(value)) {
      failures.push(`${name} is a placeholder`);
    }
  }
  for (const name of ATTESTATION_FIELDS) {
    const value = field(body, name);
    if (typeof value !== "string" || value.length === 0) {
      failures.push(`${name} is missing`);
    } else if (isPlaceholder(value)) {
      failures.push(`${name} is a placeholder`);
    }
  }

  const service = field(body, "service");
  const environment = field(body, "environment");
  const gitSha = field(body, "git_sha");
  const operatorSha = nestedField(body, "operator.git_sha");
  const sourceState = field(body, "source_state");
  const hotfix = field(body, "hotfix");

  if (expected.service && service !== expected.service) {
    failures.push(`expected service=${expected.service}, got ${display(service)}`);
  }
  if (expected.environment && environment !== expected.environment) {
    failures.push(`expected environment=${expected.environment}, got ${display(environment)}`);
  }
  if (gitSha && !parseVersionSha(gitSha)) {
    failures.push(`git_sha is malformed: ${display(gitSha)}`);
  }
  if (field(body, "build_timestamp") && !Number.isFinite(Date.parse(field(body, "build_timestamp")))) {
    failures.push(`build_timestamp is malformed: ${display(field(body, "build_timestamp"))}`);
  }
  if (field(body, "release_id") && !DIGEST_PATTERN.test(field(body, "release_id"))) {
    failures.push(`release_id is malformed: ${display(field(body, "release_id"))}`);
  }
  for (const name of ["web_sha", "api_sha", "core_sha"]) {
    const value = field(body, name);
    if (value && !FULL_SHA_PATTERN.test(value)) {
      failures.push(`${name} is malformed: ${display(value)}`);
    }
  }
  if (
    DIGEST_PATTERN.test(field(body, "release_id"))
    && ["web_sha", "api_sha", "core_sha"].every((name) => FULL_SHA_PATTERN.test(field(body, name)))
    && field(body, "release_id") !== expectedReleaseId(body)
  ) {
    failures.push("release_id does not match the attested release triple");
  }
  if (sourceState !== "clean" && sourceState !== "dirty") {
    failures.push(sourceState == null || sourceState === ""
      ? "source_state is missing"
      : `source_state is malformed: ${display(sourceState)}`);
  }
  if (!("hotfix" in body)) {
    failures.push("hotfix is missing");
  } else if (sourceState === "clean" && hotfix !== null) {
    failures.push("clean source_state requires hotfix=null");
  } else if (sourceState === "dirty") {
    if (!hotfix || typeof hotfix !== "object" || Array.isArray(hotfix)) {
      failures.push("dirty source_state requires hotfix metadata");
    } else {
      const reasonSlug = field(hotfix, "reason_slug");
      const patchSha256 = field(hotfix, "patch_sha256");
      if (typeof reasonSlug !== "string" || !HOTFIX_REASON_PATTERN.test(reasonSlug) || isPlaceholder(reasonSlug)) {
        failures.push(`hotfix.reason_slug is malformed: ${display(reasonSlug)}`);
      }
      if (typeof patchSha256 !== "string" || !DIGEST_PATTERN.test(patchSha256)) {
        failures.push(`hotfix.patch_sha256 is malformed: ${display(patchSha256)}`);
      }
    }
  }
  const ownAttestedSha = service === "web"
    ? field(body, "web_sha")
    : service === "api"
      ? field(body, "api_sha")
      : null;
  if (ownAttestedSha && !versionShasMatch(ownAttestedSha, gitSha)) {
    failures.push(`git_sha=${display(gitSha)} does not match ${service}_sha=${display(ownAttestedSha)}`);
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
      releaseId: field(body, "release_id"),
      buildId: field(body, "build_id"),
      webSha: field(body, "web_sha"),
      apiSha: field(body, "api_sha"),
      coreSha: field(body, "core_sha"),
      sourceState,
      hotfix,
    },
  };
}

export function validateMatchingReleaseAttestations(entries) {
  if (entries.length < 2) return [];
  const failures = [];
  const [first, ...rest] = entries;
  for (const entry of rest) {
    for (const name of ATTESTATION_FIELDS) {
      const expected = field(first.body, name);
      const actual = field(entry.body, name);
      if (expected !== actual) {
        failures.push(`${entry.label} ${name}=${display(actual)} does not match ${first.label} ${name}=${display(expected)}`);
      }
    }
  }
  return failures;
}
