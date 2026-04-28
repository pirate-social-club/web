import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { CourtyardWalletGateBuilder } from "../courtyard-wallet-gate-builder";
import type { CourtyardWalletInventoryGroup } from "@/lib/courtyard-inventory-gates";

const cardGroups: CourtyardWalletInventoryGroup[] = [
  {
    category: "trading_card",
    franchise: "pokemon",
    subject: "charizard",
    displayLabel: "Pokemon Charizard",
    displayDetail: "4 in wallet",
    count: 4,
  },
  {
    category: "trading_card",
    franchise: "pokemon",
    subject: "pikachu",
    displayLabel: "Pokemon Pikachu",
    displayDetail: "2 in wallet",
    count: 2,
  },
  {
    category: "trading_card",
    franchise: "magic",
    subject: "black lotus",
    displayLabel: "Magic Black Lotus",
    displayDetail: "1 in wallet",
    count: 1,
  },
];

const watchGroups: CourtyardWalletInventoryGroup[] = [
  {
    category: "watch",
    brand: "rolex",
    model: "submariner",
    reference: "124060",
    displayLabel: "Rolex Submariner",
    displayDetail: "2 in wallet",
    count: 2,
  },
  {
    category: "watch",
    brand: "rolex",
    model: "gmt-master",
    displayLabel: "Rolex GMT-Master",
    displayDetail: "1 in wallet",
    count: 1,
  },
  {
    category: "watch",
    brand: "omega",
    model: "speedmaster",
    displayLabel: "Omega Speedmaster",
    displayDetail: "1 in wallet",
    count: 1,
  },
];

const meta = {
  title: "Compositions/Community/CreateCommunityComposer/CourtyardWalletGateBuilder",
  component: CourtyardWalletGateBuilder,
  args: {
    groups: null,
    loading: false,
    selectedGroup: null,
    quantity: 1,
    onSelectGroup: () => undefined,
    onQuantityChange: () => undefined,
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ maxWidth: 640 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CourtyardWalletGateBuilder>;

export default meta;

type Story = StoryObj<typeof meta>;

function InteractiveBuilder({
  groups,
  initialQuantity = 1,
}: {
  groups: CourtyardWalletInventoryGroup[] | null;
  initialQuantity?: number;
}) {
  const [selected, setSelected] = React.useState<CourtyardWalletInventoryGroup | null>(null);
  const [quantity, setQuantity] = React.useState(initialQuantity);

  return (
    <CourtyardWalletGateBuilder
      groups={groups}
      loading={false}
      quantity={quantity}
      selectedGroup={selected}
      onQuantityChange={setQuantity}
      onSelectGroup={(group) => {
        setSelected(group);
        setQuantity(Math.min(quantity, group.count));
      }}
    />
  );
}

export const Loading: Story = {
  render: () => (
    <CourtyardWalletGateBuilder
      groups={null}
      loading
      quantity={1}
      selectedGroup={null}
      onQuantityChange={() => undefined}
      onSelectGroup={() => undefined}
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <CourtyardWalletGateBuilder
      groups={[]}
      loading={false}
      quantity={1}
      selectedGroup={null}
      onQuantityChange={() => undefined}
      onSelectGroup={() => undefined}
    />
  ),
};

export const CardInventory: Story = {
  name: "Inventory / Trading Cards",
  render: () => <InteractiveBuilder groups={cardGroups} />,
};

export const WatchInventory: Story = {
  name: "Inventory / Watches",
  render: () => <InteractiveBuilder groups={watchGroups} />,
};

export const CardSelected: Story = {
  name: "Inventory / Trading Card Selected",
  render: () => {
    const selected = cardGroups[0];
    return (
      <CourtyardWalletGateBuilder
        groups={cardGroups}
        loading={false}
        quantity={3}
        selectedGroup={selected}
        onQuantityChange={() => undefined}
        onSelectGroup={() => undefined}
      />
    );
  },
};
