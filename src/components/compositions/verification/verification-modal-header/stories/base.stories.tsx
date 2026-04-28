import type { Meta, StoryObj } from "@storybook/react-vite";

import { VerificationIconBadge } from "../verification-modal-header";

const meta = {
  title: "Compositions/Verification/VerificationModalHeader",
  component: VerificationIconBadge,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof VerificationIconBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  args: {
    icon: "ready",
  },
};

export const Blocked: Story = {
  args: {
    icon: "blocked",
  },
};

export const Passport: Story = {
  args: {
    icon: "passport",
  },
};

export const Self: Story = {
  args: {
    icon: "self",
  },
};

export const Very: Story = {
  args: {
    icon: "very",
  },
};

export const Join: Story = {
  args: {
    icon: "join",
  },
};

export const Pending: Story = {
  args: {
    icon: "pending",
  },
};

export const IconGrid: Story = {
  args: { icon: "ready" },
  render: () => (
    <div className="flex flex-wrap gap-4">
      <VerificationIconBadge icon="ready" />
      <VerificationIconBadge icon="blocked" />
      <VerificationIconBadge icon="passport" />
      <VerificationIconBadge icon="self" />
      <VerificationIconBadge icon="very" />
      <VerificationIconBadge icon="join" />
      <VerificationIconBadge icon="pending" />
    </div>
  ),
};
