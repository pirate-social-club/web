import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { OnboardingVerificationGate } from "../onboarding-verification-gate";

const meta = {
  title: "Compositions/OnboardingVerificationGate",
  component: OnboardingVerificationGate,
  args: {
    verificationState: "not_started",
    verificationLoading: false,
    verificationError: null,
    onVerify: () => {},
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ width: "min(100vw - 32px, 980px)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OnboardingVerificationGate>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NotStarted: Story = {
  name: "Not Started",
};

export const Pending: Story = {
  name: "Pending",
  args: {
    verificationState: "pending",
  },
};

export const Loading: Story = {
  name: "Loading",
  args: {
    verificationLoading: true,
  },
};

export const WithError: Story = {
  name: "With Error",
  args: {
    verificationError: "Could not start Very verification",
  },
};

export const MobileNotStarted: Story = {
  name: "Mobile / Not Started",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
