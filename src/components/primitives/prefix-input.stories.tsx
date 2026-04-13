import type { Meta, StoryObj } from "@storybook/react-vite";

import { PrefixInput } from "./prefix-input";

const meta = {
  title: "Primitives/PrefixInput",
  component: PrefixInput,
  args: {
    prefix: "u/",
    placeholder: "captainhook",
  },
} satisfies Meta<typeof PrefixInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div className="max-w-xl space-y-3">
      <PrefixInput prefix="u/" placeholder="captainhook" />
      <PrefixInput prefix="c/" placeholder="pirate-music" size="lg" />
    </div>
  ),
};
