/**
 * Fail-closed alarm for sovereign HNS routing.
 *
 * The root-delegation freshness gate withholds routing when the parent
 * observation behind `hns_root_delegation_state.last_parent_observation_id`
 * goes stale. That is correct behaviour, but it is silent: every sovereign
 * origin serves the gateway's public-profile 404 while nothing goes red.
 * On 2026-08-13 a stale verifier credential froze the pointer and the
 * blackout lasted roughly five hours before a user found it by tapping an
 * avatar.
 *
 * This probe is the fail-closed counterpart to the forged-context negative
 * probe. It distinguishes the two failures deliberately, because they have
 * different causes and different responders:
 *
 *   - GLOBAL BLACKOUT — the registry is empty, so no root routes at all.
 *     Cause is upstream of any single root: observer down, credential stale,
 *     pointer frozen.
 *   - ROOT WITHHELD — the registry serves other roots but not this one.
 *     Cause is per-root: seed gap, activation never granted, hard deny.
 *
 * Collapsing them into one "sovereign routing is broken" alarm would send
 * every page down the wrong diagnostic path half the time.
 */

type FetchLike = typeof fetch;

type PublicNamespaceListing = {
  namespaces?: Array<{ root_label?: string }>;
};

type PublicNamespace = {
  root_label?: string;
};

export type SovereignRoutingHealthOptions = {
  apiBaseUrl: string;
  fetchImpl?: FetchLike;
  rootLabels: string[];
};

export type SovereignRoutingHealthResult = {
  checkedRoots: string[];
  listedRoots: string[];
};

/** Every root is dark. Do not report this as a per-root problem. */
export class SovereignRoutingBlackoutError extends Error {
  readonly kind = "global-blackout";

  constructor(message: string) {
    super(message);
    this.name = "SovereignRoutingBlackoutError";
  }
}

/** This root is dark while the registry still serves others. */
export class SovereignRootWithheldError extends Error {
  readonly kind = "root-withheld";
  readonly rootLabel: string;

  constructor(rootLabel: string, message: string) {
    super(message);
    this.name = "SovereignRootWithheldError";
    this.rootLabel = rootLabel;
  }
}

export function parseRootLabels(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((label) => label.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Read the whole registry first. A per-root 404 is ambiguous on its own —
 * during a blackout every root 404s — so the list is what separates the two
 * failure classes, and it must be read before any per-root conclusion.
 */
async function readListedRoots(
  fetchImpl: FetchLike,
  apiBaseUrl: string,
): Promise<string[]> {
  const listUrl = new URL("/public-namespaces", apiBaseUrl);
  const response = await fetchImpl(listUrl, {
    headers: { accept: "application/json" },
    method: "GET",
  });
  if (!response.ok) {
    throw new SovereignRoutingBlackoutError(
      `public namespace registry returned HTTP ${response.status}; sovereign routing cannot be confirmed`,
    );
  }

  const body = await response.json() as PublicNamespaceListing;
  const namespaces = Array.isArray(body.namespaces) ? body.namespaces : null;
  if (!namespaces) {
    throw new SovereignRoutingBlackoutError(
      "public namespace registry did not return a namespaces array",
    );
  }
  if (namespaces.length === 0) {
    throw new SovereignRoutingBlackoutError(
      "public namespace registry is EMPTY: every sovereign origin is dark. "
      + "Check the delegation-state pointer (hns_root_delegation_state."
      + "last_parent_observation_id) before looking at any single root.",
    );
  }

  return namespaces
    .map((entry) => (typeof entry.root_label === "string" ? entry.root_label.trim().toLowerCase() : ""))
    .filter(Boolean);
}

async function assertRootRoutes(
  fetchImpl: FetchLike,
  apiBaseUrl: string,
  rootLabel: string,
  listedRoots: string[],
): Promise<void> {
  if (!listedRoots.includes(rootLabel)) {
    throw new SovereignRootWithheldError(
      rootLabel,
      `root ${rootLabel} is absent from a non-empty public namespace registry; `
      + "routing is withheld for this root only (seed gap, activation, or hard deny)",
    );
  }

  const rootUrl = new URL(
    `/public-namespaces/${encodeURIComponent(rootLabel)}`,
    apiBaseUrl,
  );
  const response = await fetchImpl(rootUrl, {
    headers: { accept: "application/json" },
    method: "GET",
  });
  if (!response.ok) {
    throw new SovereignRootWithheldError(
      rootLabel,
      `root ${rootLabel} is listed but its lookup returned HTTP ${response.status}`,
    );
  }

  const body = await response.json() as PublicNamespace;
  const resolved = typeof body.root_label === "string" ? body.root_label.trim().toLowerCase() : "";
  if (resolved !== rootLabel) {
    throw new SovereignRootWithheldError(
      rootLabel,
      `root ${rootLabel} resolved to ${resolved || "an empty root_label"}`,
    );
  }
}

export async function verifySovereignRoutingHealth(
  options: SovereignRoutingHealthOptions,
): Promise<SovereignRoutingHealthResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  if (options.rootLabels.length === 0) {
    throw new Error("at least one root label is required");
  }

  const listedRoots = await readListedRoots(fetchImpl, options.apiBaseUrl);
  for (const rootLabel of options.rootLabels) {
    await assertRootRoutes(fetchImpl, options.apiBaseUrl, rootLabel, listedRoots);
  }

  return { checkedRoots: [...options.rootLabels], listedRoots };
}

if (import.meta.main) {
  const rootLabels = parseRootLabels(
    process.env.SOVEREIGN_ROUTING_HEALTH_ROOTS ?? "dankmeme,ellaalexandra",
  );
  const result = await verifySovereignRoutingHealth({
    apiBaseUrl: process.env.SOVEREIGN_ROUTING_HEALTH_API_BASE_URL ?? "https://api.pirate.sc",
    rootLabels,
  });
  console.log(
    `sovereign routing healthy: ${result.checkedRoots.length} root(s) checked, `
    + `${result.listedRoots.length} listed`,
  );
}
