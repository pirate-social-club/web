import type { Meta, StoryObj } from "@storybook/react-vite";

import { Waveform } from "./waveform";

const meta = {
  title: "Primitives/Waveform",
  component: Waveform,
  args: {
    seed: "midnight-waves",
    progressFraction: 0.28,
  },
} satisfies Meta<typeof Waveform>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="max-w-xl rounded-[var(--radius-lg)] border border-border-soft bg-card p-5">
      <Waveform {...args} />
    </div>
  ),
};

export const WithPeaks: Story = {
  args: {
    peaks: [0.18, 0.42, 0.7, 0.35, 0.88, 0.54, 0.3, 0.62, 0.22, 0.76, 0.48, 0.31],
    progressFraction: 0.5,
    seed: "explicit-peaks",
  },
};
