import type { Meta, StoryObj } from "@storybook/react-vite";

import { AutoResizeTextarea } from "./auto-resize-textarea";
import { Type } from "./type";

const meta = {
  title: "Primitives/AutoResizeTextarea",
  component: AutoResizeTextarea,
  args: {
    maxRows: 5,
    placeholder: "Type a message...",
    rows: 1,
  },
} satisfies Meta<typeof AutoResizeTextarea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithContent: Story = {
  args: {
    defaultValue: "The field grows as the content wraps onto additional lines.",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: "Readonly preview",
  },
};

export const InForm: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-2">
      <Type as="label" variant="label">
        Message
      </Type>
      <AutoResizeTextarea maxRows={4} placeholder="Type a message..." rows={2} />
      <Type as="p" variant="caption">
        Your message will expand until it reaches the row limit.
      </Type>
    </div>
  ),
};
