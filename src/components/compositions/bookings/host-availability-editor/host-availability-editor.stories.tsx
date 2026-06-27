import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  HostAvailabilityEditor,
  type AvailabilityRuleDraft,
  type PriceRuleDraft,
  type AvailabilityExceptionDraft,
} from "../host-availability-editor/host-availability-editor";

const meta = {
  title: "Compositions/Bookings/HostAvailabilityEditor",
  component: HostAvailabilityEditor,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof HostAvailabilityEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

const initialRules: AvailabilityRuleDraft[] = [
  {
    id: "rule-1",
    byWeekday: [1, 2, 3, 4, 5],
    startLocal: "09:00",
    endLocal: "17:00",
    slotDurationMinutes: 30,
  },
  {
    id: "rule-2",
    byWeekday: [0, 6],
    startLocal: "10:00",
    endLocal: "14:00",
    slotDurationMinutes: 30,
  },
];

const initialPriceRules: PriceRuleDraft[] = [
  {
    id: "price-1",
    matchWeekday: [1, 2, 3, 4, 5],
    startLocal: "09:00",
    endLocal: "12:00",
    priceCents: 6000,
  },
];

const initialExceptions: AvailabilityExceptionDraft[] = [
  {
    id: "exc-1",
    kind: "block",
    startUtc: "2026-07-04T00:00:00Z",
    endUtc: "2026-07-04T23:59:59Z",
  },
];

function InteractiveStory() {
  const [rules, setRules] = React.useState(initialRules);
  const [priceRules, setPriceRules] = React.useState(initialPriceRules);
  const [exceptions, setExceptions] = React.useState(initialExceptions);
  return (
    <HostAvailabilityEditor
      rules={rules}
      priceRules={priceRules}
      exceptions={exceptions}
      onRulesChange={setRules}
      onPriceRulesChange={setPriceRules}
      onExceptionsChange={setExceptions}
    />
  );
}

export const Default: Story = {
  render: () => (
    <div className="mx-auto max-w-2xl p-4">
      <InteractiveStory />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="mx-auto max-w-2xl p-4">
      <HostAvailabilityEditor
        rules={[]}
        priceRules={[]}
        exceptions={[]}
      />
    </div>
  ),
};

export const Mobile: Story = {
  render: () => (
    <div className="mx-auto max-w-sm p-4">
      <InteractiveStory />
    </div>
  ),
};
