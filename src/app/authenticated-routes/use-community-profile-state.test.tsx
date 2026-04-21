import { describe, expect, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { parseHTML } from "linkedom";
import type * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import { api } from "@/lib/api";

import { useCommunityProfileState } from "./use-community-profile-state";

const { document, window } = parseHTML("<!DOCTYPE html><html><body></body></html>");
(globalThis as any).document = document;
(globalThis as any).window = window;
(globalThis as any).navigator = window.navigator;

type UpdateCommunityBody = {
  display_name: string;
  description: string | null;
  avatar_ref: string | null;
  banner_ref: string | null;
};

function createCommunity(overrides: Partial<ApiCommunity> = {}): ApiCommunity {
  return {
    community_id: "community-1",
    display_name: "Test Community",
    description: "Original description",
    avatar_ref: "avatar-1",
    banner_ref: "banner-1",
    ...overrides,
  } as ApiCommunity;
}

function installCommunityApiMocks() {
  const calls = {
    update: [] as Array<{ communityId: string; body: UpdateCommunityBody }>,
    uploadMedia: [] as Array<{ kind: "avatar" | "banner"; file: File }>,
  };

  const communities = api.communities as unknown as {
    update: (communityId: string, body: UpdateCommunityBody) => Promise<ApiCommunity>;
    uploadMedia: (input: { kind: "avatar" | "banner"; file: File }) => Promise<{ media_ref: string }>;
  };

  communities.uploadMedia = async (input) => {
    calls.uploadMedia.push(input);
    return { media_ref: `${input.kind}-uploaded` };
  };
  communities.update = async (communityId, body) => {
    calls.update.push({ communityId, body });
    return createCommunity({
      display_name: body.display_name,
      description: body.description,
      avatar_ref: body.avatar_ref,
      banner_ref: body.banner_ref,
    });
  };

  return calls;
}

function renderProfileHook({
  community = createCommunity(),
  setCommunity = () => undefined,
}: {
  community?: ApiCommunity | null;
  setCommunity?: React.Dispatch<React.SetStateAction<ApiCommunity | null>>;
} = {}) {
  return renderHook(() => useCommunityProfileState({ community, setCommunity }));
}

describe("useCommunityProfileState", () => {
  test("initializes profile draft state from the community record", async () => {
    installCommunityApiMocks();
    const { result } = renderProfileHook();

    await waitFor(() => expect(result.current.profileDisplayName).toBe("Test Community"));

    expect(result.current.profileDescription).toBe("Original description");
    expect(result.current.profileAvatarRemoved).toBe(false);
    expect(result.current.profileBannerRemoved).toBe(false);
    expect(result.current.profileHasChanges).toBe(false);
  });

  test("tracks local profile changes", async () => {
    installCommunityApiMocks();
    const { result } = renderProfileHook();

    await waitFor(() => expect(result.current.profileHasChanges).toBe(false));

    act(() => {
      result.current.setProfileDescription("Changed description");
    });

    expect(result.current.profileHasChanges).toBe(true);
  });

  test("blocks empty display names before saving", async () => {
    const calls = installCommunityApiMocks();
    const { result } = renderProfileHook();

    await waitFor(() => expect(result.current.profileDisplayName).toBe("Test Community"));

    act(() => {
      result.current.setProfileDisplayName("   ");
    });
    await act(async () => {
      await result.current.handleSaveProfile();
    });

    expect(result.current.profileDisplayNameError).toBe("Name is required.");
    expect(calls.update).toHaveLength(0);
  });

  test("saves trimmed profile fields and updates community state", async () => {
    const calls = installCommunityApiMocks();
    const updatedCommunities: ApiCommunity[] = [];
    const { result } = renderProfileHook({
      setCommunity: (nextValue) => {
        const previousCommunity = updatedCommunities.at(-1) ?? null;
        const nextCommunity = typeof nextValue === "function"
          ? nextValue(previousCommunity)
          : nextValue;
        if (nextCommunity) {
          updatedCommunities.push(nextCommunity);
        }
      },
    });

    await waitFor(() => expect(result.current.profileDisplayName).toBe("Test Community"));

    act(() => {
      result.current.setProfileDisplayName(" Updated Community ");
      result.current.setProfileDescription(" ");
      result.current.setProfileAvatarRemoved(true);
    });
    await act(async () => {
      await result.current.handleSaveProfile();
    });

    expect(calls.update).toEqual([{
      communityId: "community-1",
      body: {
        display_name: "Updated Community",
        description: null,
        avatar_ref: null,
        banner_ref: "banner-1",
      },
    }]);
    expect(updatedCommunities[0]?.display_name).toBe("Updated Community");
    expect(result.current.profileAvatarRemoved).toBe(true);
    expect(result.current.savingProfile).toBe(false);
  });
});
