import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowsClockwise, Copy, DownloadSimple, Flag, Link, ShareNetwork, SlidersHorizontal } from "@phosphor-icons/react";
import * as React from "react";

import { PostCard } from "../../posts/post-card/post-card";
import type { PostCardMenuItem, PostCardProps, SongContentSpec } from "../../posts/post-card/post-card.types";
import { boardEntries, summary, viewerNotRanked, viewerRankedBehind } from "./streak-fixtures";

const noop = () => {};

const shareActions: NonNullable<PostCardProps["shareActions"]> = [
  { key: "crosspost", label: "Crosspost", icon: <ArrowsClockwise className="size-5" /> },
  { key: "copy-link", label: "Copy link", icon: <Copy className="size-5" /> },
  { key: "native-share", label: "Share...", icon: <ShareNetwork className="size-5" /> },
];

// Downloads live in the top-right dots menu (utility), not as CTAs in the card body.
const menuItems: PostCardMenuItem[] = [
  { key: "download-mp3", label: "Download MP3", icon: <DownloadSimple className="size-4" /> },
  { key: "download-stems", label: "Download stems", icon: <SlidersHorizontal className="size-4" /> },
  { key: "copy-link", label: "Copy link", icon: <Link className="size-4" />, separatorBefore: true },
  { key: "report", label: "Report", icon: <Flag className="size-4" />, destructive: true },
];

const basePost: Omit<PostCardProps, "content"> = {
  viewContext: "community",
  byline: {
    community: { kind: "community", label: "c/tameimpala", href: "#", avatarSrc: "https://i.pravatar.cc/100?img=10" },
    author: { kind: "user", label: "u/kevin.tameimpala", href: "#" },
    timestampLabel: "5h",
  },
  title: "Ríos de Sal — learn it line by line",
  engagement: { score: 891, commentCount: 63 },
  shareActions,
  menuItems,
  onMenuAction: noop,
};

// The two learning actions are the primary CTAs; no download/streaks rows compete with them.
const baseSong: SongContentSpec = {
  type: "song",
  title: "Ríos de Sal",
  caption: "Built this around a late-night synth pass and a vocal chop from the bridge.",
  artworkSrc: "https://picsum.photos/seed/pirate-streak-song/240/240",
  durationLabel: "3:47",
  durationMs: 227000,
  accessMode: "public",
  playbackState: "idle",
};

const meta = {
  title: "Compositions/Song Study/CompleteSongPost",
  parameters: { layout: "padded" },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ width: "min(100vw - 32px, 560px)", margin: "0 auto" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// Post page: Sing + Study as a side-by-side primary CTA row, then the streak
// section (top holder + your standing) inline inside the card above the vote bar.
// Downloads live in the dots menu, so the card body stays focused.
export const PostPage: Story = {
  name: "Post page — 2 CTAs + inline streak section",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseSong,
        onKaraoke: noop,
        study: { status: "ready", exerciseCount: 12 },
        onStudy: noop,
        onStreaks: noop,
        streakSummary: summary(boardEntries, viewerRankedBehind, 42),
      }}
    />
  ),
};

// Feed: no Study handler is wired in the feed, so Sing is a single full-width CTA.
// The streak section still shows the #1 holder; the viewer's line pulls them back.
export const FeedCard: Story = {
  name: "Feed — single CTA + inline streak section",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseSong,
        karaokeHref: "#",
        study: { status: "ready", exerciseCount: 12 },
        onStreaks: noop,
        streakSummary: summary(boardEntries, viewerNotRanked, 12),
      }}
    />
  ),
};
