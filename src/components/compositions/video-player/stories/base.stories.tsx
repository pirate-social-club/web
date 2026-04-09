import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { VideoPlayer } from "../video-player";

const meta = {
  title: "Compositions/VideoPlayer",
  component: VideoPlayer,
  args: {
    src: "https://stream.mux.com/VZtzUzGRv02OhRnZCxcNg49OilvolTqdnFLEqBsTwaxU/low.mp4",
    poster: "https://image.mux.com/VZtzUzGRv02OhRnZCxcNg49OilvolTqdnFLEqBsTwaxU/thumbnail.webp?time=0",
    title: "Studio Session",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ width: "min(100vw - 32px, 720px)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VideoPlayer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoPoster: Story = {
  name: "No Poster",
  render: () => (
    <VideoPlayer
      src="https://stream.mux.com/VZtzUzGRv02OhRnZCxcNg49OilvolTqdnFLEqBsTwaxU/low.mp4"
      title="Quick clip"
    />
  ),
};

export const Looping: Story = {
  name: "Loop Enabled",
  render: () => (
    <VideoPlayer
      src="https://stream.mux.com/VZtzUzGRv02OhRnZCxcNg49OilvolTqdnFLEqBsTwaxU/low.mp4"
      poster="https://image.mux.com/VZtzUzGRv02OhRnZCxcNg49OilvolTqdnFLEqBsTwaxU/thumbnail.webp?time=0"
      title="Studio Session"
      loop
    />
  ),
};

export const StartAt30s: Story = {
  name: "Start at 30s",
  render: () => (
    <VideoPlayer
      src="https://stream.mux.com/VZtzUzGRv02OhRnZCxcNg49OilvolTqdnFLEqBsTwaxU/low.mp4"
      poster="https://image.mux.com/VZtzUzGRv02OhRnZCxcNg49OilvolTqdnFLEqBsTwaxU/thumbnail.webp?time=30"
      title="Studio Session"
      currentTime={30}
    />
  ),
};

export const OnEndCallback: Story = {
  name: "On End Callback",
  render: () => {
    const [ended, setEnded] = React.useState(false);

    return (
      <div className="flex flex-col gap-2">
        <VideoPlayer
          src="https://stream.mux.com/VZtzUzGRv02OhRnZCxcNg49OilvolTqdnFLEqBsTwaxU/low.mp4"
          poster="https://image.mux.com/VZtzUzGRv02OhRnZCxcNg49OilvolTqdnFLEqBsTwaxU/thumbnail.webp?time=0"
          title="Studio Session"
          onEnded={() => setEnded(true)}
        />
        {ended && <p className="text-base text-muted-foreground">Video ended</p>}
      </div>
    );
  },
};
