import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { CheckboxCard } from "./checkbox-card";

const meta = {
  title: "Primitives/CheckboxCard",
  component: CheckboxCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof CheckboxCard>;

export default meta;

type Story = StoryObj<typeof meta>;

function InteractiveCheckboxCard(props: Omit<React.ComponentProps<typeof CheckboxCard>, "checked" | "onCheckedChange">) {
  const [checked, setChecked] = React.useState(false);
  return <CheckboxCard {...props} checked={checked} onCheckedChange={setChecked} />;
}

function InteractiveMultiCheckboxCard() {
  const [gates, setGates] = React.useState({
    nationality: false,
    gender: false,
    wallet_score: false,
  });

  return (
    <div className="w-full max-w-md space-y-3">
      <CheckboxCard
        checked={gates.nationality}
        description="Require nationality verification through Self."
        title="Nationality verification"
        onCheckedChange={(checked) => setGates((prev) => ({ ...prev, nationality: checked }))}
      />
      <CheckboxCard
        checked={gates.gender}
        description="Require the Self document marker on a verified document."
        title="Self document marker"
        onCheckedChange={(checked) => setGates((prev) => ({ ...prev, gender: checked }))}
      />
      <CheckboxCard
        checked={gates.wallet_score}
        description="Require a minimum Passport wallet score."
        title="Passport score"
        onCheckedChange={(checked) => setGates((prev) => ({ ...prev, wallet_score: checked }))}
      />
    </div>
  );
}

export const Default: Story = {
  args: { title: "Nationality verification", description: "Require nationality verification through Self." },
  render: () => (
    <InteractiveCheckboxCard
      description="Require nationality verification through Self."
      title="Nationality verification"
    />
  ),
};

export const Checked: Story = {
  args: {
    checked: true,
    description: "Require nationality verification through Self.",
    title: "Nationality verification",
  },
};

export const Disabled: Story = {
  args: {
    checked: false,
    description: "This gate is not available in v0.",
    disabled: true,
    disabledHint: "Deferred to a future release.",
    title: "Token balance gate",
  },
};

export const MultiSelect: Story = {
  name: "Multi-select group",
  args: { title: "Multi-select", description: "" },
  render: () => <InteractiveMultiCheckboxCard />,
};
