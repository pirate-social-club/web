import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommunityIntegrationsPage } from "../community-integrations";
import type { CommunityIntegrationsPageProps } from "../community-integrations.types";
import { createDefaultCommunityAssistantPolicySettings } from "../../assistant-policy/community-assistant-policy.types";

function InteractiveStory(args: CommunityIntegrationsPageProps) {
  const [settings, setSettings] = React.useState(args.settings);

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-6">
      <CommunityIntegrationsPage
        {...args}
        onElevenLabsKeyRevoke={() => {
          setSettings((current) => ({ ...current, elevenLabsKeyStatus: { kind: "missing" } }));
        }}
        onElevenLabsKeySave={(apiKey) => {
          setSettings((current) => ({
            ...current,
            elevenLabsKeyStatus: {
              connectedAt: new Date().toISOString(),
              kind: "connected",
              last4: apiKey.slice(-4),
            },
          }));
        }}
        onOpenRouterKeyRevoke={() => {
          setSettings((current) => ({ ...current, openRouterKeyStatus: { kind: "missing" } }));
        }}
        onOpenRouterKeySave={(apiKey) => {
          setSettings((current) => ({
            ...current,
            openRouterKeyStatus: {
              connectedAt: new Date().toISOString(),
              kind: "connected",
              last4: apiKey.slice(-4),
            },
          }));
        }}
        settings={settings}
      />
    </div>
  );
}

const meta = {
  title: "Compositions/Community/Moderation/Integrations",
  component: CommunityIntegrationsPage,
  parameters: {
    layout: "fullscreen",
  },
  render: (args) => <InteractiveStory {...args} />,
} satisfies Meta<typeof CommunityIntegrationsPage>;

export default meta;

type Story = StoryObj<typeof meta>;

const defaults = createDefaultCommunityAssistantPolicySettings();

export const Missing: Story = {
  args: {
    settings: defaults,
  },
};

export const Connected: Story = {
  args: {
    settings: {
      ...defaults,
      elevenLabsKeyStatus: {
        connectedAt: "2026-07-06T00:00:00.000Z",
        kind: "connected",
        last4: "7xyz",
      },
      openRouterKeyStatus: {
        connectedAt: "2026-07-06T00:00:00.000Z",
        kind: "connected",
        last4: "9abc",
      },
    },
  },
};

export const Invalid: Story = {
  args: {
    settings: {
      ...defaults,
      elevenLabsKeyStatus: {
        kind: "invalid",
        last4: "7xyz",
        message: "ElevenLabs rejected this key.",
      },
      openRouterKeyStatus: {
        kind: "invalid",
        last4: "9abc",
        message: "OpenRouter rejected this key.",
      },
    },
  },
};
