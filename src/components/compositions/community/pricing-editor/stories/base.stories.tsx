import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { CommunityPricingEditorPage } from "@/components/compositions/community/pricing-editor/community-pricing-editor-page";
import type { PricingTier, CountryAssignment } from "@/components/compositions/community/pricing-editor/community-pricing-editor-page";

const meta = {
  title: "Compositions/Community/Moderation/Pricing",
  component: CommunityPricingEditorPage,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CommunityPricingEditorPage>;

export default meta;

type Story = StoryObj<typeof meta>;

const defaultTiers: PricingTier[] = [
  { id: "t1", tier_key: "standard", display_name: "Standard", adjustment_type: "multiplier", adjustment_value: 1 },
  { id: "t2", tier_key: "reduced", display_name: "Reduced", adjustment_type: "multiplier", adjustment_value: 0.85 },
  { id: "t3", tier_key: "lower", display_name: "Lower", adjustment_type: "multiplier", adjustment_value: 0.7 },
];

const defaultAssignments: CountryAssignment[] = [
  { country_code: "US", tier_key: "standard" },
  { country_code: "IN", tier_key: "reduced" },
  { country_code: "BR", tier_key: "lower" },
];

function buildStarterStoryPolicyDraft({ localCountryCodes = [] }: { localCountryCodes?: string[] } = {}) {
  return {
    countryAssignments: [
      ...localCountryCodes.map((countryCode) => ({ country_code: countryCode, tier_key: "local_members" })),
      { country_code: "US", tier_key: "high_income" },
      { country_code: "BR", tier_key: "standard" },
      { country_code: "EC", tier_key: "reduced" },
      { country_code: "IN", tier_key: "lowest" },
    ],
    defaultTierKey: "standard",
    regionalPricingEnabled: true,
    tiers: [
      ...(localCountryCodes.length > 0 ? [{ id: "starter-local_members", tier_key: "local_members", display_name: "Local members", adjustment_type: "multiplier" as const, adjustment_value: 0.08 }] : []),
      { id: "starter-high_income", tier_key: "high_income", display_name: "High income", adjustment_type: "multiplier" as const, adjustment_value: 1 },
      { id: "starter-standard", tier_key: "standard", display_name: "Standard", adjustment_type: "multiplier" as const, adjustment_value: 0.65 },
      { id: "starter-reduced", tier_key: "reduced", display_name: "Reduced", adjustment_type: "multiplier" as const, adjustment_value: 0.4 },
      { id: "starter-lowest", tier_key: "lowest", display_name: "Lowest", adjustment_type: "multiplier" as const, adjustment_value: 0.1 },
    ],
  };
}

const baseArgs = {
  countryAssignments: [],
  defaultTierKey: "standard",
  regionalPricingEnabled: false,
  tiers: defaultTiers,
} satisfies React.ComponentProps<typeof CommunityPricingEditorPage>;

function InteractiveStory({
  initialEnabled,
  initialTiers,
  initialAssignments,
}: {
  initialEnabled: boolean;
  initialTiers: PricingTier[];
  initialAssignments: CountryAssignment[];
}) {
  const [enabled, setEnabled] = React.useState(initialEnabled);
  const [tiers, setTiers] = React.useState(initialTiers);
  const [assignments, setAssignments] = React.useState(initialAssignments);
  const [defaultKey, setDefaultKey] = React.useState<string | null>(initialTiers[0]?.tier_key ?? null);

  function useStarterTemplate() {
    const starter = buildStarterStoryPolicyDraft({ localCountryCodes: ["EC"] });
    setEnabled(starter.regionalPricingEnabled);
    setTiers(starter.tiers);
    setAssignments(starter.countryAssignments);
    setDefaultKey(starter.defaultTierKey);
  }

  return (
    <CommunityPricingEditorPage
      countryAssignments={assignments}
      defaultTierKey={defaultKey}
      onCountryAssignmentsChange={setAssignments}
      onDefaultTierKeyChange={setDefaultKey}
      onRegionalPricingEnabledChange={(value) => {
        setEnabled(value);
        if (value && tiers.length === 0 && assignments.length === 0 && !defaultKey) {
          useStarterTemplate();
        }
      }}
      onSave={() => undefined}
      onTiersChange={setTiers}
      onUseStarterTemplate={useStarterTemplate}
      regionalPricingEnabled={enabled}
      tiers={tiers}
    />
  );
}

export const Disabled: Story = {
  args: baseArgs,
  render: () => <InteractiveStory initialAssignments={[]} initialEnabled={false} initialTiers={[]} />,
};

export const Enabled: Story = {
  args: {
    ...baseArgs,
    countryAssignments: defaultAssignments,
    regionalPricingEnabled: true,
  },
  render: () => <InteractiveStory initialAssignments={defaultAssignments} initialEnabled initialTiers={defaultTiers} />,
};

export const EmptyPolicy: Story = {
  args: {
    ...baseArgs,
    regionalPricingEnabled: true,
    tiers: [{ id: "t1", tier_key: "standard", display_name: "Standard", adjustment_type: "multiplier", adjustment_value: 1 }],
  },
  render: () => <InteractiveStory initialAssignments={[]} initialEnabled initialTiers={[{ id: "t1", tier_key: "standard", display_name: "Standard", adjustment_type: "multiplier", adjustment_value: 1 }]} />,
};
