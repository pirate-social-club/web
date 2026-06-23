import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CommunityArchivePage } from "../community-archive-page";
import type {
  CommunityArchivePageProps,
  CommunityArchiveStatus,
  CommunityArchiveSubmitState,
} from "../community-archive-page.types";

function InteractiveStory(args: CommunityArchivePageProps) {
  const [status, setStatus] = React.useState<CommunityArchiveStatus>(args.status);
  const [submitState, setSubmitState] = React.useState<CommunityArchiveSubmitState>(args.submitState);

  function transition(next: CommunityArchiveStatus) {
    setSubmitState({ kind: "saving" });
    setTimeout(() => {
      setStatus(next);
      setSubmitState({ kind: "idle" });
    }, 600);
  }

  return (
    <CommunityArchivePage
      {...args}
      status={status}
      submitState={submitState}
      onArchive={() => transition("archived")}
      onUnarchive={() => transition("active")}
    />
  );
}

const meta = {
  title: "Compositions/Community/Moderation/ArchivePage",
  component: CommunityArchivePage,
  parameters: {
    layout: "fullscreen",
  },
  render: (args) => <InteractiveStory {...args} />,
} satisfies Meta<typeof CommunityArchivePage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Active: Story = {
  name: "Active (can archive)",
  args: {
    status: "active",
    submitState: { kind: "idle" },
  },
};

export const Archived: Story = {
  name: "Archived (can unarchive)",
  args: {
    status: "archived",
    submitState: { kind: "idle" },
  },
};

export const Saving: Story = {
  name: "Saving",
  args: {
    status: "active",
    submitState: { kind: "saving" },
  },
};

export const Error: Story = {
  name: "Error",
  args: {
    status: "active",
    submitState: { kind: "error", message: "Couldn't archive the community. Try again." },
  },
};

export const Mobile: Story = {
  args: {
    status: "active",
    submitState: { kind: "idle" },
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
