import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { Button } from "@/components/primitives/button";

import { CommunityJoinRequestModal } from "../community-join-request-modal";

const meta = {
  title: "Compositions/CommunityJoinRequestModal",
  component: CommunityJoinRequestModal,
  args: {
    communityName: "Signal Room",
    onOpenChange: () => {},
    onSubmit: () => {},
    open: true,
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="min-h-[680px] bg-background p-6 text-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CommunityJoinRequestModal>;

export default meta;

type Story = StoryObj<typeof meta>;

function ModalStory({
  initialNote = "",
  submitted = false,
  submitting = false,
}: {
  initialNote?: string;
  submitted?: boolean;
  submitting?: boolean;
}) {
  const [open, setOpen] = React.useState(true);

  return (
    <>
      {!open ? <Button onClick={() => setOpen(true)}>Reopen request</Button> : null}
      <CommunityJoinRequestModal
        communityName="Signal Room"
        initialNote={initialNote}
        onOpenChange={setOpen}
        onSubmit={() => {}}
        open={open}
        submitted={submitted}
        submitting={submitting}
      />
    </>
  );
}

export const Default: Story = {
  name: "Default",
  render: () => <ModalStory />,
};

export const WithPrefilledNote: Story = {
  name: "With prefilled note",
  render: () => (
    <ModalStory initialNote="I have been following the community and would like to participate." />
  ),
};

export const Submitting: Story = {
  name: "Submitting",
  render: () => <ModalStory submitting />,
};

export const Submitted: Story = {
  name: "Submitted",
  render: () => <ModalStory submitted />,
};
