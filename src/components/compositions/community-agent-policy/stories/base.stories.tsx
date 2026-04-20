import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CommunityAgentPolicyPage } from "../community-agent-policy";
import type {
  CommunityAgentPolicyPageProps,
  CommunityAgentPolicySettings,
} from "../community-agent-policy.types";

function InteractiveStory(args: CommunityAgentPolicyPageProps) {
  const [settings, setSettings] = React.useState(args.settings);
  const [submitState, setSubmitState] = React.useState(args.submitState);

  return (
    <CommunityAgentPolicyPage
      {...args}
      settings={settings}
      submitState={submitState}
      onSettingsChange={setSettings}
      onSave={() => {
        setSubmitState({ kind: "saving" });
        setTimeout(() => setSubmitState({ kind: "idle" }), 1000);
      }}
    />
  );
}

const baseSettings: CommunityAgentPolicySettings = {
  agentPostingPolicy: "disallow",
  agentPostingScope: "replies_only",
  acceptedAgentOwnershipProviders: [],
  dailyPostCap: null,
  dailyReplyCap: null,
};

const meta = {
  title: "Compositions/CommunityAgentPolicy",
  component: CommunityAgentPolicyPage,
  parameters: {
    layout: "fullscreen",
  },
  render: (args) => <InteractiveStory {...args} />,
} satisfies Meta<typeof CommunityAgentPolicyPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Disallowed: Story = {
  args: {
    settings: baseSettings,
    submitState: { kind: "idle" },
  },
};

export const Allowed: Story = {
  args: {
    settings: {
      ...baseSettings,
      agentPostingPolicy: "allow",
      agentPostingScope: "replies_only",
      acceptedAgentOwnershipProviders: ["clawkey"],
    },
    submitState: { kind: "idle" },
  },
};

export const WithCaps: Story = {
  args: {
    settings: {
      agentPostingPolicy: "allow",
      agentPostingScope: "top_level_and_replies",
      acceptedAgentOwnershipProviders: ["clawkey"],
      dailyPostCap: 5,
      dailyReplyCap: 20,
    },
    submitState: { kind: "idle" },
  },
};

export const NoProviders: Story = {
  args: {
    settings: {
      ...baseSettings,
      agentPostingPolicy: "allow",
      agentPostingScope: "replies_only",
      acceptedAgentOwnershipProviders: [],
    },
    submitState: { kind: "idle" },
  },
};

export const Mobile: Story = {
  args: {
    settings: {
      ...baseSettings,
      agentPostingPolicy: "allow",
      agentPostingScope: "replies_only",
      acceptedAgentOwnershipProviders: ["clawkey"],
    },
    submitState: { kind: "idle" },
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
