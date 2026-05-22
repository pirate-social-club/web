import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommunityAssistantPolicyPage } from "../community-assistant-policy";
import {
  createDefaultCommunityAssistantPolicySettings,
  type CommunityAssistantPolicyPageProps,
} from "../community-assistant-policy.types";

function InteractiveStory(args: CommunityAssistantPolicyPageProps) {
  const [settings, setSettings] = React.useState(args.settings);
  const [submitState, setSubmitState] = React.useState(args.submitState);

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-6">
      <CommunityAssistantPolicyPage
        {...args}
        settings={settings}
        submitState={submitState}
        onSettingsChange={setSettings}
        onSave={() => {
          setSubmitState({ kind: "saving" });
          setTimeout(() => setSubmitState({ kind: "idle" }), 700);
        }}
      />
    </div>
  );
}

const meta = {
  title: "Compositions/Community/Moderation/AssistantPolicy",
  component: CommunityAssistantPolicyPage,
  parameters: {
    layout: "fullscreen",
  },
  render: (args) => <InteractiveStory {...args} />,
} satisfies Meta<typeof CommunityAssistantPolicyPage>;

export default meta;

type Story = StoryObj<typeof meta>;

const defaults = createDefaultCommunityAssistantPolicySettings();

export const Default: Story = {
  args: {
    settings: defaults,
    submitState: { kind: "idle" },
  },
};

export const AdvancedContext: Story = {
  name: "Advanced context",
  args: {
    settings: {
      ...defaults,
      openRouterKeyStatus: {
        kind: "connected",
        connectedAt: "2026-05-22T00:00:00.000Z",
        last4: "9f3a",
      },
      selectedModelId: "anthropic/claude-3.5-haiku",
      contextMode: "hybrid_vector",
      contextSources: {
        ...defaults.contextSources,
        moderationQueue: true,
      },
      actionMode: "draft_only",
      perUserDailyMessageCap: 100,
    },
    submitState: { kind: "idle" },
  },
};

export const VoiceReady: Story = {
  name: "Voice ready",
  args: {
    settings: {
      ...defaults,
      openRouterKeyStatus: {
        kind: "connected",
        connectedAt: "2026-05-22T00:00:00.000Z",
        last4: "9f3a",
      },
      voiceMode: "transcription_only",
      sttProvider: "mistral",
      sttModel: "voxtral-mini-latest",
      defaultPrompt: "Ask by voice or text about this community.",
    },
    submitState: { kind: "idle" },
  },
};

export const LockedDown: Story = {
  name: "Locked down",
  args: {
    settings: {
      ...defaults,
      contextSources: {
        ...defaults.contextSources,
        recentThreads: false,
        threadBodies: false,
        topComments: false,
        membershipState: false,
      },
      memoryEnabled: false,
      retentionMode: "ephemeral",
      retentionDays: 7,
      saveChatsToCommunityDb: false,
      actionMode: "answer_only",
      perUserDailyMessageCap: 10,
    },
    submitState: { kind: "idle" },
  },
};

export const InvalidKey: Story = {
  name: "Invalid key",
  args: {
    settings: {
      ...defaults,
      openRouterKeyStatus: {
        kind: "invalid",
        last4: "9f3a",
        message: "OpenRouter rejected this key. Rotate it to re-enable the assistant.",
      },
    },
    submitState: { kind: "idle" },
  },
};

export const Saving: Story = {
  args: {
    settings: defaults,
    submitState: { kind: "saving" },
  },
};

export const Error: Story = {
  args: {
    settings: defaults,
    submitState: { kind: "error", message: "Could not save assistant policy." },
  },
};

export const Mobile: Story = {
  args: {
    settings: defaults,
    submitState: { kind: "idle" },
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
