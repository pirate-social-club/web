import type { Meta, StoryObj } from "@storybook/react-vite";
import { Check, CurrencyEth } from "@phosphor-icons/react";

import { BadgedCircle } from "./badged-circle";

const meta = {
  title: "Primitives/BadgedCircle",
  component: BadgedCircle,
  args: {
    badge: (
      <span className="grid size-full place-items-center bg-success text-success-foreground">
        <Check className="size-3" />
      </span>
    ),
    badgeLabel: "Verified",
    badgeSize: 18,
    children: (
      <span className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
        <CurrencyEth className="size-7" />
      </span>
    ),
  },
} satisfies Meta<typeof BadgedCircle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Offset: Story = {
  args: {
    badgeOffsetPercent: 24,
  },
};
