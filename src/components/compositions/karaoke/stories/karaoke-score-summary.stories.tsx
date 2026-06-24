import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { KaraokeScoreSummary } from "../scoring/karaoke-score-summary";

const meta = {
  title: "Compositions/Karaoke/KaraokeScoreSummary",
  component: KaraokeScoreSummary,
  parameters: { layout: "centered" },
} satisfies Meta<typeof KaraokeScoreSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shipped end-of-take result: just the final score (+ caveat). */
export const Default: Story = { render: () => <KaraokeScoreSummary finalScore={0.86} /> };

export const WithUncertainCaveat: Story = {
  render: () => <KaraokeScoreSummary finalScore={0.62} uncertainLineCount={3} />,
};