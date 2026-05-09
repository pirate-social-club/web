import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { CommunityHandlePolicyEditorPage } from "../community-handle-policy-editor-page";
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

function InteractiveStory({
  initialDraft,
  hasNamespace = true,
}: {
  initialDraft: HandlePolicyDraft;
  hasNamespace?: boolean;
}) {
  const [draft, setDraft] = React.useState<HandlePolicyDraft>(initialDraft);

  return (
    <CommunityHandlePolicyEditorPage
      draft={draft}
      hasChanges={false}
      hasNamespace={hasNamespace}
      namespaceLabel={hasNamespace ? "ethiopia" : null}
      onDraftChange={setDraft}
      onSave={() => {}}
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
