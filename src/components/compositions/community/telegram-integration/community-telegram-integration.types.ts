export type TelegramLinkedChatLinkMode = "invite_link" | "join_request";

export type TelegramBotAdminStatus =
  | "unknown"
  | "ready"
  | "missing"
  | "insufficient_permissions"
  | "left_chat";

export type TelegramWelcomeIntroLocale = "en" | "ar" | "zh" | "ka";

export type TelegramWelcomeIntroSettings = Partial<Record<TelegramWelcomeIntroLocale, string>>;

export interface TelegramLinkedChatSettings {
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
  telegramWelcomeIntro: TelegramWelcomeIntroSettings;
}

export type CommunityTelegramIntegrationSubmitState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "error"; message: string };

export interface CommunityTelegramIntegrationPageProps {
  settings: CommunityTelegramIntegrationSettings;
  submitState: CommunityTelegramIntegrationSubmitState;
  className?: string;
  joinUrl?: string | null;
  onConnectChat?: () => void;
  onRevokeBot?: () => void;
  onSave?: () => void;
  onSaveBotToken?: (token: string) => void;
  onSettingsChange?: (settings: CommunityTelegramIntegrationSettings) => void;
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
    telegramWelcomeIntro: {},
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
