import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { KaraokeScoreSummary } from "../scoring/karaoke-score-summary";
import { KaraokeRankSummary } from "../leaderboard/karaoke-rank-summary";

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

/**
 * CONCEPTUAL — not production wiring. Shows how a rank line (KaraokeRankSummary)
 * would sit under the final score once the leaderboard persistence/endpoints
 * exist (gated; see core spec/karaoke-rankings). The score is real today; the
 * rank line is mocked.
 */
export const WithConceptualRankLine: Story = {
  parameters: {
    docs: {
      description: {
        story: "Conceptual only — rankings are not built/wired yet. The rank line is mocked.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col items-center gap-2">
      <KaraokeScoreSummary finalScore={0.86} />
      <KaraokeRankSummary eligible percentile={1800} rank={12} scope="weekly" totalRanked={64} />
    </div>
  ),
};
