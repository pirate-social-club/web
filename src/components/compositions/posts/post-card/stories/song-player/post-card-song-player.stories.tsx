import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { SongPostContent } from "../../post-card-song-content";

const meta = {
  title: "Compositions/Posts/PostCard/Song Player",
  component: SongPostContent,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof PostCard>;

export default meta;

type Story = StoryObj<typeof meta>;

function SongPlayerPreview({ width }: { width: number }) {
  const [progressMs, setProgressMs] = React.useState(62000);

  return (
    <div className="rounded-xl border border-border bg-card p-4" style={{ width, maxWidth: "calc(100vw - 2rem)" }}>
      <SongPostContent
        content={{
          type: "song",
          accessMode: "public",
          artist: "studio_collective",
          durationMs: 187000,
          onPause: () => undefined,
          onPlay: () => undefined,
          onSeek: setProgressMs,
          playbackState: "playing",
          progressMs,
          title: "Sweet Into Bitter",
        }}
      />
    </div>
  );
}

export const Desktop: Story = {
  render: () => <SongPlayerPreview width={560} />,
};

export const Mobile320: Story = {
  name: "Mobile / 320px",
  render: () => <SongPlayerPreview width={320} />,
};

export const Mobile375: Story = {
  name: "Mobile / 375px",
  render: () => <SongPlayerPreview width={375} />,
};
