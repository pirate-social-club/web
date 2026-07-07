import type { Meta, StoryObj } from "@storybook/react-vite";

import { KaraokeScoreSummary } from "../karaoke-score-summary";

const meta = {
  title: "Compositions/Karaoke/KaraokeScoreSummary",
  component: KaraokeScoreSummary,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-[min(24rem,calc(100vw-2rem))]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof KaraokeScoreSummary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Complete: Story = {
  name: "Complete — performance",
  args: {
    finalScore: 0.86,
    timingScore: 0.88,
    lyricsScore: 0.84,
    scoredLineCount: 11,
    lineCount: 12,
  },
};

export const SomeLinesUnmeasured: Story = {
  name: "Complete — some lines unmeasured",
  args: {
    finalScore: 0.7,
    timingScore: 0.74,
    lyricsScore: 0.66,
    scoredLineCount: 8,
    lineCount: 10,
    uncertainLineCount: 2,
  },
};
