export type TelegramLinkedChatLinkMode = "invite_link" | "join_request";

export type TelegramBotAdminStatus =
  | "unknown"
  | "ready"
  | "missing"
  | "insufficient_permissions"
  | "left_chat";

interface TelegramLinkedChatSettings {
  status: "not_connected" | "connected";
  chatTitle: string | null;
  chatUsername: string | null;
  chatType: "group" | "supergroup" | null;
  linkMode: TelegramLinkedChatLinkMode;
  botAdminStatus: TelegramBotAdminStatus;
}

export interface CommunityTelegramIntegrationSettings {
  bot: {
    status: "missing" | "connected" | "invalid";
    username: string | null;
    displayName: string | null;
    tokenLast4: string | null;
    webhookStatus: "pending" | "active" | "failed" | "disabled" | null;
  };
  directoryVisible: boolean;
  linkedChat: TelegramLinkedChatSettings;
}

type CommunityTelegramIntegrationSubmitState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "error"; message: string };

export type TelegramChannelPublicationMode = "off" | "from_now" | "recent_backfill";

export interface TelegramBroadcastChannelInfo {
  title: string;
  username: string | null;
  publicationMode: TelegramChannelPublicationMode;
  linkedAt: number;
}

// Explicit UI state model for the broadcast-channel section. Drives rendering
// directly — never infer state from button labels or in-flight flags.
export type TelegramBroadcastChannelState =
  | { kind: "loading" }
  | { kind: "unconnected" }
  | { kind: "creating_intent" }
  | { kind: "awaiting_telegram"; checking: boolean; deepLink: string; expiresAt: number }
  | { kind: "connected"; channel: TelegramBroadcastChannelInfo }
  | { kind: "backfill_confirm"; channel: TelegramBroadcastChannelInfo }
  | { kind: "backfilling"; channel: TelegramBroadcastChannelInfo }
  | { kind: "backfill_queued"; channel: TelegramBroadcastChannelInfo; enqueued: number }
  | { kind: "disconnect_confirm"; channel: TelegramBroadcastChannelInfo }
  | { kind: "disconnecting"; channel: TelegramBroadcastChannelInfo }
  | { kind: "error"; message: string; channel: TelegramBroadcastChannelInfo | null };

export interface TelegramBroadcastChannelSectionProps {
  state: TelegramBroadcastChannelState;
  botConnected: boolean;
  onConnect?: () => void;
  onOpenTelegramAgain?: () => void;
  onCheckConnection?: () => void;
  onCancelSetup?: () => void;
  onRequestBackfill?: () => void;
  onConfirmBackfill?: () => void;
  onCancelBackfill?: () => void;
  onRequestDisconnect?: () => void;
  onConfirmDisconnect?: () => void;
  onCancelDisconnect?: () => void;
}

// Fixed backfill batch size. Used by the settings hook for the API call and by
// the section for the confirmation copy — keep the two in sync here.
export const TELEGRAM_CHANNEL_BACKFILL_LIMIT = 20;

export interface CommunityTelegramIntegrationPageProps {
  settings: CommunityTelegramIntegrationSettings;
  submitState: CommunityTelegramIntegrationSubmitState;
  channel?: TelegramBroadcastChannelSectionProps | null;
  className?: string;
  joinUrl?: string | null;
  studyMiniAppUrl?: string | null;
  onConnectChat?: () => void;
  onRevokeBot?: () => void;
  onRefreshBotWebhook?: () => void;
  onSave?: () => void;
  onSaveBotToken?: (token: string) => void;
  onSettingsChange?: (settings: CommunityTelegramIntegrationSettings) => void;
  webhookRefreshPending?: boolean;
  saveDisabled?: boolean;
}

export function createDefaultTelegramIntegrationSettings(): CommunityTelegramIntegrationSettings {
  return {
    bot: {
      status: "missing",
      username: null,
      displayName: null,
      tokenLast4: null,
      webhookStatus: null,
    },
    directoryVisible: true,
    linkedChat: {
      status: "not_connected",
      chatTitle: null,
      chatUsername: null,
      chatType: null,
      linkMode: "join_request",
      botAdminStatus: "unknown",
    },
  };
}
