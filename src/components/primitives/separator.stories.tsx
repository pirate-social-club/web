import type { Meta, StoryObj } from "@storybook/react-vite";

import { Separator } from "./separator";

const meta = {
  title: "Primitives/Separator",
  component: Separator,
} satisfies Meta<typeof Separator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="max-w-xl space-y-4 rounded-[var(--radius-xl)] border border-border-soft bg-card p-5">
      <div className="text-base font-medium">Header</div>
      <Separator />
      <div className="text-base text-muted-foreground">Body content</div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-24 items-center gap-4 rounded-[var(--radius-xl)] border border-border-soft bg-card p-5">
      <span className="text-base font-medium">Left</span>
      <Separator orientation="vertical" />
      <span className="text-base text-muted-foreground">Right</span>
    </div>
  ),
};
