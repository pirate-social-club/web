import { describe, expect, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { installDomGlobals } from "@/test/setup-dom";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import { api } from "@/lib/api";
import {
  createDefaultCommunitySafetyAdultContentPolicy,
  createDefaultCommunitySafetyCivilityPolicy,
  createDefaultCommunitySafetyGraphicContentPolicy,
} from "@/components/compositions/community/safety-page/community-safety-page";

import type { SaveCommunityAction } from "@/app/authenticated-helpers/community-moderation-save";
import { useCommunitySafetyState } from "./use-community-safety-state";

installDomGlobals();

type SafetyBody = {
  adult_content_policy: ReturnType<typeof createDefaultCommunitySafetyAdultContentPolicy>;
  civility_policy: ReturnType<typeof createDefaultCommunitySafetyCivilityPolicy>;
  graphic_content_policy: ReturnType<typeof createDefaultCommunitySafetyGraphicContentPolicy>;
  openai_moderation_settings: {
    scan_titles: boolean;
    scan_post_bodies: boolean;
    scan_captions: boolean;
    scan_link_preview_text: boolean;
    scan_images: boolean;
  };
};

function createCommunity(overrides: Partial<ApiCommunity> = {}): ApiCommunity {
  return {
    community_id: "community-1",
    display_name: "Test Community",
    adult_content_policy: {
      community_id: "community-1",
      policy_origin: "explicit",
      suggestive: "allow",
      artistic_nudity: "review",
      explicit_nudity: "review",
      explicit_sexual_content: "disallow",
      fetish_content: "disallow",
      updated_at: "2026-01-01T00:00:00Z",
    },
    civility_policy: {
      community_id: "community-1",
      policy_origin: "explicit",
      group_directed_demeaning_language: "review",
      targeted_insults: "review",
      targeted_harassment: "disallow",
      threatening_language: "disallow",
      updated_at: "2026-01-01T00:00:00Z",
    },
    graphic_content_policy: {
      community_id: "community-1",
      policy_origin: "explicit",
      injury_medical: "allow",
      gore: "review",
      extreme_gore: "disallow",
      body_horror_disturbing: "review",
      animal_harm: "disallow",
      updated_at: "2026-01-01T00:00:00Z",
    },
    openai_moderation_settings: {
      scan_titles: true,
      scan_post_bodies: true,
      scan_captions: false,
      scan_link_preview_text: false,
      scan_images: true,
    },
    ...overrides,
  } as ApiCommunity;
}

function installCommunityApiMocks() {
  const calls = {
    updateSafety: [] as Array<{ communityId: string; body: SafetyBody }>,
  };

  const communities = api.communities as unknown as {
    updateSafety: (communityId: string, body: SafetyBody) => Promise<ApiCommunity>;
  };

  communities.updateSafety = async (communityId, body) => {
    calls.updateSafety.push({ communityId, body });
    return createCommunity();
  };

  return calls;
}

function createSaveCommunityMock() {
  const calls: Array<{ successMessage: string; failureMessage: string }> = [];
  const saveCommunity: SaveCommunityAction = async (
    action,
    savingSetter,
    successMessage,
    failureMessage,
  ) => {
    calls.push({ successMessage, failureMessage });
    savingSetter(true);
    try {
      return await action();
    } finally {
      savingSetter(false);
    }
  };

  return { calls, saveCommunity };
}

function renderSafetyHook({
  community = createCommunity(),
  saveCommunity = createSaveCommunityMock().saveCommunity,
}: {
  community?: ApiCommunity | null;
  saveCommunity?: SaveCommunityAction;
} = {}) {
  return renderHook(() => useCommunitySafetyState({ community, saveCommunity }));
}

describe("useCommunitySafetyState", () => {
  test("initializes safety drafts from the community record", async () => {
    installCommunityApiMocks();
    const { result } = renderSafetyHook();

    await waitFor(() => expect(result.current.providerSettings.scanCaptions).toBe(false));

    expect(result.current.providerSettings.scanImages).toBe(true);
    expect(result.current.adultContentPolicy.explicit_sexual_content).toBe("disallow");
    expect(result.current.graphicContentPolicy.gore).toBe("review");
    expect(result.current.civilityPolicy.targeted_harassment).toBe("disallow");
  });

  test("saves safety settings through the injected save boundary", async () => {
    const calls = installCommunityApiMocks();
    const save = createSaveCommunityMock();
    const { result } = renderSafetyHook({ saveCommunity: save.saveCommunity });

    await waitFor(() => expect(result.current.providerSettings.scanImages).toBe(true));

    act(() => {
      result.current.setProviderSettings({
        scanCaptions: true,
        scanImages: false,
        scanLinkPreviewText: true,
        scanPostBodies: false,
        scanTitles: true,
      });
      result.current.setAdultContentPolicy({
        ...result.current.adultContentPolicy,
        suggestive: "review",
      });
    });
    act(() => {
      result.current.handleSaveSafety();
    });

    await waitFor(() => expect(calls.updateSafety).toHaveLength(1));

    expect(save.calls).toEqual([{
      successMessage: "Safety settings saved.",
      failureMessage: "Could not save safety settings.",
    }]);
    expect(calls.updateSafety[0]?.body.openai_moderation_settings).toEqual({
      scan_titles: true,
      scan_post_bodies: false,
      scan_captions: true,
      scan_link_preview_text: true,
      scan_images: false,
    });
    expect(calls.updateSafety[0]?.body.adult_content_policy.suggestive).toBe("review");
  });
});
