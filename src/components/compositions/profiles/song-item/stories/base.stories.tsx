import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { Play } from "@phosphor-icons/react";

import { MediaControlButton } from "@/components/primitives/media-control-button";
import { SongItem } from "../song-item";

const meta = {
  title: "Compositions/Profiles/SongItem",
  component: SongItem,
  args: {
    title: "Cancion Animal",
    artistName: "Soda Stereo",
    artworkSrc: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=400&q=80",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ width: "min(100vw - 32px, 560px)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SongItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithMeta: Story = {
  args: {
    metaItems: [
      { label: "Scrobbled 6m ago" },
      { label: "c/argentina", href: "#" },
      { label: "418 plays" },
    ],
  },
};

export const WithoutArtist: Story = {
  args: {
    artistName: undefined,
    title: "Untitled Demo",
    artworkSrc: undefined,
    metaItems: [{ label: "Local file" }],
  },
};

export const WithAction: Story = {
  args: {
    metaItems: [{ label: "Now playing" }],
    trailingContent: (
      <MediaControlButton aria-label="Play" size="md">
        <Play className="size-[18px]" weight="fill" />
      </MediaControlButton>
    ),
  },
};
