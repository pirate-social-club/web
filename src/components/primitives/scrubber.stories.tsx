import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Scrubber } from "./scrubber";

const meta = {
  title: "Primitives/Scrubber",
  component: Scrubber,
  args: {
    max: 100,
    showThumb: false,
    value: 32,
  },
} satisfies Meta<typeof Scrubber>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = React.useState(args.value ?? 32);

    return (
      <div className="max-w-xl space-y-3 rounded-[var(--radius-xl)] border border-border-soft bg-card p-5">
        <div className="flex items-center justify-between text-base text-muted-foreground">
          <span>Playback</span>
          <span>{value}%</span>
        </div>
        <Scrubber {...args} value={value} onChange={setValue} />
      </div>
    );
  },
};

export const WithVisibleThumb: Story = {
  args: {
    showThumb: true,
    value: 68,
  },
};
