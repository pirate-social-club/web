import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { ProfilePage } from "../profile-page";
import type { ProfilePageProps } from "../profile-page.types";
import {
  overviewItems,
  profileComments,
  profilePosts,
  profileScrobbles,
  walletChainSections,
} from "../../stories/profile-fixtures";

const baseArgs: ProfilePageProps = {
  profile: {
    displayName: "Pampa_of_Argentina",
    handle: "u/pampa_of_argentina.pirate",
    bio:
      "Buenos Aires, bookstores, football, and a listening history that should probably count as public infrastructure.",
    avatarSrc: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=300&q=80",
    nationalityBadgeCountryCode: "AR",
    nationalityBadgeLabel: "Verified Argentina nationality",
    bannerSrc: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1600&q=80",
    viewerContext: "public",
    viewerFollows: false,
    canMessage: true,
  },
  rightRail: {
    description:
      "Buenos Aires, bookstores, football, and a listening history that should probably count as public infrastructure.",
    stats: [
      { label: "Karma", value: 20028 },
      { label: "Contributions", value: 1352 },
      { label: "Wallet age", value: "6 months" },
      { label: "Followers", value: 842 },
    ],
    walletAddress: "0x42a5f77f2d06c9a7e304817b3c177b91e0c2f3a8",
    walletChainSections,
    walletAssets: [
      { assetId: "eth", chainId: "ethereum", label: "ETH", symbol: "ETH", name: "Ethereum", value: "1.284 ETH", fiatValue: "$3,407.21" },
      { assetId: "base-eth", chainId: "base", label: "ETH", symbol: "ETH", name: "Base", value: "0.382 ETH", fiatValue: "$1,013.94" },
      { assetId: "usdc", chainId: "base", label: "USDC", symbol: "USDC", name: "USD Coin", value: "2,450.00 USDC", fiatValue: "$2,450.00" },
      { assetId: "usdt", chainId: "optimism", label: "USDT", symbol: "USDT", name: "Tether USD", value: "250.00 USDT", fiatValue: "$250.00" },
    ],
    verificationItems: [
      { label: "Palm Scan", value: "Verified" },
      { label: "Wallet Score", value: "19.8" },
      { label: "Nationality", value: "Argentina" },
      { label: "Age", value: "18+" },
    ],
  },
  overviewItems,
  posts: profilePosts,
  comments: profileComments,
  scrobbles: profileScrobbles,
};

const meta = {
  title: "Compositions/Profiles/ProfilePage",
  component: ProfilePage,
  args: baseArgs,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ minHeight: "100vh", maxWidth: "96rem", margin: "0 auto", padding: "0 1.25rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProfilePage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};

export const Posts: Story = {
  args: {
    defaultTab: "posts",
  },
};

export const Comments: Story = {
  args: {
    defaultTab: "comments",
  },
};

export const Wallet: Story = {
  args: {
    defaultTab: "wallet",
  },
};

export const EnsPrimary: Story = {
  args: {
    profile: {
      ...baseArgs.profile,
      displayName: "Blackbeard",
      handle: "blackbeard.eth",
      bio: "ENS primary profile with imported avatar, cover, and bio metadata.",
      tagline: undefined,
    },
    rightRail: {
      ...baseArgs.rightRail,
      description: "ENS primary profile with imported avatar, cover, and bio metadata.",
    },
  },
};

export const PublicV0Lean: Story = {
  args: {
    rightRail: {
      stats: [
        { label: "Karma", value: 20028 },
        { label: "Contributions", value: 1352 },
        { label: "Followers", value: 842 },
        { label: "Following", value: 118 },
      ],
    },
  },
};

export const OwnProfile: Story = {
  args: {
    profile: {
      ...baseArgs.profile,
      viewerContext: "self",
      canMessage: false,
    },
  },
};

export const MobileOverview: Story = {
  args: {
    defaultTab: "overview",
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};

export const OwnProfileMobile: Story = {
  args: {
    profile: {
      ...baseArgs.profile,
      viewerContext: "self",
      canMessage: false,
    },
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
