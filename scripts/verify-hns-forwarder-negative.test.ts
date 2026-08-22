import { describe, expect, test } from "bun:test";

import { verifyHnsForwarderNegativeProbe } from "./verify-hns-forwarder-negative";

const communityId = "com_cmt_forwarder_negative_fixture";
const rootLabel = "dankmeme";

function canonicalBody(): string {
  return `<html><head><title>Pirate</title></head><body><script>window.__data={\"initialImportedRootCommunityId\":null,\"initialImportedRootCommunityRoute\":null}</script></body></html>`;
}

function fetchFixture(malformedStatus: 200 | 403 = 403): typeof fetch {
  let calls = 0;
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls += 1;
    if (calls === 1) {
      expect(String(input)).toBe("https://api.pirate.sc/public-namespaces/dankmeme");
      expect(init?.method).toBe("GET");
      return Response.json({
        community: { id: communityId, route_slug: rootLabel },
        root_label: rootLabel,
      });
    }

    expect(String(input)).toBe("https://pirate.sc/");
    const headers = new Headers(init?.headers);
    expect(headers.get("x-pirate-hns-host")).toBe("app.dankmeme");
    expect(headers.get("x-pirate-hns-community-id")).toBe(communityId);
    expect(headers.get("x-pirate-hns-wallet-interactive")).toBe("1");

    if (calls === 2) {
      expect(headers.has("x-pirate-hns-forwarder-signature")).toBe(false);
      return new Response(canonicalBody(), { status: 200 });
    }

    expect(headers.get("cf-connecting-ip")).toBe("94.103.168.161");
    expect(headers.get("x-pirate-hns-forwarder-signature")).toMatch(/^v1=0{64}$/u);
    return malformedStatus === 403
      ? new Response("HNS forwarder authentication failed.", { status: 403 })
      : new Response(canonicalBody(), { status: 200 });
  }) as typeof fetch;
}

function fetchAbsentNamespaceFixture(): typeof fetch {
  let calls = 0;
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls += 1;
    if (calls === 1) {
      expect(String(input)).toBe("https://api.pirate.sc/public-namespaces/dankmeme");
      return new Response("Namespace not found", { status: 404 });
    }

    expect(String(input)).toBe("https://pirate.sc/");
    const headers = new Headers(init?.headers);
    expect(headers.get("x-pirate-hns-community-id")).toBe("cmt_hns_forwarder_negative_dankmeme");
    expect(headers.get("x-pirate-hns-root")).toBe(rootLabel);
    if (calls === 2) return new Response(canonicalBody(), { status: 200 });
    return new Response("HNS forwarder authentication failed.", { status: 403 });
  }) as typeof fetch;
}

describe("HNS forwarder negative probe", () => {
  test("requires unsigned client context to remain canonical and malformed HMAC to fail closed", async () => {
    await expect(verifyHnsForwarderNegativeProbe({
      apiBaseUrl: "https://api.pirate.sc",
      fetchImpl: fetchFixture(),
      rootLabel,
      webBaseUrl: "https://pirate.sc",
    })).resolves.toEqual({ malformedStatus: 403, unsignedStatus: 200 });
  });

  test("accepts a malformed envelope ignored at the source boundary only when context stays canonical", async () => {
    await expect(verifyHnsForwarderNegativeProbe({
      apiBaseUrl: "https://api.pirate.sc",
      fetchImpl: fetchFixture(200),
      rootLabel,
      webBaseUrl: "https://pirate.sc",
    })).resolves.toEqual({ malformedStatus: 200, unsignedStatus: 200 });
  });

  test("retries transient namespace lookup failures before using an allowed absent namespace", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      if (calls <= 2) return new Response("unavailable", { status: 503 });
      if (calls === 3) return new Response("not found", { status: 404 });
      return calls === 4
        ? new Response(canonicalBody(), { status: 200 })
        : new Response("HNS forwarder authentication failed.", { status: 403 });
    }) as typeof fetch;

    await expect(verifyHnsForwarderNegativeProbe({
      allowMissingNamespace: true,
      apiBaseUrl: "https://api.pirate.sc",
      fetchImpl,
      namespaceRetryDelayMs: 0,
      rootLabel,
      webBaseUrl: "https://pirate.sc",
    })).resolves.toEqual({ malformedStatus: 403, unsignedStatus: 200 });
    expect(calls).toBe(5);
  });

  test("fails if unsigned client headers adopt wallet or route context", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      if (calls === 1) {
        return Response.json({ community: { id: communityId }, root_label: rootLabel });
      }
      return new Response(
        `<html data-hns-wallet-interactive="1"><script>window.__data={\"initialImportedRootCommunityId\":\"${communityId}\",\"initialImportedRootCommunityRoute\":\"${rootLabel}\"}</script></html>`,
        { status: 200 },
      );
    }) as typeof fetch;

    await expect(verifyHnsForwarderNegativeProbe({
      apiBaseUrl: "https://api.pirate.sc",
      fetchImpl,
      rootLabel,
      webBaseUrl: "https://pirate.sc",
    })).rejects.toThrow("adopted forged wallet interactivity");
  });

  test("can exercise rejection with a synthetic context when the registry is empty", async () => {
    await expect(verifyHnsForwarderNegativeProbe({
      allowMissingNamespace: true,
      apiBaseUrl: "https://api.pirate.sc",
      fetchImpl: fetchAbsentNamespaceFixture(),
      rootLabel,
      webBaseUrl: "https://pirate.sc",
    })).resolves.toEqual({ malformedStatus: 403, unsignedStatus: 200 });
  });

  test("can explicitly isolate the forged-context boundary from registry availability", async () => {
    let calls = 0;
    const fetchImpl = (async (input: RequestInfo | URL) => {
      calls += 1;
      expect(String(input)).toBe("https://pirate.sc/");
      return calls === 1
        ? new Response(canonicalBody(), { status: 200 })
        : new Response("HNS forwarder authentication failed.", { status: 403 });
    }) as typeof fetch;

    await expect(verifyHnsForwarderNegativeProbe({
      apiBaseUrl: "https://api.pirate.sc",
      fetchImpl,
      rootLabel,
      useSyntheticContext: true,
      webBaseUrl: "https://pirate.sc",
    })).resolves.toEqual({ malformedStatus: 403, unsignedStatus: 200 });
    expect(calls).toBe(2);
  });

  test("still fails on an absent namespace by default", async () => {
    const fetchImpl = (async () => new Response("Namespace not found", { status: 404 })) as typeof fetch;
    await expect(verifyHnsForwarderNegativeProbe({
      apiBaseUrl: "https://api.pirate.sc",
      fetchImpl,
      rootLabel,
      webBaseUrl: "https://pirate.sc",
    })).rejects.toThrow("public namespace lookup returned HTTP 404");
  });

  test("does not hide a registry outage behind the synthetic context", async () => {
    const fetchImpl = (async () => new Response("upstream unavailable", { status: 503 })) as typeof fetch;
    await expect(verifyHnsForwarderNegativeProbe({
      allowMissingNamespace: true,
      apiBaseUrl: "https://api.pirate.sc",
      fetchImpl,
      rootLabel,
      webBaseUrl: "https://pirate.sc",
    })).rejects.toThrow("public namespace lookup returned HTTP 503");
  });
});
