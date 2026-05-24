"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import { toast } from "@/components/primitives/sonner";
import type {
  ApiAssistantOpenRouterKeyStatus,
  ApiCommunityAssistantPolicy,
  ApiCommunityAssistantPolicyResponse,
  ApiCommunityAssistantPolicyUpdate,
} from "@/lib/api/client-api-types";
import { useApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import type {
  AssistantOpenRouterKeyStatus,
  CommunityAssistantPolicyPageProps,
  CommunityAssistantPolicySettings,
} from "@/components/compositions/community/assistant-policy/community-assistant-policy.types";
import { createDefaultCommunityAssistantPolicySettings } from "@/components/compositions/community/assistant-policy/community-assistant-policy.types";

function isFullPolicy(
  policy: ApiCommunityAssistantPolicyResponse,
): policy is ApiCommunityAssistantPolicy {
  return policy.object === "community_assistant_policy";
}

function keyStatusToSettings(
  status: ApiAssistantOpenRouterKeyStatus | AssistantOpenRouterKeyStatus,
): AssistantOpenRouterKeyStatus {
  if (status.kind === "connected") {
    return {
      kind: "connected",
      last4: status.last4,
      ...(status.connectedAt ? { connectedAt: status.connectedAt } : {}),
    };
  }
  if (status.kind === "invalid") {
    return {
      kind: "invalid",
      last4: status.last4,
      message: status.message,
    };
  }
  return { kind: "missing" };
}

export function assistantPolicyToSettings(
  policy: ApiCommunityAssistantPolicyResponse,
): CommunityAssistantPolicySettings {
  const defaults = createDefaultCommunityAssistantPolicySettings();
  if (!isFullPolicy(policy)) {
    return {
      ...defaults,
      enabled: policy.enabled,
      displayName: policy.displayName,
      shortBio: policy.shortBio,
      avatarRef: policy.avatarRef,
      avatarPreviewUrl: policy.avatarRef,
      defaultPrompt: policy.defaultPrompt,
      starterPrompts: policy.starterPrompts,
    };
  }

  return {
    enabled: policy.enabled,
    displayName: policy.displayName,
    shortBio: policy.shortBio,
    avatarRef: policy.avatarRef,
    avatarPreviewUrl: policy.avatarRef,
    systemPrompt: policy.systemPrompt,
    defaultPrompt: policy.defaultPrompt,
    starterPrompts: policy.starterPrompts,
    openRouterKeyStatus: keyStatusToSettings(policy.openRouterKeyStatus),
    selectedModelId: policy.selectedModelId,
    availableModels: policy.availableModels,
    contextMode: policy.contextMode,
    contextSources: {
      ...policy.contextSources,
      communityProfile: true,
      rules: true,
    },
    maxContextThreads: policy.maxContextThreads,
    maxLookbackDays: policy.maxLookbackDays,
    memoryEnabled: policy.memoryEnabled,
    retentionMode: policy.retentionMode,
    retentionDays: policy.retentionDays,
    saveChatsToCommunityDb: policy.saveChatsToCommunityDb,
    actionMode: policy.actionMode,
    requireModeratorApprovalForWrites: policy.requireModeratorApprovalForWrites,
    perUserDailyMessageCap: policy.perUserDailyMessageCap,
    voiceMode: policy.voiceMode,
    sttProvider: policy.sttProvider,
    sttModel: policy.sttModel,
    ttsVoice: policy.ttsVoice,
    includeInSovereignExport: policy.includeInSovereignExport,
  };
}

export function assistantSettingsToPolicyUpdate(
  settings: CommunityAssistantPolicySettings,
): ApiCommunityAssistantPolicyUpdate {
  return {
    enabled: settings.enabled,
    displayName: settings.displayName,
    shortBio: settings.shortBio,
    avatarRef: settings.avatarRef,
    systemPrompt: settings.systemPrompt,
    defaultPrompt: settings.defaultPrompt,
    starterPrompts: settings.starterPrompts,
    selectedModelId: settings.selectedModelId,
    contextMode: settings.contextMode,
    contextSources: {
      ...settings.contextSources,
      communityProfile: true,
      rules: true,
    },
    maxContextThreads: settings.maxContextThreads,
    maxLookbackDays: settings.maxLookbackDays,
    memoryEnabled: settings.memoryEnabled,
    retentionMode: settings.retentionMode,
    retentionDays: settings.retentionDays,
    saveChatsToCommunityDb: settings.saveChatsToCommunityDb,
    actionMode: settings.actionMode,
    requireModeratorApprovalForWrites: settings.requireModeratorApprovalForWrites,
    perUserDailyMessageCap: settings.perUserDailyMessageCap,
    voiceMode: settings.voiceMode,
    sttProvider: settings.sttProvider,
    sttModel: settings.sttModel,
    ttsVoice: settings.ttsVoice,
    includeInSovereignExport: settings.includeInSovereignExport,
  };
}

function policyComparable(settings: CommunityAssistantPolicySettings): string {
  return JSON.stringify(assistantSettingsToPolicyUpdate(settings));
}

function settingsWithModels(
  settings: CommunityAssistantPolicySettings,
  models: CommunityAssistantPolicySettings["availableModels"],
): CommunityAssistantPolicySettings {
  return {
    ...settings,
    availableModels: models.length > 0 ? models : settings.availableModels,
  };
}

export function useCommunityAssistantPolicyState({
  community,
}: {
  community: ApiCommunity | null;
}) {
  const api = useApi();
  const [assistantPolicySettings, setAssistantPolicySettings] =
    React.useState<CommunityAssistantPolicySettings>(() => createDefaultCommunityAssistantPolicySettings());
  const [savedAssistantPolicySettings, setSavedAssistantPolicySettings] =
    React.useState<CommunityAssistantPolicySettings>(() => createDefaultCommunityAssistantPolicySettings());
  const [assistantAvatarFile, setAssistantAvatarFile] = React.useState<File | null>(null);
  const [loadingAssistantPolicy, setLoadingAssistantPolicy] = React.useState(false);
  const [savingAssistantPolicy, setSavingAssistantPolicy] = React.useState(false);
  const [savingAssistantCredential, setSavingAssistantCredential] = React.useState(false);
  const [assistantPolicyLoadError, setAssistantPolicyLoadError] = React.useState<string | null>(null);
  const [assistantPolicySaveError, setAssistantPolicySaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    if (!community) {
      const defaults = createDefaultCommunityAssistantPolicySettings();
      setAssistantPolicySettings(defaults);
      setSavedAssistantPolicySettings(defaults);
      setAssistantAvatarFile(null);
      setLoadingAssistantPolicy(false);
      setAssistantPolicyLoadError(null);
      setAssistantPolicySaveError(null);
      return () => {
        cancelled = true;
      };
    }

    setLoadingAssistantPolicy(true);
    setAssistantPolicyLoadError(null);
    setAssistantPolicySaveError(null);
    void api.communities.getAssistantPolicy(community.id)
      .then((policy) => {
        if (cancelled) {
          return;
        }
        const settings = assistantPolicyToSettings(policy);
        setAssistantPolicySettings(settings);
        setSavedAssistantPolicySettings(settings);
        setAssistantAvatarFile(null);
        if (settings.openRouterKeyStatus.kind === "connected") {
          void api.communities.getAssistantModels(community.id)
            .then((modelList) => {
              if (cancelled) return;
              setAssistantPolicySettings((current) => settingsWithModels(current, modelList.data));
              setSavedAssistantPolicySettings((current) => settingsWithModels(current, modelList.data));
            })
            .catch(() => {
              if (!cancelled) {
                toast.error("Could not load assistant model list.");
              }
            });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setAssistantPolicyLoadError(getErrorMessage(error, "Could not load assistant settings."));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAssistantPolicy(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api.communities, community]);

  const assistantPolicyDirty = React.useMemo(
    () => assistantAvatarFile !== null
      || policyComparable(assistantPolicySettings) !== policyComparable(savedAssistantPolicySettings),
    [assistantAvatarFile, assistantPolicySettings, savedAssistantPolicySettings],
  );

  const refreshAssistantModels = React.useCallback(async (communityId: string) => {
    const modelList = await api.communities.getAssistantModels(communityId);
    setAssistantPolicySettings((current) => settingsWithModels(current, modelList.data));
    setSavedAssistantPolicySettings((current) => settingsWithModels(current, modelList.data));
    return modelList;
  }, [api.communities]);

  const handleSaveAssistantPolicy = React.useCallback(() => {
    if (!community || savingAssistantPolicy) {
      return;
    }

    setAssistantPolicySaveError(null);
    setSavingAssistantPolicy(true);
    void (async () => {
      let settingsToSave = assistantPolicySettings;
      if (assistantAvatarFile) {
        const uploaded = await api.communities.uploadMedia({
          kind: "avatar",
          file: assistantAvatarFile,
        });
        settingsToSave = {
          ...settingsToSave,
          avatarRef: uploaded.media_ref,
          avatarPreviewUrl: uploaded.media_ref,
        };
      }

      const policy = await api.communities.updateAssistantPolicy(
        community.id,
        assistantSettingsToPolicyUpdate(settingsToSave),
      );
      const settings = assistantPolicyToSettings(policy);
      setAssistantPolicySettings(settings);
      setSavedAssistantPolicySettings(settings);
      setAssistantAvatarFile(null);
      toast.success("Assistant settings saved.");
    })()
      .catch((error: unknown) => {
        const message = getErrorMessage(error, "Could not save assistant settings.");
        setAssistantPolicySaveError(message);
        toast.error(message);
      })
      .finally(() => {
        setSavingAssistantPolicy(false);
      });
  }, [
    api.communities,
    assistantAvatarFile,
    assistantPolicySettings,
    community,
    savingAssistantPolicy,
  ]);

  const handleSaveAssistantOpenRouterKey = React.useCallback((apiKey: string) => {
    if (!community || savingAssistantCredential) {
      return;
    }

    setAssistantPolicySaveError(null);
    setSavingAssistantCredential(true);
    void api.communities.saveAssistantCredential(community.id, { api_key: apiKey })
      .then(async (response) => {
        const nextStatus = keyStatusToSettings(response.openRouterKeyStatus);
        setAssistantPolicySettings((current) => ({
          ...current,
          openRouterKeyStatus: nextStatus,
        }));
        setSavedAssistantPolicySettings((current) => ({
          ...current,
          openRouterKeyStatus: nextStatus,
        }));
        if (nextStatus.kind === "connected") {
          await refreshAssistantModels(community.id).catch(() => {
            toast.error("Could not load assistant model list.");
          });
        }
        toast.success("OpenRouter key saved.");
      })
      .catch((error: unknown) => {
        const message = getErrorMessage(error, "Could not save OpenRouter key.");
        setAssistantPolicySaveError(message);
        toast.error(message);
      })
      .finally(() => {
        setSavingAssistantCredential(false);
      });
  }, [api.communities, community, refreshAssistantModels, savingAssistantCredential]);

  const handleRevokeAssistantOpenRouterKey = React.useCallback(() => {
    if (!community || savingAssistantCredential) {
      return;
    }

    setAssistantPolicySaveError(null);
    setSavingAssistantCredential(true);
    void api.communities.revokeAssistantCredential(community.id)
      .then((response) => {
        const nextStatus = keyStatusToSettings(response.openRouterKeyStatus);
        setAssistantPolicySettings((current) => ({
          ...current,
          openRouterKeyStatus: nextStatus,
        }));
        setSavedAssistantPolicySettings((current) => ({
          ...current,
          openRouterKeyStatus: nextStatus,
        }));
        toast.success("OpenRouter key revoked.");
      })
      .catch((error: unknown) => {
        const message = getErrorMessage(error, "Could not revoke OpenRouter key.");
        setAssistantPolicySaveError(message);
        toast.error(message);
      })
      .finally(() => {
        setSavingAssistantCredential(false);
      });
  }, [api.communities, community, savingAssistantCredential]);

  const assistantPolicySubmitState: CommunityAssistantPolicyPageProps["submitState"] =
    savingAssistantPolicy || savingAssistantCredential
      ? { kind: "saving" }
      : assistantPolicySaveError
        ? { kind: "error", message: assistantPolicySaveError }
        : { kind: "idle" };

  return {
    assistantPolicyDirty,
    assistantPolicyLoadError,
    assistantPolicySettings,
    assistantPolicySubmitState,
    handleRevokeAssistantOpenRouterKey,
    handleSaveAssistantOpenRouterKey,
    handleSaveAssistantPolicy,
    loadingAssistantPolicy,
    savingAssistantCredential,
    savingAssistantPolicy,
    setAssistantAvatarFile,
    setAssistantPolicySettings,
  };
}
