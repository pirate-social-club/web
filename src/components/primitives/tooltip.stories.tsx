import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

const meta = {
  title: "Primitives/Tooltip",
  component: TooltipContent,
} satisfies Meta<typeof TooltipContent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex min-h-40 items-center justify-center rounded-[var(--radius-xl)] border border-border-soft bg-card p-5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary">Hover target</Button>
          </TooltipTrigger>
          <TooltipContent>Quick action details</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
};
