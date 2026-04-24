import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { Switch } from "./switch";

const meta = {
  title: "Primitives/Switch",
  component: Switch,
  parameters: {
    layout: "centered",
  },
  args: {
    "aria-label": "Nationality badge",
  },
} satisfies Meta<typeof Switch>;

export default meta;

type Story = StoryObj<typeof meta>;

function InteractiveSwitch() {
  const [checked, setChecked] = React.useState(false);
  return <Switch aria-label="Nationality badge" checked={checked} onCheckedChange={setChecked} />;
}

export const Default: Story = {
  render: () => <InteractiveSwitch />,
};

export const Checked: Story = {
  args: {
    checked: true,
  },
};

export const Disabled: Story = {
  args: {
    checked: false,
    disabled: true,
  },
};
