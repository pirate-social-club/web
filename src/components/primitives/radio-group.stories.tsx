import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { RadioGroup, RadioGroupItem } from "./radio-group";

const meta = {
  title: "Primitives/RadioGroup",
  component: RadioGroup,
} satisfies Meta<typeof RadioGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[32rem] space-y-3">
      <RadioGroup
        className="grid-cols-3"
        defaultValue="open"
      >
        <RadioGroupItem value="open">Open</RadioGroupItem>
        <RadioGroupItem value="request">Request</RadioGroupItem>
        <RadioGroupItem value="gated">Gated</RadioGroupItem>
      </RadioGroup>
      <p className="text-base text-muted-foreground">Anyone can join immediately.</p>
    </div>
  ),
};

export const Controlled: Story = {
  render: () => {
    const [value, setValue] = React.useState("thread_stable");

    return (
      <div className="w-[38rem] space-y-3">
        <RadioGroup className="grid-cols-3" onValueChange={setValue} value={value}>
          <RadioGroupItem value="community_stable">Community-stable</RadioGroupItem>
          <RadioGroupItem value="thread_stable">Thread-stable</RadioGroupItem>
          <RadioGroupItem disabled value="post_ephemeral">Post-ephemeral</RadioGroupItem>
        </RadioGroup>
        <p className="text-base text-muted-foreground">Selected: {value}</p>
      </div>
    );
  },
};
