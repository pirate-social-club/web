import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { EditableNumberInput } from "./editable-number-input";

const meta = {
  title: "Primitives/EditableNumberInput",
  component: EditableNumberInput,
  args: {
    min: 0,
    max: 100,
    value: 20,
  },
} satisfies Meta<typeof EditableNumberInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function StoryRender(args) {
    const [value, setValue] = React.useState(args.value);

    return (
      <div className="w-24">
        <EditableNumberInput {...args} value={value} onValueChange={setValue} />
      </div>
    );
  },
};
