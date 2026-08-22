type FetchLike = typeof fetch;

type PublicNamespace = {
  community?: {
    id?: string;
    route_slug?: string;
  };
  root_label?: string;
};

export type HnsForwarderNegativeProbeOptions = {
  allowMissingNamespace?: boolean;
  apiBaseUrl: string;
  fetchImpl?: FetchLike;
  namespaceRetryDelayMs?: number;
  rootLabel: string;
  useSyntheticContext?: boolean;
  webBaseUrl: string;
};

const transientNamespaceStatuses = new Set([429, 502, 503, 504]);

async function fetchPublicNamespace(
  fetchImpl: FetchLike,
  namespaceUrl: URL,
  retryDelayMs: number,
): Promise<Response> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetchImpl(namespaceUrl, {
      headers: { accept: "application/json" },
      method: "GET",
    });
    if (!transientNamespaceStatuses.has(response.status) || attempt === 3) return response;
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
  throw new Error("public namespace lookup retry loop exhausted unexpectedly");
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is missing`);
  }
  return value.trim();
}

function forwardedHeaders(input: {
  communityId: string;
  rootLabel: string;
}): Headers {
  return new Headers({
    "x-pirate-hns-community-id": input.communityId,
    "x-pirate-hns-community-route": input.rootLabel,
    "x-pirate-hns-host": `app.${input.rootLabel}`,
    "x-pirate-hns-root": input.rootLabel,
    "x-pirate-hns-subdomain": "app",
    "x-pirate-hns-trusted-forwarder": "1",
    "x-pirate-hns-wallet-interactive": "1",
  });
}

function hasNullForwardedBinding(body: string, field: string): boolean {
  return body.includes(`"${field}":null`)
    || body.includes(`${field}\\":null`);
}

function assertCanonicalResponse(response: Response, body: string, label: string): void {
  if (response.status !== 200) {
    throw new Error(`${label} returned HTTP ${response.status}; expected canonical HTTP 200`);
  }
  if (body.includes("data-hns-wallet-interactive=\"1\"")) {
    throw new Error(`${label} adopted forged wallet interactivity`);
  }
  if (!hasNullForwardedBinding(body, "initialImportedRootCommunityId")) {
    throw new Error(`${label} did not preserve a null imported community id`);
  }
  if (!hasNullForwardedBinding(body, "initialImportedRootCommunityRoute")) {
    throw new Error(`${label} did not preserve a null imported community route`);
  }
}

export async function verifyHnsForwarderNegativeProbe(
  options: HnsForwarderNegativeProbeOptions,
): Promise<{ malformedStatus: number; unsignedStatus: number }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const namespaceUrl = new URL(
    `/public-namespaces/${encodeURIComponent(options.rootLabel)}`,
    options.apiBaseUrl,
  );
  let namespace: PublicNamespace | null = null;
  if (!options.useSyntheticContext) {
    const namespaceResponse = await fetchPublicNamespace(
      fetchImpl,
      namespaceUrl,
      options.namespaceRetryDelayMs ?? 1_000,
    );
    const useSyntheticContext = !namespaceResponse.ok
      && namespaceResponse.status === 404
      && options.allowMissingNamespace;
    if (!namespaceResponse.ok && !useSyntheticContext) {
      throw new Error(`public namespace lookup returned HTTP ${namespaceResponse.status}`);
    }
    namespace = !useSyntheticContext
      ? await namespaceResponse.json() as PublicNamespace
      : null;
  }
  const rootLabel = namespace
    ? requiredString(namespace.root_label, "public namespace root_label")
    : options.rootLabel;
  const communityId = namespace
    ? requiredString(namespace.community?.id, "public namespace community.id")
    : `cmt_hns_forwarder_negative_${options.rootLabel}`;
  if (rootLabel !== options.rootLabel) {
    throw new Error(`public namespace root mismatch: expected ${options.rootLabel}, received ${rootLabel}`);
  }

  const target = new URL("/", options.webBaseUrl);
  const unsignedHeaders = forwardedHeaders({ communityId, rootLabel });
  const unsignedResponse = await fetchImpl(target, {
    headers: unsignedHeaders,
    method: "GET",
    redirect: "manual",
  });
  const unsignedBody = await unsignedResponse.text();
  assertCanonicalResponse(unsignedResponse, unsignedBody, "unsigned forged context");

  const malformedHeaders = forwardedHeaders({ communityId, rootLabel });
  malformedHeaders.set("cf-connecting-ip", "94.103.168.161");
  malformedHeaders.set("x-pirate-hns-forwarder-path", "/");
  malformedHeaders.set(
    "x-pirate-hns-forwarder-signature",
    `v1=${"0".repeat(64)}`,
  );
  malformedHeaders.set(
    "x-pirate-hns-forwarder-timestamp",
    String(Math.floor(Date.now() / 1_000)),
  );
  const malformedResponse = await fetchImpl(target, {
    headers: malformedHeaders,
    method: "GET",
    redirect: "manual",
  });
  const malformedBody = await malformedResponse.text();
  if (malformedResponse.status === 200) {
    assertCanonicalResponse(malformedResponse, malformedBody, "malformed forged context");
  } else if (malformedResponse.status !== 403) {
    throw new Error(`malformed forged context returned unexpected HTTP ${malformedResponse.status}`);
  }

  return {
    malformedStatus: malformedResponse.status,
    unsignedStatus: unsignedResponse.status,
  };
}

if (import.meta.main) {
  const result = await verifyHnsForwarderNegativeProbe({
    apiBaseUrl: process.env.HNS_FORWARDER_NEGATIVE_API_BASE_URL ?? "https://api.pirate.sc",
    allowMissingNamespace: process.env.HNS_FORWARDER_NEGATIVE_ALLOW_ABSENT_NAMESPACE === "true",
    rootLabel: process.env.HNS_FORWARDER_NEGATIVE_ROOT ?? "dankmeme",
    useSyntheticContext: process.env.HNS_FORWARDER_NEGATIVE_USE_SYNTHETIC_CONTEXT === "true",
    webBaseUrl: process.env.HNS_FORWARDER_NEGATIVE_WEB_BASE_URL ?? "https://pirate.sc",
  });
  console.log(
    `HNS forwarder negative probe passed: unsigned=${result.unsignedStatus} malformed=${result.malformedStatus}`,
  );
}
