import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { Button } from "@/components/primitives/button";
import { SortControlRow } from "../sort-control-row";

const meta = {
  title: "Compositions/SortControlRow",
  component: SortControlRow,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="w-[min(100vw-2rem,40rem)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SortControlRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary">Best</Button>
        <Button size="sm" variant="ghost">New</Button>
        <Button size="sm" variant="ghost">Top</Button>
      </div>
    ),
  },
};

export const Empty: Story = {
  args: {
    children: null,
  },
};
