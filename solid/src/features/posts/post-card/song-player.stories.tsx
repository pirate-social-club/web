import { createSignal } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";

import { SongPostContent } from "./song-content";

function SongPlayerPreview(props: { width: number }) {
  const [progressMs, setProgressMs] = createSignal(62000);

  return (
    <div
      class="rounded-xl border border-border bg-card p-4"
      style={{ width: `${props.width}px`, "max-width": "calc(100vw - 2rem)" }}
    >
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
          progressMs: progressMs(),
          title: "Sweet Into Bitter",
        }}
      />
    </div>
  );
}

const meta = {
  title: "App/Posts/PostCard/Song Player",
  component: SongPostContent,
  args: {
    content: {
      type: "song",
      accessMode: "public",
      artist: "studio_collective",
      durationMs: 187000,
      playbackState: "playing",
      progressMs: 62000,
      title: "Sweet Into Bitter",
    },
  },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "The song card content at fixed widths. Seek is wired to a local signal; the React version used useState, same behavior.",
      },
    },
  },
} satisfies Meta<typeof SongPostContent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  render: () => <SongPlayerPreview width={560} />,
};

export const Mobile320: Story = {
  name: "Mobile / 320px",
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => <SongPlayerPreview width={320} />,
};

export const Mobile375: Story = {
  name: "Mobile / 375px",
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => <SongPlayerPreview width={375} />,
};

