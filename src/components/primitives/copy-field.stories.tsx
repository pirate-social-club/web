import type { Meta, StoryObj } from "@storybook/react-vite";

import { CopyField } from "./copy-field";

const meta = {
  title: "Primitives/CopyField",
  component: CopyField,
  args: {
    value: "pirate-verify-space @american 7f3c21",
  },
} satisfies Meta<typeof CopyField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TxtRecord: Story = {
  args: {
    value: "pirate-verify=a3f7c9e2",
  },
};
