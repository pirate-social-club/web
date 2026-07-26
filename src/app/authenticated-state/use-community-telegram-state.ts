"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import type {
  ApiTelegramChannelDestination,
  ApiTelegramCommunityBot,
  ApiCommunityTelegramChatSettings,
  ApiCommunityTelegramChatSettingsUpdate,
} from "@/lib/api/client-api-types";
import { useApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { buildTelegramCommunityJoinUrl } from "@/lib/telegram-community-join";
import { getErrorMessage } from "@/lib/error-utils";
import { toast } from "@/components/primitives/sonner";
import type {
  CommunityTelegramIntegrationPageProps,
  CommunityTelegramIntegrationSettings,
  TelegramBroadcastChannelInfo,
  TelegramBroadcastChannelSectionProps,
  TelegramBroadcastChannelState,
} from "@/components/compositions/community/telegram-integration/community-telegram-integration.types";
import {
  createDefaultTelegramIntegrationSettings,
  TELEGRAM_CHANNEL_BACKFILL_LIMIT,
} from "@/components/compositions/community/telegram-integration/community-telegram-integration.types";

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

function telegramChannelInfoFromApi(
  destination: ApiTelegramChannelDestination,
): TelegramBroadcastChannelInfo {
  return {
    linkedAt: destination.linked_at,
    publicationMode: destination.publication_mode,
    title: destination.title,
    username: destination.username,
  };
}

// Maps setup-intent / backfill / unlink failures to owner-friendly copy.
// Raw provider and SQL errors must never reach the UI: anything unrecognized
// collapses to the caller's friendly fallback.
export function telegramChannelErrorMessage(error: unknown, fallback: string): string {
  const code = error instanceof ApiError ? error.code : "";
  const status = error instanceof ApiError ? error.status : null;
  const haystack = `${code} ${getErrorMessage(error, "")}`.toLowerCase();

  if (
    status === 409
    || haystack.includes("already_connected")
    || haystack.includes("already connected")
    || haystack.includes("another community")
  ) {
    return "This channel is already connected to another Pirate community.";
  }
  if (haystack.includes("expired")) {
    return "The request expired. Start again.";
  }
  if (
    haystack.includes("not_a_channel")
    || haystack.includes("not a channel")
    || haystack.includes("chat_type")
  ) {
    return "Select a Telegram broadcast channel.";
  }
  if (
    status === 403
    || haystack.includes("admin")
    || haystack.includes("permission")
    || haystack.includes("forbidden")
  ) {
    return "Make the bot a channel administrator with permission to post.";
  }
  if (haystack.includes("bot") && (haystack.includes("required") || haystack.includes("missing"))) {
    return "Connect the community bot first.";
  }
  return fallback;
}

type TelegramChannelAction =
  | { type: "loaded"; channel: TelegramBroadcastChannelInfo | null }
  | { type: "connect_started" }
  | { type: "intent_created"; deepLink: string; expiresAt: number }
  | { type: "connect_failed"; message: string }
  | { type: "check_started" }
  | { type: "check_found"; channel: TelegramBroadcastChannelInfo }
  | { type: "check_miss" }
  | { type: "cancel_setup" }
  | { type: "backfill_requested" }
  | { type: "backfill_canceled" }
  | { type: "backfill_started" }
  | { type: "backfill_succeeded"; enqueued: number }
  | { type: "backfill_failed"; message: string }
  | { type: "backfill_notice_done" }
  | { type: "disconnect_requested" }
  | { type: "disconnect_canceled" }
  | { type: "disconnect_started" }
  | { type: "disconnect_succeeded" }
  | { type: "disconnect_failed"; message: string };

function telegramChannelFromState(state: TelegramBroadcastChannelState): TelegramBroadcastChannelInfo | null {
  return "channel" in state ? state.channel : null;
}

function telegramChannelReducer(
  state: TelegramBroadcastChannelState,
  action: TelegramChannelAction,
): TelegramBroadcastChannelState {
  switch (action.type) {
    case "loaded":
      if (action.channel) {
        return { kind: "connected", channel: action.channel };
      }
      // A background reload must not strand an in-progress setup flow.
      return state.kind === "awaiting_telegram" || state.kind === "creating_intent"
        ? state
        : { kind: "unconnected" };
    case "connect_started":
      return { kind: "creating_intent" };
    case "intent_created":
      return {
        kind: "awaiting_telegram",
        checking: false,
        deepLink: action.deepLink,
        expiresAt: action.expiresAt,
      };
    case "connect_failed":
      return { kind: "error", channel: null, message: action.message };
    case "check_started":
      return state.kind === "awaiting_telegram" ? { ...state, checking: true } : state;
    case "check_found":
      return { kind: "connected", channel: action.channel };
    case "check_miss":
      return state.kind === "awaiting_telegram" ? { ...state, checking: false } : state;
    case "cancel_setup":
      return { kind: "unconnected" };
    case "backfill_requested": {
      const channel = telegramChannelFromState(state);
      return channel ? { kind: "backfill_confirm", channel } : state;
    }
    case "backfill_canceled":
      return state.kind === "backfill_confirm" ? { kind: "connected", channel: state.channel } : state;
    case "backfill_started":
      return state.kind === "backfill_confirm" ? { kind: "backfilling", channel: state.channel } : state;
    case "backfill_succeeded":
      return state.kind === "backfilling"
        ? { kind: "backfill_queued", channel: state.channel, enqueued: action.enqueued }
        : state;
    case "backfill_failed":
      return { kind: "error", channel: telegramChannelFromState(state), message: action.message };
    case "backfill_notice_done":
      return state.kind === "backfill_queued" ? { kind: "connected", channel: state.channel } : state;
    case "disconnect_requested": {
      const channel = telegramChannelFromState(state);
      return channel ? { kind: "disconnect_confirm", channel } : state;
    }
    case "disconnect_canceled":
      return state.kind === "disconnect_confirm" ? { kind: "connected", channel: state.channel } : state;
    case "disconnect_started":
      return state.kind === "disconnect_confirm" ? { kind: "disconnecting", channel: state.channel } : state;
    case "disconnect_succeeded":
      return { kind: "unconnected" };
    case "disconnect_failed":
      return { kind: "error", channel: telegramChannelFromState(state), message: action.message };
    default:
      return state;
  }
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
  const [telegramChannelState, dispatchTelegramChannel] = React.useReducer(
    telegramChannelReducer,
    { kind: "loading" },
  );
  const telegramChannelConnectInFlightRef = React.useRef(false);
  const telegramChannelCheckInFlightRef = React.useRef(false);
  const telegramChannelBackfillInFlightRef = React.useRef(false);
  const telegramChannelDisconnectInFlightRef = React.useRef(false);

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
      dispatchTelegramChannel({ type: "loaded", channel: null });
      return () => {
        cancelled = true;
      };
    }

    setLoadingTelegram(true);
    setTelegramLoadError(null);
    void Promise.all([
      api.communities.getTelegramChatSettings(community.id),
      api.communities.getTelegramBot(community.id),
      api.communities.getTelegramChannel(community.id),
    ])
      .then(([response, bot, channelDestination]) => {
        if (!cancelled) {
          applySettingsResponse(response, bot);
          dispatchTelegramChannel({
            type: "loaded",
            channel: channelDestination ? telegramChannelInfoFromApi(channelDestination) : null,
          });
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

  const checkTelegramChannelConnection = React.useCallback((options?: { silent?: boolean }) => {
    if (!community || telegramChannelCheckInFlightRef.current) {
      return;
    }

    telegramChannelCheckInFlightRef.current = true;
    dispatchTelegramChannel({ type: "check_started" });
    void api.communities.getTelegramChannel(community.id)
      .then((destination) => {
        if (destination) {
          dispatchTelegramChannel({ type: "check_found", channel: telegramChannelInfoFromApi(destination) });
          toast.success("Telegram channel connected.");
          return;
        }
        dispatchTelegramChannel({ type: "check_miss" });
        if (!options?.silent) {
          toast.info("No channel connected yet. Complete the connection in Telegram.");
        }
      })
      .catch((error: unknown) => {
        // A failed or unrelated refetch must not strand the owner: stay in the
        // awaiting state so the manual "Check connection" remains available.
        dispatchTelegramChannel({ type: "check_miss" });
        if (!options?.silent) {
          toast.error(telegramChannelErrorMessage(error, "Could not check the Telegram channel connection."));
        }
      })
      .finally(() => {
        telegramChannelCheckInFlightRef.current = false;
      });
  }, [api.communities, community]);

  const awaitingTelegramChannel = telegramChannelState.kind === "awaiting_telegram";

  React.useEffect(() => {
    if (!community || !awaitingTelegramChannel) {
      return;
    }

    let cancelled = false;
    const refreshAfterSetup = () => {
      if (!cancelled) {
        checkTelegramChannelConnection({ silent: true });
      }
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
  }, [awaitingTelegramChannel, checkTelegramChannelConnection, community]);

  const telegramChannelBackfillQueued = telegramChannelState.kind === "backfill_queued";

  React.useEffect(() => {
    if (!telegramChannelBackfillQueued) {
      return;
    }

    const timeout = setTimeout(() => {
      dispatchTelegramChannel({ type: "backfill_notice_done" });
    }, 5000);

    return () => {
      clearTimeout(timeout);
    };
  }, [telegramChannelBackfillQueued]);

  const telegramDirty = React.useMemo(
    () => comparableTelegramSettings(telegramSettings) !== comparableTelegramSettings(savedTelegramSettings),
    [savedTelegramSettings, telegramSettings],
  );
  const telegramJoinUrl = React.useMemo(
    () => buildTelegramCommunityJoinUrl({ communityId: community?.id }),
    [community?.id],
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

  const telegramChannelBotConnected = telegramSettings.bot.status === "connected";

  const handleConnectTelegramChannel = React.useCallback(() => {
    if (!community || telegramChannelConnectInFlightRef.current) {
      return;
    }
    if (telegramSettings.bot.status !== "connected") {
      toast.error("Connect the community bot first.");
      return;
    }

    telegramChannelConnectInFlightRef.current = true;
    dispatchTelegramChannel({ type: "connect_started" });
    void api.communities.createTelegramChannelSetupIntent(community.id)
      .then((intent) => {
        if (!intent.bot_deep_link) {
          dispatchTelegramChannel({ type: "connect_failed", message: "Connect the community bot first." });
          toast.error("Connect the community bot first.");
          return;
        }
        const botDeepLink = intent.bot_deep_link;
        dispatchTelegramChannel({ type: "intent_created", deepLink: botDeepLink, expiresAt: intent.expires_at });
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
        const message = telegramChannelErrorMessage(error, "Could not start Telegram channel setup.");
        dispatchTelegramChannel({ type: "connect_failed", message });
        toast.error(message);
      })
      .finally(() => {
        telegramChannelConnectInFlightRef.current = false;
      });
  }, [api.communities, community, telegramSettings.bot.status]);

  const handleOpenTelegramChannelAgain = React.useCallback(() => {
    if (telegramChannelState.kind !== "awaiting_telegram") {
      return;
    }
    openSetupLink(telegramChannelState.deepLink);
  }, [telegramChannelState]);

  const handleCancelTelegramChannelSetup = React.useCallback(() => {
    // Server-side intent cancellation is intentionally not wired: the intent
    // expires on its own (~10 min TTL). This only resets the local UI.
    dispatchTelegramChannel({ type: "cancel_setup" });
  }, []);

  const handleRequestTelegramChannelBackfill = React.useCallback(() => {
    dispatchTelegramChannel({ type: "backfill_requested" });
  }, []);

  const handleCancelTelegramChannelBackfill = React.useCallback(() => {
    dispatchTelegramChannel({ type: "backfill_canceled" });
  }, []);

  const handleConfirmTelegramChannelBackfill = React.useCallback(() => {
    if (
      !community
      || telegramChannelState.kind !== "backfill_confirm"
      || telegramChannelBackfillInFlightRef.current
    ) {
      return;
    }

    telegramChannelBackfillInFlightRef.current = true;
    dispatchTelegramChannel({ type: "backfill_started" });
    void api.communities.backfillTelegramChannel(community.id, { limit: TELEGRAM_CHANNEL_BACKFILL_LIMIT })
      .then((result) => {
        dispatchTelegramChannel({ type: "backfill_succeeded", enqueued: result.enqueued });
        const count = result.enqueued;
        toast.success(`${count} ${count === 1 ? "post" : "posts"} queued for publication. They will appear gradually in Telegram.`);
      })
      .catch((error: unknown) => {
        const message = telegramChannelErrorMessage(error, "Could not queue posts for publication.");
        dispatchTelegramChannel({ type: "backfill_failed", message });
        toast.error(message);
      })
      .finally(() => {
        telegramChannelBackfillInFlightRef.current = false;
      });
  }, [api.communities, community, telegramChannelState.kind]);

  const handleRequestTelegramChannelDisconnect = React.useCallback(() => {
    dispatchTelegramChannel({ type: "disconnect_requested" });
  }, []);

  const handleCancelTelegramChannelDisconnect = React.useCallback(() => {
    dispatchTelegramChannel({ type: "disconnect_canceled" });
  }, []);

  const handleConfirmTelegramChannelDisconnect = React.useCallback(() => {
    if (
      !community
      || telegramChannelState.kind !== "disconnect_confirm"
      || telegramChannelDisconnectInFlightRef.current
    ) {
      return;
    }

    telegramChannelDisconnectInFlightRef.current = true;
    dispatchTelegramChannel({ type: "disconnect_started" });
    void api.communities.unlinkTelegramChannel(community.id)
      .then(() => {
        dispatchTelegramChannel({ type: "disconnect_succeeded" });
        toast.success("Telegram channel disconnected.");
      })
      .catch((error: unknown) => {
        const message = telegramChannelErrorMessage(error, "Could not disconnect the Telegram channel.");
        dispatchTelegramChannel({ type: "disconnect_failed", message });
        toast.error(message);
      })
      .finally(() => {
        telegramChannelDisconnectInFlightRef.current = false;
      });
  }, [api.communities, community, telegramChannelState.kind]);

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

  const telegramChannelSectionProps: TelegramBroadcastChannelSectionProps = {
    botConnected: telegramChannelBotConnected,
    onCancelBackfill: handleCancelTelegramChannelBackfill,
    onCancelDisconnect: handleCancelTelegramChannelDisconnect,
    onCancelSetup: handleCancelTelegramChannelSetup,
    onCheckConnection: checkTelegramChannelConnection,
    onConfirmBackfill: handleConfirmTelegramChannelBackfill,
    onConfirmDisconnect: handleConfirmTelegramChannelDisconnect,
    onConnect: handleConnectTelegramChannel,
    onOpenTelegramAgain: handleOpenTelegramChannelAgain,
    onRequestBackfill: handleRequestTelegramChannelBackfill,
    onRequestDisconnect: handleRequestTelegramChannelDisconnect,
    state: telegramChannelState,
  };

  return {
    handleConnectTelegramChat,
    handleRevokeTelegramBot,
    handleSaveTelegramChat,
    handleSaveTelegramBotToken,
    loadingTelegram,
    savingTelegram,
    setTelegramSettings,
    telegramChannelSectionProps,
    telegramDirty,
    telegramJoinUrl,
    telegramLoadError,
    telegramSettings,
    telegramSubmitState,
  };
}
