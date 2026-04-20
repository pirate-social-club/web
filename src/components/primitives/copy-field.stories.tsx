import type { Meta, StoryObj } from "@storybook/react-vite";

import { CopyField } from "./copy-field";

const meta = {
  title: "Primitives/CopyField",
  component: CopyField,
  parameters: {
    layout: "centered",
  },
  args: {
    value: "pirate-verify-space @american 7f3c21",
  },
  render: (args) => <div style={{ width: "100%", maxWidth: "480px" }}><CopyField {...args} /></div>,
} satisfies Meta<typeof CopyField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TxtRecord: Story = {
  args: {
    value: "pirate-verify=a3f7c9e2",
  },
};

export const WalletAddress: Story = {
  args: {
    value: "0x42a5f77f2d06c9a7e304817b3c177b91e0c2f3a8",
  },
};

export const LongCommand: Story = {
  args: {
    value: "bun run agents:openclaw:challenge --api-url http://127.0.0.1:8787 --token eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0 --wait",
  },
};
