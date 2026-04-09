import type { Meta, StoryObj } from "@storybook/react-vite";

import { Checkbox } from "./checkbox";
import { Input } from "./input";
import { Label } from "./label";

const meta = {
  title: "Primitives/Label",
  component: Label,
  args: {
    children: "Email address",
  },
  argTypes: {
    tone: {
      control: "select",
      options: ["default", "muted"],
    },
  },
} satisfies Meta<typeof Label>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Tones: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Checkbox id="label-tone-default" />
        <Label htmlFor="label-tone-default" tone="default">
          Default label
        </Label>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox id="label-tone-muted" />
        <Label htmlFor="label-tone-muted" tone="muted">
          Muted label
        </Label>
      </div>
    </div>
  ),
};

export const WithInput: Story = {
  render: () => (
    <div className="w-full max-w-sm space-y-3">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        placeholder="name@example.com"
      />
    </div>
  ),
};
