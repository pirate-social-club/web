/** @jsxImportSource @solidjs/web */

import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Type } from "../../../design-system";
import { ProfilePage } from "./profile-page";
import { baseProfileProps } from "./profile-page-fixtures";

const meta = {
  title: "Compositions/Profiles/ProfilePage",
  component: ProfilePage,
  args: baseProfileProps,
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
} satisfies Meta<typeof ProfilePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: "Posts" }));
    await expect(canvas.getByRole("tab", { name: "Posts" })).toHaveAttribute("aria-selected", "true");
  },
};

export const Posts: Story = { args: { defaultTab: "posts" } };

export const Comments: Story = { args: { defaultTab: "comments" } };

export const Wallet: Story = { args: { defaultTab: "wallet" } };

export const EnsPrimary: Story = {
  args: {
    profile: {
      ...baseProfileProps.profile,
      bio: "ENS primary profile with imported avatar, cover, and bio metadata.",
      displayName: "Blackbeard",
      handle: "blackbeard.eth",
      tagline: undefined,
    },
    rightRail: { ...baseProfileProps.rightRail, description: "ENS primary profile with imported avatar, cover, and bio metadata." },
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
    bookPanel: <Type variant="body">Booking setup panel</Type>,
    onBookingCta: () => undefined,
    onCommunitiesCta: () => undefined,
    onEditProfile: () => undefined,
    profile: { ...baseProfileProps.profile, bookingCtaLabel: "Set up bookings", canMessage: false, isBookable: false, viewerContext: "self" },
  },
};

export const MobileOverview: Story = {
  args: { defaultTab: "overview" },
  globals: { viewport: { value: "mobile1", isRotated: false } },
};

export const OwnProfileMobile: Story = {
  args: {
    onEditProfile: () => undefined,
    profile: { ...baseProfileProps.profile, canMessage: false, viewerContext: "self" },
  },
  globals: { viewport: { value: "mobile1", isRotated: false } },
};
