import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PublicProfilePage } from "../public-profile-page";
import type {
  PublicProfilePostItem,
  PublicProfileScrobbleItem,
  PublicProfileVideoItem,
} from "../public-profile-page.types";

const posts: PublicProfilePostItem[] = [
  {
    postId: "post_1",
    post: {
      viewContext: "profile",
      byline: {
        community: { kind: "community", label: "c/interesting", href: "#" },
        author: { kind: "user", label: "u/Pampa_of_Argentina", href: "#" },
        timestampLabel: "28m",
      },
      title:
        "Buenos Aires holds the world record for bookstores per capita, with approximately 25 bookstores for every 100,000 inhabitants.",
      content: {
        type: "image",
        src: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=900&q=80",
        alt: "A rainy Buenos Aires street with classic architecture.",
      },
      engagement: { score: 1284, commentCount: 86, saved: true },
      menuItems: [],
    },
  },
  {
    postId: "post_2",
    post: {
      viewContext: "profile",
      byline: {
        community: { kind: "community", label: "c/lastfm", href: "#" },
        author: { kind: "user", label: "u/Pampa_of_Argentina", href: "#" },
        timestampLabel: "7h",
      },
      title: "April listening report from the southern cone",
      content: {
        type: "text",
        body:
          "This month has been all Charly, Sumo, and a lot more post-punk than usual.",
      },
      engagement: { score: 392, commentCount: 41 },
    },
  },
];

const videos: PublicProfileVideoItem[] = [
  {
    videoId: "video_1",
    post: {
      viewContext: "profile",
      byline: {
        community: { kind: "community", label: "c/argentina", href: "#" },
        author: { kind: "user", label: "u/Pampa_of_Argentina", href: "#" },
        timestampLabel: "2d",
      },
      title: "Sunday walk through San Telmo",
      content: {
        type: "video",
        src: "https://www.w3schools.com/html/mov_bbb.mp4",
        posterSrc:
          "https://images.unsplash.com/photo-1524499982521-1ffd58dd89ea?auto=format&fit=crop&w=900&q=80",
        durationLabel: "0:48",
        accessMode: "public",
      },
      engagement: { score: 621, commentCount: 58 },
    },
  },
];

const songs: PublicProfileScrobbleItem[] = [
  {
    scrobbleId: "song_1",
    title: "Cancion Animal",
    artistName: "Soda Stereo",
    artworkSrc:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=400&q=80",
    metaItems: [
      { label: "c/argentina", href: "#" },
      { label: "418 plays" },
    ],
  },
  {
    scrobbleId: "song_2",
    title: "Viernes 3 AM",
    artistName: "Seru Giran",
    artworkSrc:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
    metaItems: [
      { label: "c/classicrock", href: "#" },
      { label: "302 plays" },
    ],
  },
];

const scrobbles: PublicProfileScrobbleItem[] = [
  {
    scrobbleId: "scrobble_1",
    title: "Cancion Animal",
    artistName: "Soda Stereo",
    artworkSrc:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=400&q=80",
    metaItems: [
      { label: "Scrobbled 6m ago" },
      { label: "c/argentina", href: "#" },
      { label: "418 plays" },
    ],
  },
  {
    scrobbleId: "scrobble_2",
    title: "Post-Crucifixion",
    artistName: "Pescado Rabioso",
    artworkSrc:
      "https://images.unsplash.com/photo-1501612780327-45045538702b?auto=format&fit=crop&w=400&q=80",
    metaItems: [
      { label: "Scrobbled yesterday" },
      { label: "c/lastfm", href: "#" },
      { label: "221 plays" },
    ],
  },
];

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
  posts,
  songs,
  scrobbles,
  videos,
  openInPirateHref: "#",
};

const meta = {
  title: "Compositions/PublicProfilePage",
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
