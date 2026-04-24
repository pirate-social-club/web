import type { Meta, StoryObj } from "@storybook/react-vite";

import { Type } from "./type";

const meta = {
  title: "Primitives/Type",
  component: Type,
  args: {
    children: "The quick brown fox jumps over the lazy dog.",
  },
  argTypes: {
    variant: {
      control: "select",
      options: [
        "display",
        "h1",
        "h2",
        "h3",
        "h4",
        "body",
        "body-strong",
        "label",
        "caption",
        "overline",
      ],
    },
    as: {
      control: "text",
    },
  },
} satisfies Meta<typeof Type>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: "body",
  },
};

export const Scale: Story = {
  render: () => (
    <div className="space-y-6">
      <Type as="h1" variant="display">
        Display
      </Type>
      <Type as="h1" variant="h1">
        Heading 1
      </Type>
      <Type as="h2" variant="h2">
        Heading 2
      </Type>
      <Type as="h3" variant="h3">
        Heading 3
      </Type>
      <Type as="h4" variant="h4">
        Heading 4
      </Type>
      <Type variant="body">Body — The quick brown fox jumps over the lazy dog.</Type>
      <Type variant="body-strong">Body strong — The quick brown fox jumps over the lazy dog.</Type>
      <Type variant="label">Label</Type>
      <Type variant="caption">Caption — The quick brown fox jumps over the lazy dog.</Type>
      <Type variant="overline">Overline</Type>
    </div>
  ),
};
