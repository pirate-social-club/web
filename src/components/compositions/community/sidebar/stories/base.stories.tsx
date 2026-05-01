import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { CommunitySidebar } from "../community-sidebar";

const meta = {
  title: "Compositions/Community/Sidebar",
  component: CommunitySidebar,
  args: {
    createdAt: "2026-04-17T00:00:00Z",
    displayName: "Infinity",
    membershipMode: "gated",
    moderators: [],
  },
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ padding: 24, maxWidth: 320, margin: "0 auto" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CommunitySidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    description: "To infinity and beyond",
    followerCount: 18400,
    memberCount: 1270,
  },
};

export const RequirementsAnd: Story = {
  name: "Gates / AND mode",
  args: {
    description: "A community for verified humans with high reputation.",
    followerCount: 1200,
    memberCount: 340,
    requirements: ["Passport score 8+", "Palm scan"],
    requirementsMode: "all",
  },
};

export const RequirementsOr: Story = {
  name: "Gates / OR mode",
  args: {
    description: "A community for verified humans or high reputation wallets.",
    followerCount: 5400,
    memberCount: 890,
    requirements: ["Passport score 8+", "Palm scan"],
    requirementsMode: "any",
  },
};

export const RequirementsSingle: Story = {
  name: "Gates / Single requirement",
  args: {
    description: "Gated by passport score only.",
    followerCount: 900,
    memberCount: 120,
    requirements: ["Passport score 20+"],
  },
};

export const RequirementsManyAnd: Story = {
  name: "Gates / Many AND",
  args: {
    description: "A highly gated community.",
    followerCount: 300,
    memberCount: 45,
    requirements: [
      "18+",
      "Passport score 20+",
      "Palm scan",
      "US nationality",
    ],
    requirementsMode: "all",
  },
};

export const RequirementsManyOr: Story = {
  name: "Gates / Many OR",
  args: {
    description: "A community with alternative entry paths.",
    followerCount: 2100,
    memberCount: 560,
    requirements: [
      "Passport score 20+",
      "Palm scan",
      "Ethereum NFT holder",
    ],
    requirementsMode: "any",
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  args: {
    description: "A community for verified humans with high reputation.",
    followerCount: 1200,
    memberCount: 340,
    requirements: ["Passport score 8+", "Palm scan"],
    requirementsMode: "all",
  },
};
