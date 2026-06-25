"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import { toast } from "@/components/primitives/sonner";
import type {
  ApiAssistantElevenLabsKeyStatus,
  ApiAssistantOpenRouterKeyStatus,
  ApiCommunityAssistantPolicy,
  ApiCommunityAssistantPolicyResponse,
  ApiCommunityAssistantPolicyUpdate,
} from "@/lib/api/client-api-types";
import { useApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import { logger } from "@/lib/logger";
import type {
  AssistantElevenLabsKeyStatus,
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
  status:
    | ApiAssistantOpenRouterKeyStatus
    | ApiAssistantElevenLabsKeyStatus
    | AssistantOpenRouterKeyStatus
    | AssistantElevenLabsKeyStatus
    | null
    | undefined,
): AssistantOpenRouterKeyStatus {
  if (!status) {
    return { kind: "missing" };
  }
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
    elevenLabsKeyStatus: keyStatusToSettings(policy.elevenLabsKeyStatus),
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
    telegramPrivateAssistantEnabled: policy.telegramPrivateAssistantEnabled,
    telegramPreviewEnabled: policy.telegramPreviewEnabled,
    telegramPreviewDailyCap: policy.telegramPreviewDailyCap,
    telegramPreviewPromptSuffix: policy.telegramPreviewPromptSuffix ?? defaults.telegramPreviewPromptSuffix,
    voiceMode: policy.voiceMode,
    sttProvider: policy.sttProvider,
    sttModel: policy.sttModel,
    ttsProvider: policy.ttsProvider,
    ttsVoice: policy.ttsVoice,
    includeInSovereignExport: policy.includeInSovereignExport,
  };
}

