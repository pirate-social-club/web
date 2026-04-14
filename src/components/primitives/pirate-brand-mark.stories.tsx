import type { Meta, StoryObj } from "@storybook/react-vite";

import { PirateBrandMark } from "./pirate-brand-mark";

const meta = {
  title: "Primitives/PirateBrandMark",
  component: PirateBrandMark,
} satisfies Meta<typeof PirateBrandMark>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-4 rounded-[var(--radius-xl)] border border-border-soft bg-card p-5">
      <PirateBrandMark decorative={false} className="h-12 w-12" />
      <PirateBrandMark className="h-16 w-16" />
    </div>
  ),
};
