import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  CommunityTelegramIntegrationPage,
} from "../community-telegram-integration";
import {
  createDefaultTelegramIntegrationSettings,
  type CommunityTelegramIntegrationSettings,
  type CommunityTelegramIntegrationPageProps,
  type TelegramBroadcastChannelInfo,
} from "../community-telegram-integration.types";

function InteractiveStory(args: CommunityTelegramIntegrationPageProps) {
  const [settings, setSettings] = React.useState(args.settings);
  const [submitState, setSubmitState] = React.useState(args.submitState);

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-6">
      <CommunityTelegramIntegrationPage
        {...args}
        settings={settings}
        submitState={submitState}
        onConnectChat={() => undefined}
        onSave={() => {
          setSubmitState({ kind: "saving" });
          setTimeout(() => setSubmitState({ kind: "idle" }), 700);
        }}
        onSettingsChange={setSettings}
      />
    </div>
  );
}

const meta = {
  title: "Compositions/Community/Moderation/Telegram",
  component: CommunityTelegramIntegrationPage,
  parameters: {
    layout: "fullscreen",
  },
  render: (args) => <InteractiveStory {...args} />,
} satisfies Meta<typeof CommunityTelegramIntegrationPage>;

export default meta;

type Story = StoryObj<typeof meta>;

function connectedSettings(
  patch: Partial<CommunityTelegramIntegrationSettings> = {},
): CommunityTelegramIntegrationSettings {
  const defaults = createDefaultTelegramIntegrationSettings();
  return {
    ...defaults,
    ...patch,
    bot: {
      ...defaults.bot,
      status: "connected",
      username: "InfinityMirrorBot",
      displayName: "Infinity Mirror",
      tokenLast4: "9abc",
      webhookStatus: "active",
      ...patch.bot,
    },
    linkedChat: {
      ...defaults.linkedChat,
      status: "connected",
      chatTitle: "Infinity Mirror",
      chatUsername: "infinitymirror",
      chatType: "supergroup",
      botAdminStatus: "ready",
      ...patch.linkedChat,
    },
  };
}

export const NotConnected: Story = {
  name: "Not connected",
  args: {
    settings: createDefaultTelegramIntegrationSettings(),
    submitState: { kind: "idle" },
  },
};

export const Connected: Story = {
  args: {
    joinUrl: "https://pirate.sc/tg/join/com_cmt_infinity_mirror",
    settings: connectedSettings(),
    submitState: { kind: "idle" },
  },
};

export const PermissionIssue: Story = {
  name: "Permission issue",
  args: {
    joinUrl: "https://pirate.sc/tg/join/com_cmt_infinity_mirror",
    settings: connectedSettings({
      linkedChat: {
        ...connectedSettings().linkedChat,
        botAdminStatus: "insufficient_permissions",
      },
    }),
    submitState: { kind: "idle" },
  },
};

export const BotRemoved: Story = {
  name: "Bot removed",
  args: {
    joinUrl: "https://pirate.sc/tg/join/com_cmt_infinity_mirror",
    settings: connectedSettings({
      linkedChat: {
        ...connectedSettings().linkedChat,
        botAdminStatus: "left_chat",
      },
    }),
    submitState: { kind: "idle" },
  },
};

export const Error: Story = {
  args: {
    joinUrl: "https://pirate.sc/tg/join/com_cmt_infinity_mirror",
    settings: connectedSettings(),
    submitState: { kind: "error", message: "Could not save Telegram settings." },
  },
};

export const Mobile: Story = {
  args: {
    joinUrl: "https://pirate.sc/tg/join/com_cmt_infinity_mirror",
    settings: connectedSettings(),
    submitState: { kind: "idle" },
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};

const exampleChannel: TelegramBroadcastChannelInfo = {
  title: "Infinity Mirror Updates",
  username: "infinitymirrorupdates",
  publicationMode: "from_now",
  linkedAt: 1753500000,
};

const channelNoop = () => undefined;

export const ChannelNotConnected: Story = {
  name: "Channel not connected",
  args: {
    joinUrl: "https://pirate.sc/tg/join/com_cmt_infinity_mirror",
    settings: connectedSettings(),
    submitState: { kind: "idle" },
    channel: {
      state: { kind: "unconnected" },
      botConnected: true,
      onConnect: channelNoop,
    },
  },
};

export const ChannelWaitingForTelegram: Story = {
  name: "Channel waiting for Telegram",
  args: {
    joinUrl: "https://pirate.sc/tg/join/com_cmt_infinity_mirror",
    settings: connectedSettings(),
    submitState: { kind: "idle" },
    channel: {
      state: {
        kind: "awaiting_telegram",
        checking: false,
        deepLink: "https://t.me/InfinityMirrorBot?start=setup_example",
        // Far-future expiry so the story does not flip to the expired state.
        expiresAt: 4102444800,
      },
      botConnected: true,
      onOpenTelegramAgain: channelNoop,
      onCheckConnection: channelNoop,
      onCancelSetup: channelNoop,
    },
  },
};

export const ChannelConnected: Story = {
  name: "Channel connected",
  args: {
    joinUrl: "https://pirate.sc/tg/join/com_cmt_infinity_mirror",
    settings: connectedSettings(),
    submitState: { kind: "idle" },
    channel: {
      state: { kind: "connected", channel: exampleChannel },
      botConnected: true,
      onRequestBackfill: channelNoop,
      onRequestDisconnect: channelNoop,
    },
  },
};

export const ChannelBackfillConfirmation: Story = {
  name: "Channel backfill confirmation",
  args: {
    joinUrl: "https://pirate.sc/tg/join/com_cmt_infinity_mirror",
    settings: connectedSettings(),
    submitState: { kind: "idle" },
    channel: {
      state: { kind: "backfill_confirm", channel: exampleChannel },
      botConnected: true,
      onConfirmBackfill: channelNoop,
      onCancelBackfill: channelNoop,
    },
  },
};

export const ChannelConnectionError: Story = {
  name: "Channel connection error",
  args: {
    joinUrl: "https://pirate.sc/tg/join/com_cmt_infinity_mirror",
    settings: connectedSettings(),
    submitState: { kind: "idle" },
    channel: {
      state: {
        kind: "error",
        message: "This channel is already connected to another Pirate community.",
        channel: null,
      },
      botConnected: true,
      onConnect: channelNoop,
    },
  },
};
