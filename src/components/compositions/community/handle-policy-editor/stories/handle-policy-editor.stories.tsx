import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { CommunityHandlePolicyEditorPage } from "../community-handle-policy-editor-page";
import { parseGatePolicyToTreeDraft } from "@/app/authenticated-helpers/community-gate-tree-draft";
import type { HandlePolicyDraft } from "@/app/authenticated-state/use-community-handle-policy-state";

const meta = {
  title: "Compositions/Community/HandlePolicyEditor",
  component: CommunityHandlePolicyEditorPage,
  args: {
    hasChanges: false,
    hasNamespace: true,
    namespaceLabel: "ethiopia",
    saveDisabled: false,
    saveLoading: false,
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="min-h-screen bg-background p-6 text-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CommunityHandlePolicyEditorPage>;

export default meta;

type Story = StoryObj<typeof meta>;

function defaultDraft(overrides: Partial<HandlePolicyDraft> = {}): HandlePolicyDraft {
  return {
    claimsEnabled: true,
    claimGateMode: "none",
    claimGateTreeDraft: parseGatePolicyToTreeDraft(null),
    labelClaimRules: [],
    pricingMode: "premium_short",
    standardPriceCents: 500,
    premiumPriceCents: 2500,
    premiumMaxLength: 4,
    minLength: 3,
    maxLength: 32,
    reservedLabels: "",
    specialPrices: [
      "crown: 1000.00",
      "👑: 1000.00",
      "prince: 500.00",
      "🤴: 500.00",
      "👸: 500.00",
      "diamond: 750.00",
      "💎: 750.00",
    ].join("\n"),
    ...overrides,
  };
}

type StoryNamespace = {
  value: string;
  label: string;
  suffix: string;
};

function InteractiveStory({
  initialDraft,
  hasNamespace = true,
  namespaces,
  initialNamespace,
  policyConflict = false,
  hasChanges = false,
}: {
  initialDraft: HandlePolicyDraft;
  hasNamespace?: boolean;
  namespaces?: StoryNamespace[];
  initialNamespace?: string;
  policyConflict?: boolean;
  hasChanges?: boolean;
}) {
  const [draft, setDraft] = React.useState<HandlePolicyDraft>(initialDraft);
  const [selectedNamespace, setSelectedNamespace] = React.useState<string | null>(
    initialNamespace ?? namespaces?.[0]?.value ?? null,
  );
  const selected = namespaces?.find((namespace) => namespace.value === selectedNamespace) ?? null;

  return (
    <CommunityHandlePolicyEditorPage
      draft={draft}
      hasChanges={hasChanges}
      hasNamespace={hasNamespace}
      namespaceLabel={hasNamespace ? "ethiopia" : null}
      namespaceOptions={namespaces?.map(({ value, label }) => ({ value, label }))}
      namespaceSuffix={selected?.suffix ?? null}
      onDraftChange={setDraft}
      onLoadLatestPolicy={() => {}}
      onOverwritePolicyConflict={() => {}}
      onSave={() => {}}
      onSelectNamespace={setSelectedNamespace}
      policyConflict={policyConflict}
      saveDisabled={policyConflict}
      selectedNamespaceVerification={selectedNamespace}
    />
  );
}

export const Default: Story = {
  name: "Default",
  render: () => (
    <InteractiveStory
      initialDraft={defaultDraft({
        pricingMode: "premium_short",
        standardPriceCents: 500,
        premiumPriceCents: 2500,
        premiumMaxLength: 4,
      })}
    />
  ),
};

export const PremiumShortNames: Story = {
  name: "Pricing / Premium short names",
  render: () => (
    <InteractiveStory
      initialDraft={defaultDraft({
        pricingMode: "premium_short",
        standardPriceCents: 500,
        premiumPriceCents: 2500,
        premiumMaxLength: 4,
      })}
    />
  ),
};

export const FlatPrice: Story = {
  name: "Pricing / Flat price",
  render: () => (
    <InteractiveStory
      initialDraft={defaultDraft({
        pricingMode: "flat",
        standardPriceCents: 500,
      })}
    />
  ),
};

export const WithReservedNames: Story = {
  name: "Rules / Reserved names filled",
  render: () => (
    <InteractiveStory
      initialDraft={defaultDraft({
        pricingMode: "flat",
        standardPriceCents: 500,
        minLength: 3,
        maxLength: 32,
        reservedLabels: "admin, mod, support, official",
      })}
    />
  ),
};

export const WithPerNameRequirements: Story = {
  name: "Rules / Per-name requirements",
  render: () => (
    <InteractiveStory
      initialDraft={defaultDraft({
        labelClaimRules: [
          {
            key: "charizard-rule",
            selectorType: "exact",
            labelsText: "charizard",
            gateTreeDraft: parseGatePolicyToTreeDraft({
              version: 1,
              expression: {
                op: "gate",
                gate: {
                  type: "erc721_inventory_match",
                  provider: "courtyard",
                  chain_namespace: "eip155:137",
                  contract_address: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
                  min_quantity: 1,
                  match: { category: "trading_card", franchise: "Pokemon", subject: "Charizard" },
                },
              },
            }),
          },
          {
            key: "claimed-name-rule",
            selectorType: "any",
            labelsText: "",
            gateTreeDraft: parseGatePolicyToTreeDraft({
              version: 1,
              expression: {
                op: "gate",
                gate: {
                  type: "erc721_inventory_match",
                  provider: "courtyard",
                  chain_namespace: "eip155:137",
                  contract_address: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
                  min_quantity: 1,
                  match: { category: "trading_card", franchise: "Pokemon", subject: "{label}" },
                },
              },
            }),
          },
        ],
      })}
    />
  ),
};

const POKEMON_NAMESPACES: StoryNamespace[] = [
  { value: "nv_pokemon", label: ".pokemon names (primary)", suffix: ".pokemon" },
  { value: "nv_charizard", label: ".charizard names", suffix: ".charizard" },
  { value: "nv_collectors", label: "@collectors names", suffix: "@collectors" },
];

export const MultipleNamespaces: Story = {
  name: "Namespaces / Multiple attached (selector)",
  render: () => (
    <InteractiveStory
      initialDraft={defaultDraft()}
      namespaces={POKEMON_NAMESPACES}
      initialNamespace="nv_pokemon"
    />
  ),
};

export const MirrorWithCardGate: Story = {
  name: "Namespaces / Mirror selected with card gate",
  render: () => (
    <InteractiveStory
      namespaces={POKEMON_NAMESPACES}
      initialNamespace="nv_charizard"
      initialDraft={defaultDraft({
        claimGateMode: "explicit",
        claimGateTreeDraft: parseGatePolicyToTreeDraft({
          version: 1,
          expression: {
            op: "gate",
            gate: {
              type: "erc721_inventory_match",
              provider: "courtyard",
              chain_namespace: "eip155:137",
              contract_address: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
              min_quantity: 1,
              match: { category: "trading_card", franchise: "Pokemon", subject: "Charizard" },
            },
          },
        }),
        labelClaimRules: [
          {
            key: "claimed-name-rule",
            selectorType: "any",
            labelsText: "",
            gateTreeDraft: parseGatePolicyToTreeDraft({
              version: 1,
              expression: {
                op: "gate",
                gate: {
                  type: "erc721_inventory_match",
                  provider: "courtyard",
                  chain_namespace: "eip155:137",
                  contract_address: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
                  min_quantity: 1,
                  match: { category: "trading_card", franchise: "Pokemon", subject: "{label}" },
                },
              },
            }),
          },
        ],
      })}
    />
  ),
};

export const ConcurrentEditConflict: Story = {
  name: "State / Concurrent edit conflict",
  render: () => (
    <InteractiveStory
      initialDraft={defaultDraft({ claimsEnabled: false })}
      namespaces={POKEMON_NAMESPACES}
      initialNamespace="nv_pokemon"
      policyConflict
      hasChanges
    />
  ),
};

export const ClaimsDisabled: Story = {
  name: "State / Claims disabled",
  render: () => (
    <InteractiveStory
      initialDraft={defaultDraft({
        claimsEnabled: false,
        pricingMode: "flat",
        standardPriceCents: 500,
      })}
    />
  ),
};

export const NoNamespace: Story = {
  name: "Guard / No namespace verified",
  render: () => (
    <InteractiveStory
      hasNamespace={false}
      initialDraft={defaultDraft()}
    />
  ),
};
