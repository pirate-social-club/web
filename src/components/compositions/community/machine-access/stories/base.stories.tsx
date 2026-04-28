import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CommunityMachineAccessPage } from "../community-machine-access";
import type { CommunityMachineAccessPageProps } from "../community-machine-access.types";
import { createDefaultMachineAccessSettings } from "../community-machine-access.types";

function InteractiveStory(args: CommunityMachineAccessPageProps) {
  const [settings, setSettings] = React.useState(args.settings);
  const [submitState, setSubmitState] = React.useState(args.submitState);

  return (
    <CommunityMachineAccessPage
      {...args}
      settings={settings}
      submitState={submitState}
      onSettingsChange={setSettings}
      onSave={() => {
        setSubmitState({ kind: "saving" });
        setTimeout(() => {
          setSettings((current) => ({ ...current, policyOrigin: "explicit" }));
          setSubmitState({ kind: "idle" });
        }, 600);
      }}
    />
  );
}

const meta = {
  title: "Compositions/Community/Moderation/MachineAccess",
  component: CommunityMachineAccessPage,
  parameters: {
    layout: "fullscreen",
  },
  render: (args) => <InteractiveStory {...args} />,
} satisfies Meta<typeof CommunityMachineAccessPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DefaultOpen: Story = {
  name: "Default open",
  args: {
    settings: createDefaultMachineAccessSettings(),
    submitState: { kind: "idle" },
  },
};

export const Exceptions: Story = {
  name: "Exceptions",
  args: {
    settings: {
      ...createDefaultMachineAccessSettings(),
      policyOrigin: "explicit",
      includedSurfaces: {
        ...createDefaultMachineAccessSettings().includedSurfaces,
        communityStats: false,
        topComments: false,
      },
    },
    submitState: { kind: "idle" },
  },
};

export const LockedDown: Story = {
  name: "Locked down",
  args: {
    settings: {
      ...createDefaultMachineAccessSettings(),
      policyOrigin: "explicit",
      includedSurfaces: {
        communityIdentity: true,
        communityStats: false,
        threadCards: false,
        threadBodies: false,
        topComments: false,
        events: false,
      },
    },
    submitState: { kind: "idle" },
  },
};

export const Saving: Story = {
  name: "Saving",
  args: {
    settings: {
      ...createDefaultMachineAccessSettings(),
      policyOrigin: "explicit",
    },
    submitState: { kind: "saving" },
  },
};

export const Error: Story = {
  name: "Error",
  args: {
    settings: {
      ...createDefaultMachineAccessSettings(),
      policyOrigin: "explicit",
    },
    submitState: { kind: "error", message: "Failed to save machine access settings." },
  },
};

export const Mobile: Story = {
  args: {
    settings: {
      ...createDefaultMachineAccessSettings(),
      policyOrigin: "explicit",
    },
    submitState: { kind: "idle" },
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
