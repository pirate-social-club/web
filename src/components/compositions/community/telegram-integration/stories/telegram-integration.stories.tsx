import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  CommunityTelegramIntegrationPage,
} from "../community-telegram-integration";
import {
  createDefaultTelegramIntegrationSettings,
  type CommunityTelegramIntegrationSettings,
  type CommunityTelegramIntegrationPageProps,
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
    settings: connectedSettings(),
    submitState: { kind: "idle" },
  },
};

export const PermissionIssue: Story = {
  name: "Permission issue",
  args: {
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
    settings: connectedSettings(),
    submitState: { kind: "error", message: "Could not save Telegram settings." },
  },
};

export const Mobile: Story = {
  args: {
    settings: connectedSettings(),
    submitState: { kind: "idle" },
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
