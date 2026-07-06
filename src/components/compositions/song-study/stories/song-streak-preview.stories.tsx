import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { SongStreakPreview } from "../song-streak-preview";
import {
  boardEntries,
  summary,
  viewerDead,
  viewerNotRanked,
  viewerRankedBehind,
  viewerRankedLockedIn,
} from "./streak-fixtures";

const noop = () => {};

const meta = {
  title: "Compositions/Song Study/SongStreakPreview",
  component: SongStreakPreview,
  parameters: { layout: "padded" },
  args: { onViewLeaderboard: noop },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ width: "min(100vw - 32px, 560px)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SongStreakPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

const rankedEntries = boardEntries.map((entry) =>
  entry.rank === 3 ? { ...entry, is_viewer: true } : entry,
);

export const ViewerRankedBehind: Story = {
  name: "Viewer ranked, streak at risk today",
  args: { summary: summary(rankedEntries, viewerRankedBehind, 42) },
};

export const ViewerRankedLockedIn: Story = {
  name: "Viewer ranked, locked in today",
  args: { summary: summary(rankedEntries, viewerRankedLockedIn, 42) },
};

export const ViewerNotRanked: Story = {
  name: "Viewer not in top 3",
  args: { summary: summary(boardEntries, viewerNotRanked, 42) },
};

export const ViewerLapsed: Story = {
  name: "Viewer streak lapsed",
  args: { summary: summary(boardEntries, viewerDead, 42) },
};

export const Empty: Story = {
  name: "Empty (be the first)",
  args: { summary: summary([], null, 0) },
};
