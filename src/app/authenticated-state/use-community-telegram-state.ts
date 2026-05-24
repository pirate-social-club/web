"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import type {
  ApiTelegramCommunityBot,
  ApiCommunityTelegramChatSettings,
  ApiCommunityTelegramChatSettingsUpdate,
} from "@/lib/api/client-api-types";
import { useApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import { toast } from "@/components/primitives/sonner";
import type {
  CommunityTelegramIntegrationPageProps,
  CommunityTelegramIntegrationSettings,
} from "@/components/compositions/community/telegram-integration/community-telegram-integration.types";
import { createDefaultTelegramIntegrationSettings } from "@/components/compositions/community/telegram-integration/community-telegram-integration.types";

function telegramSettingsFromApi(
  response: ApiCommunityTelegramChatSettings,
  bot?: ApiTelegramCommunityBot | null,
): CommunityTelegramIntegrationSettings {
  const defaults = createDefaultTelegramIntegrationSettings();
  const botSettings = bot
    ? {
        status: bot.status,
        username: bot.bot_username,
        displayName: bot.bot_display_name,
        tokenLast4: bot.token_last4,
        webhookStatus: bot.webhook_status,
      }
    : defaults.bot;

  if (!response.linked_chat) {
    return {
      ...defaults,
      bot: botSettings,
    };
  }

  return {
    bot: botSettings,
    directoryVisible: response.linked_chat.directory_visible,
    linkedChat: {
      ...defaults.linkedChat,
      status: "connected",
      chatTitle: response.linked_chat.title,
      chatUsername: response.linked_chat.username,
      linkMode: response.linked_chat.link_mode,
      botAdminStatus: response.linked_chat.bot_admin_status,
    },
  };
}

function telegramSettingsToUpdate(
  settings: CommunityTelegramIntegrationSettings,
): ApiCommunityTelegramChatSettingsUpdate {
  return {
    directory_visible: settings.directoryVisible,
    link_mode: settings.linkedChat.linkMode,
  };
}

function comparableTelegramSettings(settings: CommunityTelegramIntegrationSettings): string {
  return JSON.stringify({
    directoryVisible: settings.directoryVisible,
    linkMode: settings.linkedChat.linkMode,
  });
}

function openSetupLink(url: string): boolean {
  return Boolean(window.open(url, "_blank", "noopener,noreferrer"));
}

export function useCommunityTelegramState({
  community,
}: {
  community: ApiCommunity | null;
}) {
  const api = useApi();
  const [telegramSettings, setTelegramSettings] =
    React.useState<CommunityTelegramIntegrationSettings>(() => createDefaultTelegramIntegrationSettings());
  const [savedTelegramSettings, setSavedTelegramSettings] =
    React.useState<CommunityTelegramIntegrationSettings>(() => createDefaultTelegramIntegrationSettings());
  const [loadingTelegram, setLoadingTelegram] = React.useState(false);
  const [savingTelegram, setSavingTelegram] = React.useState(false);
  const [telegramSetupRefreshArmed, setTelegramSetupRefreshArmed] = React.useState(false);
  const [telegramLoadError, setTelegramLoadError] = React.useState<string | null>(null);
  const [telegramSaveError, setTelegramSaveError] = React.useState<string | null>(null);

  const applySettingsResponse = React.useCallback((response: ApiCommunityTelegramChatSettings, bot?: ApiTelegramCommunityBot | null) => {
    const settings = telegramSettingsFromApi(response, bot);
    setTelegramSettings(settings);
    setSavedTelegramSettings(settings);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    if (!community) {
      const defaults = createDefaultTelegramIntegrationSettings();
      setTelegramSettings(defaults);
      setSavedTelegramSettings(defaults);
      setLoadingTelegram(false);
      setTelegramLoadError(null);
      return () => {
        cancelled = true;
      };
    }

    setLoadingTelegram(true);
    setTelegramLoadError(null);
    void Promise.all([
      api.communities.getTelegramChatSettings(community.id),
      api.communities.getTelegramBot(community.id),
    ])
      .then(([response, bot]) => {
        if (!cancelled) {
          applySettingsResponse(response, bot);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setTelegramLoadError(getErrorMessage(error, "Could not load Telegram settings."));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingTelegram(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api.communities, applySettingsResponse, community]);

  React.useEffect(() => {
    if (!community || !telegramSetupRefreshArmed) {
      return;
    }

    let cancelled = false;
    const refreshAfterSetup = () => {
      if (cancelled) {
        return;
      }
      setTelegramSetupRefreshArmed(false);
      setLoadingTelegram(true);
      setTelegramLoadError(null);
      void Promise.all([
        api.communities.getTelegramChatSettings(community.id),
        api.communities.getTelegramBot(community.id),
      ])
        .then(([response, bot]) => {
          if (!cancelled) {
            applySettingsResponse(response, bot);
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setTelegramLoadError(getErrorMessage(error, "Could not load Telegram settings."));
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoadingTelegram(false);
          }
        });
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refreshAfterSetup();
      }
    };

    window.addEventListener("focus", refreshAfterSetup);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshAfterSetup);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [api.communities, applySettingsResponse, community, telegramSetupRefreshArmed]);

  const telegramDirty = React.useMemo(
    () => comparableTelegramSettings(telegramSettings) !== comparableTelegramSettings(savedTelegramSettings),
    [savedTelegramSettings, telegramSettings],
  );

  const handleConnectTelegramChat = React.useCallback(() => {
    if (!community) {
      return;
    }

    setTelegramSaveError(null);
    void api.communities.createTelegramSetupIntent(community.id)
      .then((intent) => {
        if (!intent.bot_deep_link) {
          toast.error("Save a Telegram bot token before connecting a chat.");
          return;
        }
        const botDeepLink = intent.bot_deep_link;
        setTelegramSetupRefreshArmed(true);
        const opened = openSetupLink(botDeepLink);
        if (opened) {
          toast.success("Telegram setup opened.");
          return;
        }
        toast.warning("Browser blocked Telegram setup.", {
          action: {
            label: "Open Telegram",
            onClick: () => {
              openSetupLink(botDeepLink);
            },
          },
        });
      })
      .catch((error: unknown) => {
        toast.error(getErrorMessage(error, "Could not start Telegram setup."));
      });
  }, [api.communities, community]);

  const handleSaveTelegramBotToken = React.useCallback((botToken: string) => {
    if (!community) {
      return;
    }
    setTelegramSaveError(null);
    setSavingTelegram(true);
    void Promise.all([
      api.communities.saveTelegramBot(community.id, { bot_token: botToken }),
      api.communities.getTelegramChatSettings(community.id),
    ])
      .then(([bot, settings]) => {
        applySettingsResponse(settings, bot);
        toast.success("Telegram bot saved.");
      })
      .catch((error: unknown) => {
        const message = getErrorMessage(error, "Could not save Telegram bot.");
        setTelegramSaveError(message);
        toast.error(message);
      })
      .finally(() => {
        setSavingTelegram(false);
      });
  }, [api.communities, applySettingsResponse, community]);

  const handleRevokeTelegramBot = React.useCallback(() => {
    if (!community) {
      return;
    }
    setTelegramSaveError(null);
    setSavingTelegram(true);
    void Promise.all([
      api.communities.revokeTelegramBot(community.id),
      api.communities.getTelegramChatSettings(community.id),
    ])
      .then(([bot, settings]) => {
        applySettingsResponse(settings, bot);
        toast.success("Telegram bot revoked.");
      })
      .catch((error: unknown) => {
        const message = getErrorMessage(error, "Could not revoke Telegram bot.");
        setTelegramSaveError(message);
        toast.error(message);
      })
      .finally(() => {
        setSavingTelegram(false);
      });
  }, [api.communities, applySettingsResponse, community]);

  const handleSaveTelegramChat = React.useCallback(() => {
    if (!community || savingTelegram || telegramSettings.linkedChat.status !== "connected") {
      return;
    }

    setTelegramSaveError(null);
    setSavingTelegram(true);
    void api.communities.updateTelegramChatSettings(
      community.id,
      telegramSettingsToUpdate(telegramSettings),
    )
      .then((response) => {
        applySettingsResponse(response);
        toast.success("Telegram settings updated.");
      })
      .catch((error: unknown) => {
        const message = getErrorMessage(error, "Could not save Telegram settings.");
        setTelegramSaveError(message);
        toast.error(message);
      })
      .finally(() => {
        setSavingTelegram(false);
      });
  }, [api.communities, applySettingsResponse, community, savingTelegram, telegramSettings]);

  const telegramSubmitState: CommunityTelegramIntegrationPageProps["submitState"] = savingTelegram
    ? { kind: "saving" }
    : telegramSaveError
      ? { kind: "error", message: telegramSaveError }
      : { kind: "idle" };

  return {
    handleConnectTelegramChat,
    handleRevokeTelegramBot,
    handleSaveTelegramChat,
    handleSaveTelegramBotToken,
    loadingTelegram,
    savingTelegram,
    setTelegramSettings,
    telegramDirty,
    telegramLoadError,
    telegramSettings,
    telegramSubmitState,
  };
}
