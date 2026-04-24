import type { Meta, StoryObj } from "@storybook/react-vite";

import { RadioIndicator } from "./radio-indicator";

const meta = {
  title: "Primitives/RadioIndicator",
  component: RadioIndicator,
} satisfies Meta<typeof RadioIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div className="flex items-center gap-6 rounded-lg border border-border-soft bg-card p-5">
      <span className="inline-flex items-center gap-3">
        <RadioIndicator checked />
        Selected
      </span>
      <span className="inline-flex items-center gap-3">
        <RadioIndicator />
        Unselected
      </span>
    </div>
  ),
};
