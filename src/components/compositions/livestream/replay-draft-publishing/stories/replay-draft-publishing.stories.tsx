import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import {
  ReplayDraftPublishing,
  type ReplayDraftAccessPolicy,
  type ReplayDraftApprovalStatus,
  type ReplayDraftPublishingProps,
  type ReplayDraftStatus,
} from "../replay-draft-publishing";
import type { AssetRoyaltySplitState } from "@/components/compositions/posts/post-composer/royalty-split-editor";

const baseSplit: AssetRoyaltySplitState = {
  allocations: [
    { id: "host", recipientKind: "creator", walletAddress: "0x1f2a4b8c9d0e1234567890abcdef1234567890ab", sharePct: 70 },
    { id: "guest", recipientKind: "collaborator", walletAddress: "0x2b3c5d9e0f1a2345678901bcdef23456789012cd", sharePct: 20 },
    { id: "venue", recipientKind: "collaborator", walletAddress: "0x3c4d6e0f1a2b3456789012cdef345678901234ef", sharePct: 10 },
  ],
};

const baseArgs: ReplayDraftPublishingProps = {
  accessPolicy: "included_with_ticket",
  approvalStatus: "approved",
  caption: "Clean board mix from the late set, including the encore and crowd questions.",
  durationLabel: "48 min",
  onRoyaltySplitChange: () => {},
  priceLabel: "$8.00",
  royaltySplit: baseSplit,
  status: "ready",
  title: "Friday Night Studio Set",
};

function InteractiveDraft(args: ReplayDraftPublishingProps) {
  const [title, setTitle] = React.useState(args.title);
  const [caption, setCaption] = React.useState(args.caption);
  const [accessPolicy, setAccessPolicy] = React.useState<ReplayDraftAccessPolicy>(args.accessPolicy);
  const [priceLabel, setPriceLabel] = React.useState(args.priceLabel ?? "");
  const [royaltySplit, setRoyaltySplit] = React.useState<AssetRoyaltySplitState>(args.royaltySplit);

  React.useEffect(() => {
    setTitle(args.title);
    setCaption(args.caption);
    setAccessPolicy(args.accessPolicy);
    setPriceLabel(args.priceLabel ?? "");
    setRoyaltySplit(args.royaltySplit);
  }, [args.accessPolicy, args.caption, args.priceLabel, args.royaltySplit, args.title]);

  return (
    <ReplayDraftPublishing
      {...args}
      accessPolicy={accessPolicy}
      caption={caption}
      onAccessPolicyChange={setAccessPolicy}
      onCaptionChange={setCaption}
      onPriceChange={setPriceLabel}
      onRoyaltySplitChange={setRoyaltySplit}
      onTitleChange={setTitle}
      priceLabel={priceLabel}
      royaltySplit={royaltySplit}
      title={title}
    />
  );
}

const meta = {
  title: "Compositions/Livestream/ReplayDraftPublishing",
  component: ReplayDraftPublishing,
  args: baseArgs,
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <Story />
      </div>
    ),
  ],
  render: (args) => <InteractiveDraft {...args} />,
} satisfies Meta<typeof ReplayDraftPublishing>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ReadyIncludedWithTicket: Story = {
  name: "Ready / Included with ticket",
};

export const Processing: Story = {
  name: "Processing",
  args: {
    approvalStatus: "not_required" satisfies ReplayDraftApprovalStatus,
    caption: "",
    durationLabel: undefined,
    royaltySplit: {
      allocations: [
        { id: "host", recipientKind: "creator", walletAddress: "0x1f2a4b8c9d0e1234567890abcdef1234567890ab", sharePct: 100 },
      ],
    },
    status: "processing" satisfies ReplayDraftStatus,
    thumbnailSrc: undefined,
  },
};

export const NotRecorded: Story = {
  name: "Not recorded",
  args: {
    approvalStatus: "not_required" satisfies ReplayDraftApprovalStatus,
    caption: "",
    durationLabel: undefined,
    royaltySplit: {
      allocations: [
        { id: "host", recipientKind: "creator", walletAddress: "0x1f2a4b8c9d0e1234567890abcdef1234567890ab", sharePct: 100 },
      ],
    },
    status: "not_recorded" satisfies ReplayDraftStatus,
    thumbnailSrc: undefined,
  },
};

export const FreeReplay: Story = {
  name: "Ready / Free replay",
  args: {
    accessPolicy: "free" satisfies ReplayDraftAccessPolicy,
    approvalStatus: "not_required" satisfies ReplayDraftApprovalStatus,
    royaltySplit: {
      allocations: [
        { id: "host", recipientKind: "creator", walletAddress: "0x1f2a4b8c9d0e1234567890abcdef1234567890ab", sharePct: 100 },
      ],
    },
  },
};

export const PaidReplay: Story = {
  name: "Ready / Paid replay",
  args: {
    accessPolicy: "paid" satisfies ReplayDraftAccessPolicy,
    approvalStatus: "approved" satisfies ReplayDraftApprovalStatus,
    priceLabel: "8.00",
    supportedAccessPolicies: ["free", "included_with_ticket", "paid"],
  },
};

export const PaidNeedsApproval: Story = {
  name: "Paid / Split approval required",
  args: {
    accessPolicy: "paid" satisfies ReplayDraftAccessPolicy,
    approvalStatus: "pending" satisfies ReplayDraftApprovalStatus,
    priceLabel: "$8.00",
    royaltySplit: {
      allocations: [
        { id: "host", recipientKind: "creator", walletAddress: "0x1f2a4b8c9d0e1234567890abcdef1234567890ab", sharePct: 50 },
        { id: "guest", recipientKind: "collaborator", walletAddress: "0x2b3c5d9e0f1a2345678901bcdef23456789012cd", sharePct: 25 },
        { id: "label", recipientKind: "collaborator", walletAddress: "0x4d5e7f1a2b3c4567890123def456789012345fa", sharePct: 25 },
      ],
    },
  },
};

export const ReviewPending: Story = {
  name: "Review pending",
  args: {
    accessPolicy: "paid" satisfies ReplayDraftAccessPolicy,
    approvalStatus: "approved" satisfies ReplayDraftApprovalStatus,
    status: "review_pending" satisfies ReplayDraftStatus,
  },
};

export const Failed: Story = {
  name: "Failed",
  args: {
    approvalStatus: "not_required" satisfies ReplayDraftApprovalStatus,
    royaltySplit: {
      allocations: [
        { id: "host", recipientKind: "creator", walletAddress: "0x1f2a4b8c9d0e1234567890abcdef1234567890ab", sharePct: 100 },
      ],
    },
    status: "failed" satisfies ReplayDraftStatus,
    thumbnailSrc: undefined,
  },
};
