const MIGRATION_ROOT = "db/community-template/migrations/";
const MIGRATION_PATTERN = /^\d{4}_.+\.sql$/u;

function strings(value, label) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || !entry.trim())) {
    throw new Error(`${label} must be an array of non-empty migration filenames.`);
  }
  return value.map((entry) => entry.trim());
}

/**
 * Validate the API-owned requirements manifest and return each migration's
 * single classification. A migration appearing in two classes is ambiguous and
 * therefore rejected rather than resolved by precedence.
 */
export function classifiedMigrations(requirements) {
  if (!requirements || typeof requirements !== "object" || Array.isArray(requirements)) {
    throw new Error("Community schema requirements must be a JSON object.");
  }

  const classifications = new Map();
  const add = (migration, classification) => {
    if (!MIGRATION_PATTERN.test(migration)) {
      throw new Error(`Invalid community migration filename in requirements: ${migration}`);
    }
    const prior = classifications.get(migration);
    if (prior) {
      throw new Error(
        `${migration} is classified more than once (${prior}, ${classification}). ` +
          "Each migration must have exactly one classification.",
      );
    }
    classifications.set(migration, classification);
  };

  for (const migration of strings(requirements.unconditional, "unconditional")) {
    add(migration, "unconditional");
  }

  const features = requirements.features ?? {};
  if (!features || typeof features !== "object" || Array.isArray(features)) {
    throw new Error("features must be an object keyed by feature name.");
  }
  for (const [feature, spec] of Object.entries(features)) {
    if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
      throw new Error(`features.${feature} must be an object.`);
    }
    for (const migration of strings(spec.migrations, `features.${feature}.migrations`)) {
      add(migration, `feature:${feature}`);
    }
  }

  const deferred = requirements.deferred ?? {};
  if (!deferred || typeof deferred !== "object" || Array.isArray(deferred)) {
    throw new Error("deferred must be an object keyed by migration filename.");
  }
  for (const [migration, spec] of Object.entries(deferred)) {
    const rationale = typeof spec === "string"
      ? spec.trim()
      : spec && typeof spec === "object" && !Array.isArray(spec)
        ? String(spec.rationale ?? spec.reason ?? "").trim()
        : "";
    if (!rationale) {
      throw new Error(`${migration} is deferred without a non-empty rationale.`);
    }
    add(migration, "deferred");
  }

  return classifications;
}

export function newlyAddedMigrations(previousFiles, nextFiles) {
  const previous = new Set(previousFiles);
  return [...new Set(nextFiles)].filter((name) => !previous.has(name)).sort();
}

export function unclassifiedMigrations(added, classifications) {
  return added.filter((migration) => !classifications.has(migration));
}

async function readRepositoryFile(github, { owner, repo, path, ref }) {
  let response;
  try {
    response = await github.rest.repos.getContent({ owner, repo, path, ref });
  } catch (error) {
    throw new Error(`Unable to read ${owner}/${repo}:${ref}:${path}: ${error.message}`);
  }
  if (Array.isArray(response.data) || response.data.type !== "file" || !response.data.content) {
    throw new Error(`${owner}/${repo}:${ref}:${path} is not a readable file.`);
  }
  return Buffer.from(response.data.content, response.data.encoding ?? "base64").toString("utf8");
}

async function communityMigrationsAt(github, { owner, repo, ref }) {
  let commit;
  try {
    commit = await github.rest.git.getCommit({ owner, repo, commit_sha: ref });
  } catch (error) {
    throw new Error(`Unable to resolve ${owner}/${repo} commit ${ref}: ${error.message}`);
  }
  let response;
  try {
    response = await github.rest.git.getTree({
      owner,
      repo,
      tree_sha: commit.data.tree.sha,
      recursive: "true",
    });
  } catch (error) {
    throw new Error(`Unable to enumerate ${owner}/${repo} at ${ref}: ${error.message}`);
  }
  if (response.data.truncated) {
    throw new Error(`Git tree for ${owner}/${repo}@${ref} was truncated; classification cannot fail open.`);
  }
  return response.data.tree
    .filter((entry) => entry.type === "blob" && entry.path?.startsWith(MIGRATION_ROOT))
    .map((entry) => entry.path.slice(MIGRATION_ROOT.length))
    .filter((name) => MIGRATION_PATTERN.test(name))
    .sort();
}

function previousWebSha(context) {
  if (context.eventName === "pull_request") return context.payload.pull_request?.base?.sha ?? null;
  if (context.eventName === "push") {
    const before = context.payload.before;
    return typeof before === "string" && !/^0+$/u.test(before) ? before : null;
  }
  return null;
}

/**
 * Cross-repository pin ratchet. The Web release is the only surface that sees
 * both the previous and proposed Core pins plus the pinned API manifest.
 */
export async function enforceCommunityMigrationClassification({
  github,
  context,
  actionsCore,
  owner,
  webRepo,
  apiRepo,
  coreRepo,
  apiSha,
  coreSha,
}) {
  const manifestPath = "services/api/community-schema-requirements.json";
  const manifestText = await readRepositoryFile(github, {
    owner,
    repo: apiRepo,
    path: manifestPath,
    ref: apiSha,
  });
  let requirements;
  try {
    requirements = JSON.parse(manifestText);
  } catch (error) {
    throw new Error(`Pinned API manifest ${manifestPath} is invalid JSON: ${error.message}`);
  }

  const classifications = classifiedMigrations(requirements);
  const nextFiles = await communityMigrationsAt(github, { owner, repo: coreRepo, ref: coreSha });
  const nextSet = new Set(nextFiles);
  const nonexistent = [...classifications.keys()].filter((migration) => !nextSet.has(migration));
  if (nonexistent.length > 0) {
    throw new Error(
      `Pinned API classifies migrations absent from pinned Core ${coreSha}: ${nonexistent.join(", ")}`,
    );
  }

  const previousSha = previousWebSha(context);
  if (!previousSha) {
    actionsCore.notice(
      `Validated ${classifications.size} community migration classifications. ` +
        `No previous Web SHA is available for ${context.eventName}; skipping pin-transition comparison.`,
    );
    return { added: [], skippedTransitionComparison: true };
  }

  const previousCoreSha = (
    await readRepositoryFile(github, {
      owner,
      repo: webRepo,
      path: ".github/release-refs/core.sha",
      ref: previousSha,
    })
  ).trim();
  if (!/^[0-9a-f]{40}$/u.test(previousCoreSha)) {
    throw new Error(`Previous Web commit ${previousSha} contains an invalid Core pin: ${previousCoreSha}`);
  }

  const previousFiles = await communityMigrationsAt(github, {
    owner,
    repo: coreRepo,
    ref: previousCoreSha,
  });
  const added = newlyAddedMigrations(previousFiles, nextFiles);
  const missing = unclassifiedMigrations(added, classifications);
  if (missing.length > 0) {
    throw new Error(
      `Core pin ${previousCoreSha} -> ${coreSha} introduces unclassified community migrations: ` +
        `${missing.join(", ")}. Classify each in the pinned API manifest as unconditional, ` +
        "feature-conditional, or deferred with a rationale.",
    );
  }

  if (added.length === 0) {
    actionsCore.notice(`Core pin ${previousCoreSha} -> ${coreSha} adds no community-template migrations.`);
  } else {
    actionsCore.notice(
      `Core pin ratchet passed: ${added.map((name) => `${name} (${classifications.get(name)})`).join(", ")}`,
    );
  }
  return { added, skippedTransitionComparison: false };
}
