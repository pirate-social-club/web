import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import type { GateBuilderGroupDraft } from "@/app/authenticated-helpers/community-gate-tree-draft";
import { GateTreeBuilder } from "./gate-tree-builder";
import type { AssetSourceDescriptor, CollectionCapabilitySource, FacetValueSuggestion } from "./collection-capability-source";

const meta = {
  title: "Compositions/Community/Moderation/Gates/Tree Builder",
  component: GateTreeBuilder,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof GateTreeBuilder>;

export default meta;

type Story = StoryObj<typeof meta>;

function InteractiveStory({
  capabilitySource,
  initialValue,
}: {
  capabilitySource?: CollectionCapabilitySource;
  initialValue: GateBuilderGroupDraft;
}) {
  const [value, setValue] = React.useState(initialValue);
  return <GateTreeBuilder capabilitySource={capabilitySource} devPreview value={value} onChange={setValue} />;
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

export const HumansOnlyWithTrustedSources: Story = {
  render: () => <InteractiveStory capabilitySource={mockCapabilitySource} initialValue={{ kind: "group", op: "or", children: [humanSelf, humanVery] }} />,
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

export const LoadedCharizardGate: Story = {
  render: () => <InteractiveStory initialValue={{ kind: "group", op: "and", children: [charizard] }} />,
};

export const RequireCharizardCard: Story = {
  render: () => <InteractiveStory capabilitySource={mockCapabilitySource} initialValue={{ kind: "group", op: "and", children: [charizard] }} />,
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

const mockSources: AssetSourceDescriptor[] = [
  {
    id: "courtyard-graded-cards",
    label: "Courtyard graded cards",
    chainNamespace: "eip155:137",
    contractAddress: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
    standard: "erc721",
    traitFiltersSupported: true,
    facetKeys: ["category", "franchise", "subject", "grade"],
    fixedMatch: { category: "trading_card", franchise: "Pokemon" },
    inventoryProvider: "courtyard",
    maxValuesPerFacet: 1,
    minQuantitySupported: true,
    provenanceLabel: "Traits verified via Courtyard",
  },
  {
    id: "courtyard-watches",
    label: "Courtyard watches",
    chainNamespace: "eip155:137",
    contractAddress: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
    standard: "erc721",
    traitFiltersSupported: true,
    facetKeys: ["category", "brand", "model", "reference"],
    fixedMatch: { category: "watch" },
    inventoryProvider: "courtyard",
    maxValuesPerFacet: 1,
    minQuantitySupported: true,
    provenanceLabel: "Traits verified via Courtyard",
  },
  {
    id: "bayc",
    label: "Bored Ape Yacht Club",
    chainNamespace: "eip155:1",
    contractAddress: "0xBC4CA0EDA7647A8AB7C2061C2E118A18A936F13D",
    standard: "erc721",
    traitFiltersSupported: false,
    facetKeys: [],
    maxValuesPerFacet: 1,
  },
];

const mockFacetValues: Record<string, Record<string, FacetValueSuggestion[]>> = {
  "courtyard-graded-cards": {
    subject: [
      { value: "Blastoise", approximateCount: 283 },
      { value: "Bulbasaur", approximateCount: 351 },
      { value: "Charizard", approximateCount: 412 },
      { value: "Charmander", approximateCount: 296 },
      { value: "Charmeleon", approximateCount: 117 },
      { value: "Dragonite", approximateCount: 148 },
      { value: "Gengar", approximateCount: 389 },
      { value: "Mewtwo", approximateCount: 227 },
      { value: "Pikachu", approximateCount: 620 },
      { value: "Squirtle", approximateCount: 244 },
      { value: "Venusaur", approximateCount: 179 },
    ],
    grade: [
      { value: "PSA 10", approximateCount: 96 },
      { value: "PSA 9", approximateCount: 412 },
      { value: "PSA 8", approximateCount: 538 },
      { value: "BGS 9.5", approximateCount: 74 },
      { value: "CGC 9", approximateCount: 121 },
    ],
  },
  "courtyard-watches": {
    brand: [
      { value: "Rolex", approximateCount: 210 },
      { value: "Omega", approximateCount: 88 },
      { value: "Patek Philippe", approximateCount: 31 },
    ],
    model: [
      { value: "Submariner", approximateCount: 74 },
      { value: "Speedmaster", approximateCount: 43 },
      { value: "Nautilus", approximateCount: 12 },
    ],
  },
};

const mockCapabilitySource: CollectionCapabilitySource = {
  async estimateMatchCount(sourceId, match) {
    if (sourceId === "courtyard-graded-cards" && match.subject === "Charizard" && match.grade === "PSA 9") {
      return 412;
    }
    return Object.entries(match).filter(([key]) => key !== "category" && key !== "franchise").length > 0 ? 96 : null;
  },
  async listTrustedSources() {
    return mockSources;
  },
  async probeContract(chainNamespace, contractAddress) {
    return mockSources.find((source) =>
      source.chainNamespace === chainNamespace
      && source.contractAddress.toLowerCase() === contractAddress.toLowerCase()
    ) ?? null;
  },
  async searchFacetValues(sourceId, facetKey, query) {
    const values = mockFacetValues[sourceId]?.[facetKey] ?? [];
    const normalizedQuery = query.trim().toLowerCase();
    return normalizedQuery
      ? values.filter((value) => value.value.toLowerCase().includes(normalizedQuery))
      : values;
  },
};
