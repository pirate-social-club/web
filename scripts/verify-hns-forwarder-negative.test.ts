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

describe("HNS forwarder negative probe", () => {
  test("retries a transient missing public namespace before exercising forged requests", async () => {
    const sleepCalls: number[] = [];
    let namespaceCalls = 0;
    const fixture = fetchFixture();
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/public-namespaces/")) {
        namespaceCalls += 1;
        if (namespaceCalls < 3) return new Response("missing", { status: 404 });
      }
      return fixture(input, init);
    }) as typeof fetch;

    await expect(verifyHnsForwarderNegativeProbe({
      apiBaseUrl: "https://api.pirate.sc",
      fetchImpl,
      rootLabel,
      sleepImpl: async (milliseconds) => { sleepCalls.push(milliseconds); },
      webBaseUrl: "https://pirate.sc",
    })).resolves.toEqual({ malformedStatus: 403, unsignedStatus: 200 });

    expect(namespaceCalls).toBe(3);
    expect(sleepCalls).toEqual([1_000, 2_000]);
  });

  test("bounds retries when the public namespace remains missing", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return new Response("missing", { status: 404 });
    }) as typeof fetch;

    await expect(verifyHnsForwarderNegativeProbe({
      apiBaseUrl: "https://api.pirate.sc",
      fetchImpl,
      rootLabel,
      sleepImpl: async () => undefined,
      webBaseUrl: "https://pirate.sc",
    })).rejects.toThrow("public namespace lookup returned HTTP 404");
    expect(calls).toBe(4);
  });

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
});
