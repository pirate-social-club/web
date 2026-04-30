import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { CommunityMembershipRequestsPage } from "../community-membership-requests-page";

const meta = {
  title: "Compositions/Community/Moderation/MembershipRequestsPage",
  component: CommunityMembershipRequestsPage,
  args: {
    onApprove: () => {},
    onReject: () => {},
    processingRequestId: null,
    requests: [{
      id: "mreq_1",
      community: "cmt_signal",
      applicant_user: "usr_1",
      applicant_handle: "maya.pirate",
      applicant_avatar_ref: null,
      status: "pending",
      note: "I have been following the community and would like to participate.",
      created: "2026-04-24T10:00:00.000Z",
    }, {
      id: "mreq_2",
      community: "cmt_signal",
      applicant_user: "usr_2",
      applicant_handle: "noor.pirate",
      applicant_avatar_ref: null,
      status: "pending",
      note: null,
      created: "2026-04-23T15:30:00.000Z",
    }],
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="min-h-[640px] bg-background p-6 text-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CommunityMembershipRequestsPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Multiple: Story = {
  name: "Multiple",
};

export const Empty: Story = {
  name: "Empty",
  args: { requests: [] },
};

export const Processing: Story = {
  name: "Processing",
  args: { processingRequestId: "mreq_1" },
};
