import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { FormattedTextarea } from "./formatted-textarea";
import { FormattedText } from "./formatted-text";

const meta = {
  title: "Primitives/FormattedTextarea",
  component: FormattedTextarea,
} satisfies Meta<typeof FormattedTextarea>;

export default meta;

type Story = StoryObj<typeof meta>;

function EditableExample() {
  const [value, setValue] = React.useState("Write a **formatted** post.\n\n- Use bullets\n- Add links");

  return (
    <div className="grid w-[min(48rem,90vw)] gap-4 md:grid-cols-2">
      <FormattedTextarea aria-label="Formatted body" onChange={setValue} value={value} />
      <div className="rounded-lg border border-border-soft bg-card p-4">
        <FormattedText value={value} />
      </div>
    </div>
  );
}

export const Editable: Story = {
  args: {
    value: "",
  },
  render: () => <EditableExample />,
};
