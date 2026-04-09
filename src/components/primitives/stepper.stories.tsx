import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { Stepper } from "./stepper";
import type { StepperProps } from "./stepper";

const steps = [
  { label: "Namespace" },
  { label: "Identity" },
  { label: "Handles" },
  { label: "Policy" },
  { label: "Review" },
];

const meta = {
  title: "Primitives/Stepper",
  component: Stepper,
  args: {
    steps,
    currentStep: 1,
  },
  argTypes: {
    currentStep: { control: { type: "range", min: 1, max: 5, step: 1 } },
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ width: "min(100vw - 32px, 640px)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Stepper>;

export default meta;

type Story = StoryObj<typeof meta>;

function InteractiveStepper({ steps: s, currentStep: initial, ...rest }: Omit<StepperProps, "currentStep"> & { currentStep?: number }) {
  const [current, setCurrent] = React.useState(initial ?? 1);
  return <Stepper {...rest} currentStep={current} onStepClick={setCurrent} steps={s} />;
}

export const Default: Story = {};

export const Step2: Story = {
  args: { currentStep: 2 },
};

export const Step3: Story = {
  args: { currentStep: 3 },
};

export const Step5Complete: Story = {
  args: { currentStep: 5 },
};

export const ThreeSteps: Story = {
  render: () => (
    <Stepper
      currentStep={2}
      steps={[
        { label: "Details" },
        { label: "Payment" },
        { label: "Confirm" },
      ]}
    />
  ),
};

export const Interactive: Story = {
  render: () => <InteractiveStepper steps={steps} />,
};
