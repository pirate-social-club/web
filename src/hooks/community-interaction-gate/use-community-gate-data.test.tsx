import { afterEach, describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import type { CommunityPreview, JoinEligibility } from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";
import {
  createDeferred,
  createPreview,
  eligibility,
} from "./test-fixtures";

import {
  COMMUNITY_GATE_CACHE_TTL_MS,
  clearCommunityGateDataCache,
  type CommunityGateDataApi,
  useCommunityGateData,
} from "./use-community-gate-data";

installDomGlobals();

const originalDateNow = Date.now;

afterEach(() => {
  Date.now = originalDateNow;
  clearCommunityGateDataCache();
});

function createApi(overrides: Partial<CommunityGateDataApi> = {}) {
  const calls: Array<{ fn: "preview" | "eligibility"; communityId: string; locale?: string }> = [];
  const api: CommunityGateDataApi = {
    getJoinEligibility: async (communityId) => {
      calls.push({ fn: "eligibility", communityId });
      return eligibility();
    },
    preview: async (communityId, options) => {
      calls.push({ fn: "preview", communityId, locale: options.locale });
      return createPreview({ id: communityId });
    },
    ...overrides,
  };
  return { api, calls };
}

function renderGateDataHook({
  api,
  previewLocale = "en",
  sessionKey = "usr_test",
}: {
  api: CommunityGateDataApi;
  previewLocale?: string;
  sessionKey?: string | null;
}) {
  return renderHook(
    (props: { previewLocale: string; sessionKey: string | null }) =>
      useCommunityGateData({
        communitiesApi: api,
        previewLocale: props.previewLocale,
        sessionKey: props.sessionKey,
      }),
    {
      initialProps: {
        previewLocale,
        sessionKey,
      },
    },
  );
}

describe("useCommunityGateData", () => {
  test("caches loaded gate data within the TTL", async () => {
    Date.now = () => 1_000;
    const { api, calls } = createApi();
    const { result } = renderGateDataHook({ api });

    const first = await result.current.loadCommunityGate("com_test");
    const second = await result.current.loadCommunityGate("com_test");

    expect(first).toEqual(second);
    expect(calls).toEqual([
      { fn: "preview", communityId: "com_test", locale: "en" },
      { fn: "eligibility", communityId: "com_test" },
    ]);
  });

  test("reloads expired gate data", async () => {
    let now = 1_000;
    Date.now = () => now;
    const { api, calls } = createApi();
    const { result } = renderGateDataHook({ api });

    await result.current.loadCommunityGate("com_test");
    now = 1_000 + COMMUNITY_GATE_CACHE_TTL_MS - 1;
    await result.current.loadCommunityGate("com_test");
    now = 1_000 + COMMUNITY_GATE_CACHE_TTL_MS + 1;
    await result.current.loadCommunityGate("com_test");

    expect(calls).toEqual([
      { fn: "preview", communityId: "com_test", locale: "en" },
      { fn: "eligibility", communityId: "com_test" },
      { fn: "preview", communityId: "com_test", locale: "en" },
      { fn: "eligibility", communityId: "com_test" },
    ]);
  });

  test("dedupes concurrent in-flight loads for the same session and community", async () => {
    const previewDeferred = createDeferred<CommunityPreview>();
    const eligibilityDeferred = createDeferred<JoinEligibility>();
    const calls: string[] = [];
    const { result } = renderGateDataHook({
      api: {
        getJoinEligibility: async () => {
          calls.push("eligibility");
          return await eligibilityDeferred.promise;
        },
        preview: async () => {
          calls.push("preview");
          return await previewDeferred.promise;
        },
      },
    });

    const first = result.current.loadCommunityGate("com_test");
    const second = result.current.loadCommunityGate("com_test");
    expect(calls).toEqual(["preview", "eligibility"]);

    previewDeferred.resolve(createPreview());
    eligibilityDeferred.resolve(eligibility("joinable"));
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult).toEqual(secondResult);
    expect(firstResult.eligibility.status).toBe("joinable");
  });

  test("partitions cached data by session key", async () => {
    const { api, calls } = createApi();
    const { result, rerender } = renderGateDataHook({ api, sessionKey: "usr_a" });

    await result.current.loadCommunityGate("com_test");
    rerender({ previewLocale: "en", sessionKey: "usr_b" });
    await result.current.loadCommunityGate("com_test");

    expect(calls).toEqual([
      { fn: "preview", communityId: "com_test", locale: "en" },
      { fn: "eligibility", communityId: "com_test" },
      { fn: "preview", communityId: "com_test", locale: "en" },
      { fn: "eligibility", communityId: "com_test" },
    ]);
  });

  test("invalidateCommunityGate clears cached and in-flight data", async () => {
    const previewDeferred = createDeferred<CommunityPreview>();
    const eligibilityDeferred = createDeferred<JoinEligibility>();
    const calls: string[] = [];
    const { result } = renderGateDataHook({
      api: {
        getJoinEligibility: async () => {
          calls.push("eligibility");
          return await eligibilityDeferred.promise;
        },
        preview: async () => {
          calls.push("preview");
          return await previewDeferred.promise;
        },
      },
    });

    const first = result.current.loadCommunityGate("com_test");
    act(() => {
      result.current.invalidateCommunityGate("com_test");
    });
    const second = result.current.loadCommunityGate("com_test");

    expect(calls).toEqual(["preview", "eligibility", "preview", "eligibility"]);

    previewDeferred.resolve(createPreview());
    eligibilityDeferred.resolve(eligibility());
    await Promise.all([first, second]);
  });

  test("updateCachedGate replaces cached data", async () => {
    const { api, calls } = createApi();
    const { result } = renderGateDataHook({ api });

    act(() => {
      result.current.updateCachedGate("com_test", {
        eligibility: eligibility("pending_request"),
        preview: {
          id: "com_test",
          display_name: "Updated community",
          membership_gate_summaries: [],
        },
      });
    });

    const gate = await result.current.loadCommunityGate("com_test");

    expect(gate.eligibility.status).toBe("pending_request");
    expect(gate.preview.display_name).toBe("Updated community");
    expect(calls).toEqual([]);
  });
});
