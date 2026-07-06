import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { SongStreakChip } from "../song-streak-chip";
import { summary, viewerDead, viewerNotRanked, viewerRankedBehind, viewerRankedLockedIn } from "./streak-fixtures";

const noop = () => {};

const meta = {
  title: "Compositions/Song Study/SongStreakChip",
  component: SongStreakChip,
  parameters: { layout: "padded" },
  args: { onClick: noop },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ width: "min(100vw - 32px, 480px)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SongStreakChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ViewerStreakBehind: Story = {
  name: "Viewer streak — study more to keep it",
  args: { summary: summary([], viewerRankedBehind, 12) },
};

export const ViewerLockedIn: Story = {
  name: "Viewer streak — locked in today",
  args: { summary: summary([], viewerRankedLockedIn, 12) },
};

export const ViewerShortStreak: Story = {
  name: "Viewer short streak",
  args: { summary: summary([], viewerNotRanked, 12) },
};

export const ViewerLapsed: Story = {
  name: "Viewer streak lapsed",
  args: { summary: summary([], viewerDead, 12) },
};

export const NoViewerStreak: Story = {
  name: "No viewer streak — active count only",
  args: { summary: summary([], null, 5) },
};
