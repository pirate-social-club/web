import { describe, expect, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import type * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";
import { api } from "@/lib/api";
import type {
  ApiCommunityKaraokePolicy,
  ApiCommunityKaraokePolicyUpdate,
} from "@/lib/api/client-api-types";
import { useCommunityKaraokePolicyState } from "./use-community-karaoke-policy-state";

installDomGlobals();

function createCommunity(overrides: Partial<ApiCommunity> = {}): ApiCommunity {
  return {
    id: "community-1",
    display_name: "Karaoke Community",
    karaoke_enabled: false,
    ...overrides,
  } as ApiCommunity;
}

function createPolicy(overrides: Partial<ApiCommunityKaraokePolicy> = {}): ApiCommunityKaraokePolicy {
  return {
    community_id: "community-1",
    karaoke_enabled: false,
    updated_at: "2026-06-09T00:00:00.000Z",
    ...overrides,
  };
}

function installKaraokePolicyApiMocks() {
  const calls = {
    get: [] as string[],
    update: [] as Array<{ communityId: string; body: ApiCommunityKaraokePolicyUpdate }>,
  };
  let policy = createPolicy();

  const communities = api.communities as unknown as {
    getKaraokePolicy: (communityId: string) => Promise<ApiCommunityKaraokePolicy>;
    updateKaraokePolicy: (
      communityId: string,
      body: ApiCommunityKaraokePolicyUpdate,
    ) => Promise<ApiCommunityKaraokePolicy>;
  };

  communities.getKaraokePolicy = async (communityId) => {
    calls.get.push(communityId);
    return policy;
  };
  communities.updateKaraokePolicy = async (communityId, body) => {
    calls.update.push({ communityId, body });
    policy = createPolicy({
      karaoke_enabled: body.karaoke_enabled,
      updated_at: "2026-06-09T01:00:00.000Z",
    });
    return policy;
  };

  return calls;
}

describe("useCommunityKaraokePolicyState", () => {
  test("loads and saves karaoke policy", async () => {
    const calls = installKaraokePolicyApiMocks();
    let currentCommunity: ApiCommunity | null = createCommunity();
    const setCommunity = (value: React.SetStateAction<ApiCommunity | null>) => {
      currentCommunity = typeof value === "function" ? value(currentCommunity) : value;
    };

    const { result } = renderHook(() => useCommunityKaraokePolicyState({
      community: currentCommunity,
      setCommunity,
    }));

    await waitFor(() => expect(calls.get).toEqual(["community-1"]));
    expect(result.current.karaokePolicySettings.karaokeEnabled).toBe(false);
    expect(result.current.karaokePolicyDirty).toBe(false);

    act(() => {
      result.current.setKaraokePolicySettings({
        ...result.current.karaokePolicySettings,
        karaokeEnabled: true,
      });
    });
    expect(result.current.karaokePolicyDirty).toBe(true);

    act(() => {
      result.current.handleSaveKaraokePolicy();
    });

    await waitFor(() => expect(calls.update).toHaveLength(1));
    expect(calls.update[0]).toEqual({
      communityId: "community-1",
      body: { karaoke_enabled: true },
    });

    await waitFor(() => expect(result.current.karaokePolicyDirty).toBe(false));
    expect(result.current.karaokePolicySettings).toMatchObject({
      karaokeEnabled: true,
      updatedAt: "2026-06-09T01:00:00.000Z",
    });
    expect(currentCommunity?.karaoke_enabled).toBe(true);
  });
});
