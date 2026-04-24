import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { Button } from "@/components/primitives/button";

import { CommunityInteractionGateModal } from "../community-interaction-gate-modal";

const requirements = [
  { gate_type: "age_over_18" },
  { gate_type: "nationality", required_value: "US" },
] as const;

const meta = {
  title: "Compositions/CommunityInteractionGateModal",
  component: CommunityInteractionGateModal,
  args: {
    description: "Use the Self app to verify your document privately, then return to Pirate to continue.",
    onOpenChange: () => {},
    open: true,
    title: "Verify to vote",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="min-h-[720px] bg-background p-6 text-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CommunityInteractionGateModal>;

export default meta;

type Story = StoryObj<typeof meta>;

function GateModalStory({
  description,
  icon = "self",
  loading = false,
  title,
}: {
  description: string;
  icon?: "self" | "very";
  loading?: boolean;
  title: string;
}) {
  const [open, setOpen] = React.useState(true);

  return (
    <>
      {!open ? <Button onClick={() => setOpen(true)}>Reopen gate</Button> : null}
      <CommunityInteractionGateModal
        description={description}
        icon={icon}
        onOpenChange={setOpen}
        open={open}
        primaryAction={{
          label: "Verify with ID",
          loading,
          onClick: () => {},
        }}
        requirements={[...requirements]}
        secondaryAction={{
          label: "Close",
          onClick: () => setOpen(false),
        }}
        title={title}
      />
    </>
  );
}

export const DesktopVerifyToVote: Story = {
  name: "Desktop / Verify to vote",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => (
    <GateModalStory
      description="Self.xyz lets you prove facts like age and nationality without sharing your name, photo, or document details with anyone."
      title="Verify to vote"
    />
  ),
};

export const MobileVerifyToReply: Story = {
  name: "Mobile / Verify to reply",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <GateModalStory
      description="Self.xyz lets you prove facts like age and nationality without sharing your name, photo, or document details with anyone."
      title="Verify to reply"
    />
  ),
};

export const MobileLoading: Story = {
  name: "Mobile / Loading",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <GateModalStory
      description="Use the VeryAI app to scan your palm, then return to Pirate to continue. Download links appear if you need the app."
      icon="very"
      loading
      title="Verify to vote"
    />
  ),
};
