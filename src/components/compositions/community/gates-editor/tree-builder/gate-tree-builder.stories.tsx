import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import type { GateBuilderGroupDraft } from "@/app/authenticated-helpers/community-gate-tree-draft";
import { GateTreeBuilder } from "./gate-tree-builder";

const meta = {
  title: "Compositions/Community/Moderation/Gates/Tree Builder",
  component: GateTreeBuilder,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof GateTreeBuilder>;

export default meta;

type Story = StoryObj<typeof meta>;

function InteractiveStory({ initialValue }: { initialValue: GateBuilderGroupDraft }) {
  const [value, setValue] = React.useState(initialValue);
  return <GateTreeBuilder devPreview value={value} onChange={setValue} />;
}

const humanSelf = { kind: "rule", gate: { type: "unique_human", provider: "self" } } as const;
const humanVery = { kind: "rule", gate: { type: "unique_human", provider: "very" } } as const;
const antiBot = { kind: "rule", gate: { type: "altcha_pow" } } as const;
const score20 = { kind: "rule", gate: { type: "wallet_score", provider: "passport", minimum_score: 20 } } as const;
const nationality = {
  kind: "rule",
  gate: { type: "nationality", provider: "self", accepted_providers: ["self", "zkpassport"], allowed: ["US", "CA"] },
} as const;
const bayc = {
  kind: "rule",
  gate: {
    type: "erc721_holding",
    chain_namespace: "eip155:1",
    contract_address: "0xBC4CA0EDA7647A8AB7C2061C2E118A18A936F13D",
  },
} as const;
const charizard = {
  kind: "rule",
  gate: {
    type: "erc721_inventory_match",
    provider: "courtyard",
    chain_namespace: "eip155:137",
    contract_address: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
    min_quantity: 1,
    match: {
      category: "trading_card",
      franchise: "Pokemon",
      subject: "Charizard",
      grade: "PSA 9",
    },
  },
} as const;

export const HumansOnly: Story = {
  render: () => <InteractiveStory initialValue={{ kind: "group", op: "or", children: [humanSelf, humanVery] }} />,
};

export const StopSpam: Story = {
  render: () => <InteractiveStory initialValue={{ kind: "group", op: "or", children: [antiBot, humanSelf, humanVery] }} />,
};

export const HumanWithFallbacks: Story = {
  render: () => <InteractiveStory initialValue={{ kind: "group", op: "or", children: [humanSelf, humanVery, score20, bayc] }} />,
};

export const NftClub: Story = {
  render: () => <InteractiveStory initialValue={{ kind: "group", op: "and", children: [bayc] }} />,
};

export const CourtyardCharizard: Story = {
  render: () => <InteractiveStory initialValue={{ kind: "group", op: "and", children: [charizard] }} />,
};

export const NationalityRule: Story = {
  render: () => <InteractiveStory initialValue={{ kind: "group", op: "and", children: [nationality] }} />,
};

export const HumanAndAntiBotOrScore: Story = {
  render: () => (
    <InteractiveStory
      initialValue={{
        kind: "group",
        op: "and",
        children: [
          humanVery,
          { kind: "group", op: "or", children: [antiBot, score20] },
        ],
      }}
    />
  ),
};

export const HumanOrAntiBotOrScore: Story = {
  render: () => <InteractiveStory initialValue={{ kind: "group", op: "or", children: [humanVery, antiBot, score20] }} />,
};

export const RepeatedNftRules: Story = {
  render: () => (
    <InteractiveStory
      initialValue={{
        kind: "group",
        op: "or",
        children: [
          bayc,
          {
            kind: "rule",
            gate: {
              type: "erc721_holding",
              chain_namespace: "eip155:1",
              contract_address: "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB",
            },
          },
        ],
      }}
    />
  ),
};

export const UnknownRequirement: Story = {
  render: () => (
    <InteractiveStory
      initialValue={{
        kind: "group",
        op: "and",
        children: [
          humanSelf,
          {
            kind: "rule",
            gate: {
              type: "nft_trait_snapshot_match",
              chain_namespace: "eip155:1",
              contract_address: "0x0000000000000000000000000000000000000000",
              match: { Fur: ["Gold"] },
            } as never,
          },
        ],
      }}
    />
  ),
};
