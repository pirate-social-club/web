import { describe, expect, test } from "bun:test";

import {
  parseRootLabels,
  SovereignRootWithheldError,
  SovereignRoutingBlackoutError,
  verifySovereignRoutingHealth,
} from "./verify-sovereign-routing-health";

const API = "https://api.example.invalid";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

/** Route by pathname so a test never depends on call ordering. */
function routes(handlers: Record<string, () => Response>): typeof fetch {
  return (async (input: URL | RequestInfo) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const handler = handlers[url.pathname];
    if (!handler) return new Response("unrouted", { status: 500 });
    return handler();
  }) as typeof fetch;
}

describe("verifySovereignRoutingHealth", () => {
  test("passes when the registry lists the root and the root resolves", async () => {
    const result = await verifySovereignRoutingHealth({
      apiBaseUrl: API,
      fetchImpl: routes({
        "/public-namespaces": () => json({ namespaces: [{ root_label: "dankmeme" }] }),
        "/public-namespaces/dankmeme": () => json({ root_label: "dankmeme" }),
      }),
      rootLabels: ["dankmeme"],
    });

    expect(result.checkedRoots).toEqual(["dankmeme"]);
    expect(result.listedRoots).toEqual(["dankmeme"]);
  });

  test("an empty registry is a global blackout, not a per-root failure", async () => {
    const probe = verifySovereignRoutingHealth({
      apiBaseUrl: API,
      fetchImpl: routes({
        "/public-namespaces": () => json({ namespaces: [] }),
        "/public-namespaces/dankmeme": () => json({ code: "not_found" }, 404),
      }),
      rootLabels: ["dankmeme"],
    });

    // The distinction is the point: during a blackout the per-root lookup also
    // 404s, so classifying on that alone would send the responder after a seed
    // gap that does not exist.
    await expect(probe).rejects.toBeInstanceOf(SovereignRoutingBlackoutError);
  });

  test("a root missing from a populated registry is a per-root withholding", async () => {
    const probe = verifySovereignRoutingHealth({
      apiBaseUrl: API,
      fetchImpl: routes({
        "/public-namespaces": () => json({ namespaces: [{ root_label: "ellaalexandra" }] }),
        "/public-namespaces/dankmeme": () => json({ code: "not_found" }, 404),
      }),
      rootLabels: ["dankmeme"],
    });

    await expect(probe).rejects.toBeInstanceOf(SovereignRootWithheldError);
  });

  test("a listed root whose lookup fails is still a per-root withholding", async () => {
    const probe = verifySovereignRoutingHealth({
      apiBaseUrl: API,
      fetchImpl: routes({
        "/public-namespaces": () => json({ namespaces: [{ root_label: "dankmeme" }] }),
        "/public-namespaces/dankmeme": () => json({ code: "not_found" }, 404),
      }),
      rootLabels: ["dankmeme"],
    });

    await expect(probe).rejects.toBeInstanceOf(SovereignRootWithheldError);
  });

  test("an unreachable registry fails closed as a blackout", async () => {
    const probe = verifySovereignRoutingHealth({
      apiBaseUrl: API,
      fetchImpl: routes({
        "/public-namespaces": () => json({ code: "internal" }, 500),
      }),
      rootLabels: ["dankmeme"],
    });

    await expect(probe).rejects.toBeInstanceOf(SovereignRoutingBlackoutError);
  });

  test("a mismatched root_label does not count as resolved", async () => {
    const probe = verifySovereignRoutingHealth({
      apiBaseUrl: API,
      fetchImpl: routes({
        "/public-namespaces": () => json({ namespaces: [{ root_label: "dankmeme" }] }),
        "/public-namespaces/dankmeme": () => json({ root_label: "somethingelse" }),
      }),
      rootLabels: ["dankmeme"],
    });

    await expect(probe).rejects.toBeInstanceOf(SovereignRootWithheldError);
  });
});

describe("parseRootLabels", () => {
  test("trims, lowercases, and drops empties", () => {
    expect(parseRootLabels(" Dankmeme , ,ellaalexandra ")).toEqual([
      "dankmeme",
      "ellaalexandra",
    ]);
  });

  test("returns an empty list for undefined", () => {
    expect(parseRootLabels(undefined)).toEqual([]);
  });
});
