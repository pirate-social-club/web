import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { CommunityProofOfWorkModal } from "../community-proof-of-work-modal";

const readyChallenge = {
  algorithm: "SHA-256",
  challenge: "0000000000000000000000000000000000000000000000000000000000000000",
  maxnumber: 1000,
  salt: "storybook",
  signature: "storybook-signature",
};

const meta = {
  title: "Compositions/Community/ProofOfWorkModal",
  component: CommunityProofOfWorkModal,
  args: {
    action: "community:local-transit",
    challengeLoader: () => new Promise(() => {}),
    continueDisabled: true,
    locale: "en",
    onContinue: () => {},
    onOpenChange: () => {},
    onPayloadChange: () => {},
    open: true,
    requirements: [{ gate_type: "altcha_pow" }],
    requirementStatuses: ["unmet"],
    scope: "community_join",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="min-h-[720px] bg-background p-6 text-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CommunityProofOfWorkModal>;

export default meta;

type Story = StoryObj<typeof meta>;

function ProofOfWorkModalStory(args: React.ComponentProps<typeof CommunityProofOfWorkModal>) {
  const [open, setOpen] = React.useState(true);

  return (
    <CommunityProofOfWorkModal
      {...args}
      onOpenChange={setOpen}
      open={open}
    />
  );
}

function AutoVerifiedProofOfWorkModalStory(args: React.ComponentProps<typeof CommunityProofOfWorkModal>) {
  const [open, setOpen] = React.useState(true);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      document.querySelector("altcha-widget")?.dispatchEvent(new CustomEvent("verified", {
        detail: { payload: "storybook-payload" },
      }));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <CommunityProofOfWorkModal
      {...args}
      onOpenChange={setOpen}
      open={open}
    />
  );
}

export const BrowserCheckRequired: Story = {
  name: "States / Browser anti-bot check required",
  render: (args) => {
    return <ProofOfWorkModalStory {...args} />;
  },
};

export const FallbackAccepted: Story = {
  name: "States / Alternate browser check",
  args: {
    requirements: [
      { accepted_providers: ["very"], gate_type: "unique_human" },
      { gate_type: "altcha_pow" },
    ],
    requirementsMode: "any",
    requirementStatuses: ["unknown", "unknown"],
  },
  render: (args) => {
    return <ProofOfWorkModalStory {...args} />;
  },
};

export const RunningCheck: Story = {
  name: "States / Running check",
  args: {
    challengeLoader: async () => readyChallenge,
  },
  render: (args) => {
    return <ProofOfWorkModalStory {...args} />;
  },
};

export const Complete: Story = {
  name: "States / Complete",
  args: {
    challengeLoader: async () => readyChallenge,
    continueDisabled: false,
  },
  render: (args) => {
    return <AutoVerifiedProofOfWorkModalStory {...args} />;
  },
};

export const Error: Story = {
  name: "States / Error",
  args: {
    challengeLoader: async () => {
      throw new Error("Could not start browser anti-bot check.");
    },
  },
  render: (args) => {
    return <ProofOfWorkModalStory {...args} />;
  },
};

export const RetryThenRunning: Story = {
  name: "States / Retry then running",
  render: (args) => {
    let attempts = 0;
    const challengeLoader = async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("Could not start browser anti-bot check.");
      }
      return readyChallenge;
    };

    return (
      <ProofOfWorkModalStory
        {...args}
        challengeLoader={challengeLoader}
      />
    );
  },
};
