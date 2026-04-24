import type { Meta, StoryObj } from "@storybook/react-vite";

import { FormattedText } from "./formatted-text";

const meta = {
  title: "Primitives/FormattedText",
  component: FormattedText,
  args: {
    value: "A paragraph with **bold**, *italic*, ***bold italic***, ~~struck~~, and [a link](https://pirate.sc).\n\n> A quoted line that keeps its own rhythm.\n\n- First bullet\n- Second bullet\n\n1. First step\n2. Second step",
  },
} satisfies Meta<typeof FormattedText>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="max-w-2xl rounded-lg border border-border-soft bg-card p-5">
      <FormattedText {...args} />
    </div>
  ),
};

export const RightToLeft: Story = {
  args: {
    dir: "rtl",
    lang: "ar",
    value: "فقرة قصيرة مع **نص بارز** ورابط [Pirate](https://pirate.sc).\n\n- عنصر أول\n- عنصر ثان",
  },
  render: (args) => (
    <div className="max-w-2xl rounded-lg border border-border-soft bg-card p-5">
      <FormattedText {...args} />
    </div>
  ),
};
