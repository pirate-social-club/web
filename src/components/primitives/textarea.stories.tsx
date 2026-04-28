import type { Meta, StoryObj } from "@storybook/react-vite";

import { AutoResizeTextarea } from "./auto-resize-textarea";
import { Textarea } from "./textarea";

const meta = {
  title: "Primitives/Textarea",
  component: Textarea,
  args: {
    placeholder: "Type your message here...",
  },
} satisfies Meta<typeof Textarea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  render: () => <Textarea placeholder="Disabled textarea" disabled />,
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-2">
      <label className="text-base font-medium leading-none">Message</label>
      <Textarea placeholder="Type your message here." />
      <p className="text-base text-muted-foreground">Your message will be copied to the support team.</p>
    </div>
  ),
};

export const AutoResize: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-4">
      <AutoResizeTextarea
        className="min-h-11 rounded-[var(--radius-2_5xl)] py-2.5 leading-5"
        maxRows={5}
        placeholder="Type a message..."
        rows={1}
      />
      <AutoResizeTextarea
        placeholder="Type a longer message..."
        rows={3}
      />
    </div>
  ),
};
