import { afterEach, describe, expect, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type * as React from "react";

import { installDomGlobals } from "@/test/setup-dom";
import { api } from "@/lib/api";
import type {
  ApiCommunityKaraokePolicy,
  ApiCommunityStudyPolicy,
} from "@/lib/api/client-api-types";

import { useCommunityKaraokePolicyState } from "./use-community-karaoke-policy-state";
import { useCommunityStudyPolicyState } from "./use-community-study-policy-state";

installDomGlobals();

const community = {
  id: "community-1",
  object: "community",
  display_name: "Test Community",
  karaoke_enabled: false,
  study_enabled: false,
} as ApiCommunity;

const communitiesApi = api.communities as unknown as {
  getKaraokePolicy: (communityId: string) => Promise<ApiCommunityKaraokePolicy>;
  updateKaraokePolicy: (
    communityId: string,
    update: { karaoke_enabled?: boolean },
  ) => Promise<ApiCommunityKaraokePolicy>;
  getStudyPolicy: (communityId: string) => Promise<ApiCommunityStudyPolicy>;
  updateStudyPolicy: (
    communityId: string,
    update: { study_enabled: boolean },
  ) => Promise<ApiCommunityStudyPolicy>;
};

const originalApi = {
  getKaraokePolicy: communitiesApi.getKaraokePolicy,
  updateKaraokePolicy: communitiesApi.updateKaraokePolicy,
  getStudyPolicy: communitiesApi.getStudyPolicy,
  updateStudyPolicy: communitiesApi.updateStudyPolicy,
};

afterEach(() => {
  Object.assign(communitiesApi, originalApi);
});

describe("community toggle policy state", () => {
  test("loads and saves karaoke policy while updating the community fallback", async () => {
    const updates: Array<{ communityId: string; enabled: boolean | undefined }> = [];
    communitiesApi.getKaraokePolicy = async () => ({
      community_id: community.id,
      karaoke_enabled: true,
      karaoke_scoring_enabled: false,
      karaoke_stt_provider: "none",
      karaoke_stt_model: null,
      karaoke_voice_coach_enabled: false,
      karaoke_audio_retention: "not_stored",
      updated_at: "2026-07-19T10:00:00.000Z",
    });
    communitiesApi.updateKaraokePolicy = async (communityId, update) => {
      updates.push({ communityId, enabled: update.karaoke_enabled });
      return {
        community_id: communityId,
        karaoke_enabled: update.karaoke_enabled === true,
        karaoke_scoring_enabled: false,
        karaoke_stt_provider: "none",
        karaoke_stt_model: null,
        karaoke_voice_coach_enabled: false,
        karaoke_audio_retention: "not_stored",
        updated_at: "2026-07-19T11:00:00.000Z",
      };
    };
    let currentCommunity: ApiCommunity | null = community;
    const setCommunity = (updater: React.SetStateAction<ApiCommunity | null>) => {
      currentCommunity = typeof updater === "function" ? updater(currentCommunity) : updater;
    };
    const { result } = renderHook(() => useCommunityKaraokePolicyState({ community, setCommunity }));

    await waitFor(() => expect(result.current.karaokePolicySettings.karaokeEnabled).toBe(true));
    act(() => result.current.setKaraokePolicySettings((settings) => ({
      ...settings,
      karaokeEnabled: false,
    })));
    expect(result.current.karaokePolicyDirty).toBe(true);
    act(() => result.current.handleSaveKaraokePolicy());

    await waitFor(() => expect(result.current.savingKaraokePolicy).toBe(false));
    expect(updates).toEqual([{ communityId: community.id, enabled: false }]);
    expect(result.current.karaokePolicyDirty).toBe(false);
    expect((currentCommunity as ApiCommunity & { karaoke_enabled?: boolean }).karaoke_enabled).toBe(false);
  });

  test("loads and saves study policy through the same lifecycle", async () => {
    const updates: Array<{ communityId: string; enabled: boolean }> = [];
    communitiesApi.getStudyPolicy = async () => ({
      community_id: community.id,
      study_enabled: true,
      updated_at: "2026-07-19T10:00:00.000Z",
    });
    communitiesApi.updateStudyPolicy = async (communityId, update) => {
      updates.push({ communityId, enabled: update.study_enabled });
      return {
        community_id: communityId,
        study_enabled: update.study_enabled,
        updated_at: "2026-07-19T11:00:00.000Z",
      };
    };
    const { result } = renderHook(() => useCommunityStudyPolicyState({ community }));

    await waitFor(() => expect(result.current.studyPolicySettings.studyEnabled).toBe(true));
    act(() => result.current.setStudyPolicySettings((settings) => ({ ...settings, studyEnabled: false })));
    expect(result.current.studyPolicyDirty).toBe(true);
    act(() => result.current.handleSaveStudyPolicy());

    await waitFor(() => expect(result.current.savingStudyPolicy).toBe(false));
    expect(updates).toEqual([{ communityId: community.id, enabled: false }]);
    expect(result.current.studyPolicyDirty).toBe(false);
  });
});
