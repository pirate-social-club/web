import { describe, expect, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { installDomGlobals } from "@/test/setup-dom";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import { api } from "@/lib/api";
import type {
  ApiCommunityAssistantCredentialResponse,
  ApiCommunityAssistantModelList,
  ApiCommunityAssistantPolicy,
  ApiCommunityAssistantPolicyUpdate,
} from "@/lib/api/client-api-types";
import { createDefaultCommunityAssistantPolicySettings } from "@/components/compositions/community/assistant-policy/community-assistant-policy.types";

import {
  assistantSettingsToPolicyUpdate,
  useCommunityAssistantPolicyState,
} from "./use-community-assistant-policy-state";

installDomGlobals();

function createCommunity(overrides: Partial<ApiCommunity> = {}): ApiCommunity {
  return {
    id: "community-1",
    object: "community",
    display_name: "Test Community",
    ...overrides,
  } as ApiCommunity;
}

function createPolicy(overrides: Partial<ApiCommunityAssistantPolicy> = {}): ApiCommunityAssistantPolicy {
  const defaults = createDefaultCommunityAssistantPolicySettings();

  return {
    object: "community_assistant_policy",
    community: "community-1",
    policyOrigin: "default",
    enabled: false,
    displayName: defaults.displayName,
    shortBio: defaults.shortBio,
    avatarRef: "media_existing_avatar",
    systemPrompt: defaults.systemPrompt,
    defaultPrompt: defaults.defaultPrompt,
    starterPrompts: defaults.starterPrompts,
    openRouterKeyStatus: { kind: "missing" },
    selectedModelId: defaults.selectedModelId,
    availableModels: defaults.availableModels,
    contextMode: defaults.contextMode,
    contextSources: defaults.contextSources,
    maxContextThreads: defaults.maxContextThreads,
    maxLookbackDays: defaults.maxLookbackDays,
    memoryEnabled: defaults.memoryEnabled,
    retentionMode: defaults.retentionMode,
    retentionDays: defaults.retentionDays,
    saveChatsToCommunityDb: defaults.saveChatsToCommunityDb,
    actionMode: defaults.actionMode,
    requireModeratorApprovalForWrites: defaults.requireModeratorApprovalForWrites,
    perUserDailyMessageCap: defaults.perUserDailyMessageCap,
    voiceMode: defaults.voiceMode,
    sttProvider: defaults.sttProvider,
    sttModel: defaults.sttModel,
    ttsVoice: defaults.ttsVoice,
    includeInSovereignExport: defaults.includeInSovereignExport,
    createdAt: "2026-05-22T00:00:00.000Z",
    updatedAt: "2026-05-22T00:00:00.000Z",
    ...overrides,
  };
}

function installAssistantApiMocks(input: { initialPolicy?: ApiCommunityAssistantPolicy } = {}) {
  let policy = input.initialPolicy ?? createPolicy();
  const modelList: ApiCommunityAssistantModelList = {
    object: "list",
    data: [
      {
        id: "mistralai/mistral-small-3.2-24b-instruct",
        label: "Mistral Small 3.2",
      },
      {
        id: "openai/gpt-4.1-mini",
        label: "OpenAI mini",
      },
    ],
  };
  const calls = {
    getAssistantModels: [] as string[],
    getAssistantPolicy: [] as string[],
    revokeAssistantCredential: [] as string[],
    saveAssistantCredential: [] as Array<{ communityId: string; body: { api_key: string } }>,
    updateAssistantPolicy: [] as Array<{ communityId: string; body: ApiCommunityAssistantPolicyUpdate }>,
    uploadMedia: [] as Array<{ kind: "avatar"; file: File }>,
  };

  const communities = api.communities as unknown as {
    getAssistantModels: (communityId: string) => Promise<ApiCommunityAssistantModelList>;
    getAssistantPolicy: (communityId: string) => Promise<ApiCommunityAssistantPolicy>;
    revokeAssistantCredential: (communityId: string) => Promise<ApiCommunityAssistantCredentialResponse>;
    saveAssistantCredential: (communityId: string, body: { api_key: string }) => Promise<ApiCommunityAssistantCredentialResponse>;
    updateAssistantPolicy: (
      communityId: string,
      body: ApiCommunityAssistantPolicyUpdate,
    ) => Promise<ApiCommunityAssistantPolicy>;
    uploadMedia: (input: { kind: "avatar"; file: File }) => Promise<{ media_ref: string }>;
  };

  communities.getAssistantPolicy = async (communityId) => {
    calls.getAssistantPolicy.push(communityId);
    return policy;
  };
  communities.updateAssistantPolicy = async (communityId, body) => {
    calls.updateAssistantPolicy.push({ communityId, body });
    policy = createPolicy({
      ...policy,
      ...body,
      policyOrigin: "explicit",
      updatedAt: "2026-05-22T01:00:00.000Z",
    });
    return policy;
  };
  communities.saveAssistantCredential = async (communityId, body) => {
    calls.saveAssistantCredential.push({ communityId, body });
    return {
      object: "community_assistant_credential",
      provider: "openrouter",
      openRouterKeyStatus: {
        kind: "connected",
        last4: "9abc",
        connectedAt: "2026-05-22T01:00:00.000Z",
      },
    };
  };
  communities.revokeAssistantCredential = async (communityId) => {
    calls.revokeAssistantCredential.push(communityId);
    return {
      object: "community_assistant_credential",
      provider: "openrouter",
      openRouterKeyStatus: { kind: "missing" },
    };
  };
  communities.getAssistantModels = async (communityId) => {
    calls.getAssistantModels.push(communityId);
    return modelList;
  };
  communities.uploadMedia = async (input) => {
    calls.uploadMedia.push(input);
    return { media_ref: "media_uploaded_avatar" };
  };

  return { calls, modelList };
}

function renderAssistantHook({
  community = createCommunity(),
}: {
  community?: ApiCommunity | null;
} = {}) {
  return renderHook(() => useCommunityAssistantPolicyState({ community }));
}

describe("useCommunityAssistantPolicyState", () => {
  test("loads assistant policy settings from the API", async () => {
    const { calls } = installAssistantApiMocks();
    const { result } = renderAssistantHook();

    await waitFor(() => expect(result.current.loadingAssistantPolicy).toBe(false));

    expect(calls.getAssistantPolicy).toEqual(["community-1"]);
    expect(result.current.assistantPolicySettings.enabled).toBe(false);
    expect(result.current.assistantPolicySettings.avatarPreviewUrl).toBe("media_existing_avatar");
    expect(result.current.assistantPolicyDirty).toBe(false);
  });

  test("refreshes live model options when a saved OpenRouter key exists", async () => {
    const { calls, modelList } = installAssistantApiMocks({
      initialPolicy: createPolicy({
        openRouterKeyStatus: {
          kind: "connected",
          last4: "9abc",
          connectedAt: "2026-05-22T01:00:00.000Z",
        },
      }),
    });
    const { result } = renderAssistantHook();

    await waitFor(() => expect(result.current.loadingAssistantPolicy).toBe(false));
    await waitFor(() => expect(calls.getAssistantModels).toEqual(["community-1"]));

    expect(result.current.assistantPolicySettings.availableModels).toEqual(modelList.data);
    expect(result.current.assistantPolicyDirty).toBe(false);
  });

  test("saves policy changes and uploads a pending avatar", async () => {
    const { calls } = installAssistantApiMocks();
    const { result } = renderAssistantHook();

    await waitFor(() => expect(result.current.loadingAssistantPolicy).toBe(false));

    const avatarFile = new File(["avatar"], "avatar.png", { type: "image/png" });
    act(() => {
      result.current.setAssistantAvatarFile(avatarFile);
      result.current.setAssistantPolicySettings({
        ...result.current.assistantPolicySettings,
        displayName: "Board Guide",
      });
    });

    expect(result.current.assistantPolicyDirty).toBe(true);

    act(() => {
      result.current.handleSaveAssistantPolicy();
    });

    await waitFor(() => expect(calls.updateAssistantPolicy).toHaveLength(1));

    expect(calls.uploadMedia).toEqual([{ kind: "avatar", file: avatarFile }]);
    expect(calls.updateAssistantPolicy[0]).toEqual({
      communityId: "community-1",
      body: expect.objectContaining({
        avatarRef: "media_uploaded_avatar",
        displayName: "Board Guide",
      }) as ApiCommunityAssistantPolicyUpdate,
    });
    expect(calls.updateAssistantPolicy[0]!.body).not.toHaveProperty("openRouterKeyStatus");
    await waitFor(() => expect(result.current.assistantPolicyDirty).toBe(false));
  });

  test("saves an OpenRouter key and refreshes model options", async () => {
    const { calls, modelList } = installAssistantApiMocks();
    const { result } = renderAssistantHook();

    await waitFor(() => expect(result.current.loadingAssistantPolicy).toBe(false));

    act(() => {
      result.current.handleSaveAssistantOpenRouterKey("sk-or-123456789abc");
    });

    await waitFor(() => expect(calls.saveAssistantCredential).toHaveLength(1));
    await waitFor(() => expect(calls.getAssistantModels).toEqual(["community-1"]));

    expect(calls.saveAssistantCredential[0]).toEqual({
      communityId: "community-1",
      body: { api_key: "sk-or-123456789abc" },
    });
    expect(result.current.assistantPolicySettings.openRouterKeyStatus).toMatchObject({
      kind: "connected",
      last4: "9abc",
    });
    expect(result.current.assistantPolicySettings.availableModels).toEqual(modelList.data);
    expect(result.current.assistantPolicyDirty).toBe(false);
  });

  test("revokes the OpenRouter key without making policy dirty", async () => {
    installAssistantApiMocks();
    const { result } = renderAssistantHook();

    await waitFor(() => expect(result.current.loadingAssistantPolicy).toBe(false));

    act(() => {
      result.current.handleRevokeAssistantOpenRouterKey();
    });

    await waitFor(() => {
      expect(result.current.assistantPolicySettings.openRouterKeyStatus).toEqual({ kind: "missing" });
    });
    expect(result.current.assistantPolicyDirty).toBe(false);
  });

  test("policy update payload excludes frontend-only fields", () => {
    const settings = createDefaultCommunityAssistantPolicySettings();
    const payload = assistantSettingsToPolicyUpdate(settings);

    expect(payload).not.toHaveProperty("avatarPreviewUrl");
    expect(payload).not.toHaveProperty("availableModels");
    expect(payload).not.toHaveProperty("openRouterKeyStatus");
  });
});
