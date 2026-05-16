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

export const OwnerAndModerators: Story = {
  name: "Roles / Owner and moderators",
  args: {
    description: "A community with visible creator and moderation roles.",
    followerCount: 18400,
    memberCount: 1270,
    owner: {
      user: "usr_owner",
      avatarSeed: "usr_owner",
      displayName: "Captain Signal",
      handle: "captain.pirate",
      nationalityBadgeCountryCode: "US",
      nationalityBadgeLabel: "Verified United States nationality",
      role: "owner",
    },
    moderators: [
      {
        user: "usr_mod_1",
        avatarSeed: "usr_mod_1",
        displayName: "Mod Matrix",
        handle: "modmatrix.pirate",
        nationalityBadgeCountryCode: "GB",
        nationalityBadgeLabel: "Verified United Kingdom nationality",
        role: "moderator",
      },
      {
        user: "usr_mod_2",
        avatarSeed: "usr_mod_2",
        displayName: "Admin Current",
        handle: "admincurrent.pirate",
        role: "admin",
      },
    ],
  },
};

export const RequirementsAnd: Story = {
  name: "Gates / AND mode",
  args: {
    description: "A community for verified humans with high reputation.",
    followerCount: 1200,
    memberCount: 340,
    requirementsMode: "all",
    gates: [
      { gateType: "wallet_score", label: "Passport score 8+", provider: null, status: "met" },
      { gateType: "unique_human", label: "Palm scan", provider: "very", status: "unmet" },
    ],
  },
};

export const RequirementsOr: Story = {
  name: "Gates / OR mode",
  args: {
    description: "A community for verified humans or high reputation wallets.",
    followerCount: 5400,
    memberCount: 890,
    requirementsMode: "any",
    gates: [
      { gateType: "wallet_score", label: "Passport score 8+", provider: null, status: "met" },
      { gateType: "unique_human", label: "Palm scan", provider: "very", status: "unmet" },
    ],
  },
};

export const RequirementsSingle: Story = {
  name: "Gates / Single requirement",
  args: {
    description: "Gated by passport score only.",
    followerCount: 900,
    memberCount: 120,
    gates: [
      { gateType: "wallet_score", label: "Passport score 20+", provider: null, status: "unmet" },
    ],
  },
};

export const RequirementsManyAnd: Story = {
  name: "Gates / Many AND",
  args: {
    description: "A highly gated community.",
    followerCount: 300,
    memberCount: 45,
    requirementsMode: "all",
    gates: [
      { gateType: "age_over_18", label: "18+", provider: null, status: "met" },
      { gateType: "wallet_score", label: "Passport score 20+", provider: null, status: "met" },
      { gateType: "unique_human", label: "Palm scan", provider: "very", status: "unmet" },
      { gateType: "nationality", label: "US nationality", provider: null, status: "unmet" },
    ],
  },
};

export const RequirementsManyOr: Story = {
  name: "Gates / Many OR",
  args: {
    description: "A community with alternative entry paths.",
    followerCount: 2100,
    memberCount: 560,
    requirementsMode: "any",
    gates: [
      { gateType: "wallet_score", label: "Passport score 20+", provider: null, status: "met" },
      { gateType: "unique_human", label: "Private ID proof", provider: "self", status: "unmet" },
      { gateType: "unique_human", label: "Palm scan", provider: "very", status: "unmet" },
      { gateType: "nationality", label: "US nationality", provider: null, status: "unmet" },
    ],
  },
};

export const GateTypes: Story = {
  name: "Gates / Type variants",
  args: {
    description: "Visual coverage for every supported gate type.",
    followerCount: 840,
    memberCount: 210,
    requirementsMode: "all",
    gates: [
      { gateType: "altcha_pow", label: "Proof-of-work check", provider: null, status: "unknown" },
      { gateType: "unique_human", label: "Private ID proof", provider: "self", status: "unknown" },
      { gateType: "unique_human", label: "Palm scan", provider: "very", status: "unknown" },
      { gateType: "nationality", label: "US nationality", provider: null, status: "unknown" },
      { gateType: "wallet_score", label: "Passport score 20+", provider: null, status: "unknown" },
      { gateType: "minimum_age", label: "21+", provider: null, status: "unknown" },
      { gateType: "gender", label: "Document sex marker F", provider: null, status: "unknown" },
      { gateType: "erc721_holding", label: "Ethereum NFT from 0x1234...5678", provider: null, status: "unknown" },
      { gateType: "erc721_inventory_match", label: "2 Courtyard Rolexes", provider: null, status: "unknown" },
      { gateType: "unknown_gate", label: "Custom verification", provider: null, status: "unknown" },
    ],
  },
};

export const GateStatuses: Story = {
  name: "Gates / Status states",
  args: {
    description: "Shows met, unmet, and unknown indicators.",
    followerCount: 620,
    memberCount: 80,
    requirementsMode: "all",
    gates: [
      { gateType: "wallet_score", label: "Passport score 20+", provider: null, status: "met" },
      { gateType: "unique_human", label: "Palm scan", provider: "very", status: "unmet" },
      { gateType: "erc721_holding", label: "Ethereum NFT from 0x1234...5678", provider: null, status: "unknown" },
    ],
  },
};

export const GatesUnknownMode: Story = {
  name: "Gates / Unknown mode",
  args: {
    description: "Preview data can list gates before match mode is known.",
    followerCount: 410,
    memberCount: 36,
    gates: [
      { gateType: "wallet_score", label: "Passport score 20+", provider: null, status: "unknown" },
      { gateType: "erc721_inventory_match", label: "2 Courtyard Rolexes", provider: null, status: "unknown" },
    ],
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
    requirementsMode: "all",
    gates: [
      { gateType: "wallet_score", label: "Passport score 8+", provider: null, status: "met" },
      { gateType: "unique_human", label: "Palm scan", provider: "very", status: "unmet" },
    ],
  },
};