export function assistantSettingsToPolicyUpdate(
  settings: CommunityAssistantPolicySettings,
): ApiCommunityAssistantPolicyUpdate {
  const voiceEnabled = settings.voiceMode !== "off";
  const scribeModel = settings.sttProvider === "elevenlabs"
    && settings.sttModel.trim()
    && settings.sttModel !== "voxtral-mini-latest"
    && settings.sttModel !== "whisper-1"
    ? settings.sttModel.trim()
    : "scribe_v2";
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
    memoryEnabled: true,
    retentionMode: "per_user_private",
    retentionDays: settings.retentionDays,
    saveChatsToCommunityDb: true,
    actionMode: "answer_only",
    requireModeratorApprovalForWrites: true,
    perUserDailyMessageCap: settings.perUserDailyMessageCap,
    telegramPrivateAssistantEnabled: settings.telegramPrivateAssistantEnabled,
    telegramPreviewEnabled: settings.telegramPreviewEnabled,
    telegramPreviewDailyCap: settings.telegramPreviewDailyCap,
    telegramPreviewPromptSuffix: settings.telegramPreviewPromptSuffix,
    voiceMode: settings.voiceMode,
    sttProvider: voiceEnabled ? "elevenlabs" : settings.sttProvider,
    sttModel: voiceEnabled ? scribeModel : settings.sttModel,
    ttsProvider: settings.ttsProvider,
    ttsVoice: settings.ttsVoice,
    includeInSovereignExport: true,
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
    logger.info("[community-assistant-policy] load:start", {
      communityId: community.id,
      displayName: community.display_name,
    });
    void api.communities.getAssistantPolicy(community.id)
      .then((policy) => {
        if (cancelled) {
          return;
        }
        const settings = assistantPolicyToSettings(policy);
        logger.info("[community-assistant-policy] load:success", {
          communityId: community.id,
          enabled: settings.enabled,
          openRouterKeyStatus: settings.openRouterKeyStatus.kind,
          elevenLabsKeyStatus: settings.elevenLabsKeyStatus.kind,
          selectedModelId: settings.selectedModelId,
          voiceMode: settings.voiceMode,
          sttProvider: settings.sttProvider,
          ttsProvider: settings.ttsProvider,
          ttsVoiceConfigured: Boolean(settings.ttsVoice.trim()),
        });
        setAssistantPolicySettings(settings);
        setSavedAssistantPolicySettings(settings);
        setAssistantAvatarFile(null);
        if (settings.openRouterKeyStatus.kind === "connected") {
          logger.info("[community-assistant-policy] models:load:start", {
            communityId: community.id,
          });
          void api.communities.getAssistantModels(community.id)
            .then((modelList) => {
              if (cancelled) return;
              logger.info("[community-assistant-policy] models:load:success", {
                communityId: community.id,
                modelCount: modelList.data.length,
                selectedModelId: settings.selectedModelId,
              });
              setAssistantPolicySettings((current) => settingsWithModels(current, modelList.data));
              setSavedAssistantPolicySettings((current) => settingsWithModels(current, modelList.data));
            })
            .catch((error: unknown) => {
              if (!cancelled) {
                logger.warn("[community-assistant-policy] models:load:failed", {
                  communityId: community.id,
                  message: getErrorMessage(error, "Could not load assistant model list."),
                });
                toast.error("Could not load assistant model list.");
              }
            });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = getErrorMessage(error, "Could not load assistant settings.");
          logger.warn("[community-assistant-policy] load:failed", {
            communityId: community.id,
            message,
          });
          setAssistantPolicyLoadError(message);
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
    logger.info("[community-assistant-policy] save:start", {
      communityId: community.id,
      enabled: assistantPolicySettings.enabled,
      selectedModelId: assistantPolicySettings.selectedModelId,
      voiceMode: assistantPolicySettings.voiceMode,
      sttProvider: assistantPolicySettings.sttProvider,
      ttsProvider: assistantPolicySettings.ttsProvider,
      ttsVoiceConfigured: Boolean(assistantPolicySettings.ttsVoice.trim()),
    });
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
      logger.info("[community-assistant-policy] save:success", {
        communityId: community.id,
        enabled: settings.enabled,
        selectedModelId: settings.selectedModelId,
        voiceMode: settings.voiceMode,
        sttProvider: settings.sttProvider,
        ttsProvider: settings.ttsProvider,
        ttsVoiceConfigured: Boolean(settings.ttsVoice.trim()),
      });
      setAssistantPolicySettings(settings);
      setSavedAssistantPolicySettings(settings);
      setAssistantAvatarFile(null);
      toast.success("Assistant settings saved.");
    })()
      .catch((error: unknown) => {
        const message = getErrorMessage(error, "Could not save assistant settings.");
        logger.warn("[community-assistant-policy] save:failed", {
          communityId: community.id,
          message,
        });
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
    logger.info("[community-assistant-policy] credential:save:start", {
      communityId: community.id,
      provider: "openrouter",
    });
    void api.communities.saveAssistantCredential(community.id, { provider: "openrouter", api_key: apiKey })
      .then(async (response) => {
        if (response.provider !== "openrouter") {
          throw new Error("Unexpected credential provider response.");
        }
        const nextStatus = keyStatusToSettings(response.openRouterKeyStatus);
        setAssistantPolicySettings((current) => ({
          ...current,
          openRouterKeyStatus: nextStatus,
        }));
        setSavedAssistantPolicySettings((current) => ({
          ...current,
          openRouterKeyStatus: nextStatus,
        }));
        logger.info("[community-assistant-policy] credential:save:success", {
          communityId: community.id,
          provider: "openrouter",
          status: nextStatus.kind,
          last4: nextStatus.kind === "connected" || nextStatus.kind === "invalid" ? nextStatus.last4 : null,
        });
        if (nextStatus.kind === "connected") {
          await refreshAssistantModels(community.id).catch(() => {
            toast.error("Could not load assistant model list.");
          });
        }
        toast.success("OpenRouter key saved.");
      })
      .catch((error: unknown) => {
        const message = getErrorMessage(error, "Could not save OpenRouter key.");
        logger.warn("[community-assistant-policy] credential:save:failed", {
          communityId: community.id,
          provider: "openrouter",
          message,
        });
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
    logger.info("[community-assistant-policy] credential:revoke:start", {
      communityId: community.id,
      provider: "openrouter",
    });
    void api.communities.revokeAssistantCredential(community.id, { provider: "openrouter" })
      .then((response) => {
        if (response.provider !== "openrouter") {
          throw new Error("Unexpected credential provider response.");
        }
        const nextStatus = keyStatusToSettings(response.openRouterKeyStatus);
        setAssistantPolicySettings((current) => ({
          ...current,
          openRouterKeyStatus: nextStatus,
        }));
        setSavedAssistantPolicySettings((current) => ({
          ...current,
          openRouterKeyStatus: nextStatus,
        }));
        logger.info("[community-assistant-policy] credential:revoke:success", {
          communityId: community.id,
          provider: "openrouter",
          status: nextStatus.kind,
        });
        toast.success("OpenRouter key revoked.");
      })
      .catch((error: unknown) => {
        const message = getErrorMessage(error, "Could not revoke OpenRouter key.");
        logger.warn("[community-assistant-policy] credential:revoke:failed", {
          communityId: community.id,
          provider: "openrouter",
          message,
        });
        setAssistantPolicySaveError(message);
        toast.error(message);
      })
      .finally(() => {
        setSavingAssistantCredential(false);
      });
  }, [api.communities, community, savingAssistantCredential]);

  const handleSaveAssistantElevenLabsKey = React.useCallback((apiKey: string) => {
    if (!community || savingAssistantCredential) {
      return;
    }

    setAssistantPolicySaveError(null);
    setSavingAssistantCredential(true);
    logger.info("[community-assistant-policy] credential:save:start", {
      communityId: community.id,
      provider: "elevenlabs",
    });
    void api.communities.saveAssistantCredential(community.id, { provider: "elevenlabs", api_key: apiKey })
      .then((response) => {
        if (response.provider !== "elevenlabs") {
          throw new Error("Unexpected credential provider response.");
        }
        const nextStatus = keyStatusToSettings(response.elevenLabsKeyStatus);
        setAssistantPolicySettings((current) => ({
          ...current,
          elevenLabsKeyStatus: nextStatus,
        }));
        setSavedAssistantPolicySettings((current) => ({
          ...current,
          elevenLabsKeyStatus: nextStatus,
        }));
        logger.info("[community-assistant-policy] credential:save:success", {
          communityId: community.id,
          provider: "elevenlabs",
          status: nextStatus.kind,
          last4: nextStatus.kind === "connected" || nextStatus.kind === "invalid" ? nextStatus.last4 : null,
        });
        toast.success("ElevenLabs key saved.");
      })
      .catch((error: unknown) => {
        const message = getErrorMessage(error, "Could not save ElevenLabs key.");
        logger.warn("[community-assistant-policy] credential:save:failed", {
          communityId: community.id,
          provider: "elevenlabs",
          message,
        });
        setAssistantPolicySaveError(message);
        toast.error(message);
      })
      .finally(() => {
        setSavingAssistantCredential(false);
      });
  }, [api.communities, community, savingAssistantCredential]);

  const handleRevokeAssistantElevenLabsKey = React.useCallback(() => {
    if (!community || savingAssistantCredential) {
      return;
    }

    setAssistantPolicySaveError(null);
    setSavingAssistantCredential(true);
    logger.info("[community-assistant-policy] credential:revoke:start", {
      communityId: community.id,
      provider: "elevenlabs",
    });
    void api.communities.revokeAssistantCredential(community.id, { provider: "elevenlabs" })
      .then((response) => {
        if (response.provider !== "elevenlabs") {
          throw new Error("Unexpected credential provider response.");
        }
        const nextStatus = keyStatusToSettings(response.elevenLabsKeyStatus);
        setAssistantPolicySettings((current) => ({
          ...current,
          elevenLabsKeyStatus: nextStatus,
        }));
        setSavedAssistantPolicySettings((current) => ({
          ...current,
          elevenLabsKeyStatus: nextStatus,
        }));
        logger.info("[community-assistant-policy] credential:revoke:success", {
          communityId: community.id,
          provider: "elevenlabs",
          status: nextStatus.kind,
        });
        toast.success("ElevenLabs key revoked.");
      })
      .catch((error: unknown) => {
        const message = getErrorMessage(error, "Could not revoke ElevenLabs key.");
        logger.warn("[community-assistant-policy] credential:revoke:failed", {
          communityId: community.id,
          provider: "elevenlabs",
          message,
        });
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
    handleRevokeAssistantElevenLabsKey,
    handleRevokeAssistantOpenRouterKey,
    handleSaveAssistantElevenLabsKey,
    handleSaveAssistantOpenRouterKey,
    handleSaveAssistantPolicy,
    loadingAssistantPolicy,
    savingAssistantCredential,
    savingAssistantPolicy,
    setAssistantAvatarFile,
    setAssistantPolicySettings,
  };
}
