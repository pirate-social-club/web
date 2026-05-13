import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PublicProfilePage } from "../public-profile-page";
import {
  publicProfilePosts,
  publicProfileScrobbles,
  publicProfileSongs,
  publicProfileVideos,
} from "../../stories/profile-fixtures";

const baseArgs = {
  displayName: "Pampa_of_Argentina",
  handle: "u/pampa_of_argentina.pirate",
  tagline: undefined,
  bio: "Buenos Aires, bookstores, football, and a listening history that should probably count as public infrastructure.",
  avatarSrc:
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=300&q=80",
  nationalityBadgeCountryCode: "AR",
  nationalityBadgeLabel: "Verified Argentina nationality",
  bannerSrc:
    "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1600&q=80",
  meta: [
    { label: "Posts", value: "126" },
    { label: "Comments", value: "894" },
    { label: "Scrobbles", value: "14.8K" },
  ],
  communities: [
    { label: "c/argentina", href: "#" },
    { label: "c/lastfm", href: "#" },
    { label: "c/interesting", href: "#" },
    { label: "c/pirate-build", href: "#" },
  ],
  posts: publicProfilePosts,
  songs: publicProfileSongs,
  scrobbles: publicProfileScrobbles,
  videos: publicProfileVideos,
  openInPirateHref: "#",
};

const meta = {
  title: "Compositions/Profiles/PublicProfilePage",
  component: PublicProfilePage,
  args: baseArgs,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div
        style={{
          minHeight: "100vh",
          maxWidth: "56rem",
          margin: "0 auto",
          padding: "0 1.25rem",
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PublicProfilePage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Songs: Story = {
  args: { defaultTab: "songs" },
};

export const Scrobbles: Story = {
  args: { defaultTab: "scrobbles" },
};

export const Videos: Story = {
  args: { defaultTab: "videos" },
};

export const About: Story = {
  args: { defaultTab: "about" },
};

export const Minimal: Story = {
  args: {
    displayName: "new_user",
    handle: "u/new_user.pirate",
    tagline: undefined,
    bio: undefined,
    avatarSrc: undefined,
    bannerSrc: undefined,
    meta: undefined,
    communities: undefined,
    posts: undefined,
    songs: undefined,
    scrobbles: undefined,
    videos: undefined,
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
