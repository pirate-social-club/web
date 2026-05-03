import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { CommunityModerationQueuePage } from "../community-moderation-queue-page";

const meta = {
  title: "Compositions/Community/Moderation/QueuePage",
  component: CommunityModerationQueuePage,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof CommunityModerationQueuePage>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseCases = [
  {
    caseId: "mca_01hqz7x9j2v3w4r5t6y7u8i9o0p",
    postId: "pst_01hqz7x9j2v3w4r5t6y7u8i9o0p",
    priority: "high" as const,
    openedBy: "platform_analysis" as const,
    status: "open" as const,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    postPreview: {
      title: "Summer sunset at the beach",
      body: "Caught this amazing gradient last night. The colors were unreal.",
      imageSrc: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=200&fit=crop",
      authorLabel: "@photographer",
    },
  },
  {
    caseId: "mca_01hqz7x9j2v3w4r5t6y7u8i9o0q",
    postId: "pst_01hqz7x9j2v3w4r5t6y7u8i9o0q",
    priority: "medium" as const,
    openedBy: "user_report" as const,
    status: "open" as const,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    postPreview: {
      title: "Check out this link",
      body: "Hey everyone, I found something interesting you might want to see...",
      authorLabel: "@newmember",
    },
  },
  {
    caseId: "mca_01hqz7x9j2v3w4r5t6y7u8i9o0r",
    postId: "pst_01hqz7x9j2v3w4r5t6y7u8i9o0r",
    priority: "low" as const,
    openedBy: "mixed" as const,
    status: "open" as const,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    postPreview: {
      title: "Art study #47",
      body: "Working on figure drawing this week. Feedback welcome!",
      imageSrc: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=200&h=200&fit=crop",
      authorLabel: "@artist",
    },
  },
];

export const Default: Story = {
  args: {
    cases: baseCases,
  },
};

export const Empty: Story = {
  args: {
    cases: [],
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    cases: [],
  },
};

export const Processing: Story = {
  args: {
    cases: baseCases,
    processingCaseId: baseCases[0].caseId,
  },
};

export const NoPreview: Story = {
  args: {
    cases: [
      {
        caseId: "mca_01hqz7x9j2v3w4r5t6y7u8i9o0s",
        postId: "pst_01hqz7x9j2v3w4r5t6y7u8i9o0s",
        priority: "medium" as const,
        openedBy: "platform_analysis" as const,
        status: "open" as const,
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
    ],
  },
};

export const Interactive: Story = {
  render: () => {
    const [cases, setCases] = React.useState(baseCases);
    const [processingId, setProcessingId] = React.useState<string | null>(null);

    const handleAction = (caseId: string) => {
      setProcessingId(caseId);
      window.setTimeout(() => {
        setCases((prev) => prev.filter((c) => c.caseId !== caseId));
        setProcessingId(null);
      }, 800);
    };

    return (
      <CommunityModerationQueuePage
        cases={cases}
        onApprove={handleAction}
        onDeny={handleAction}
        processingCaseId={processingId}
      />
    );
  },
};
