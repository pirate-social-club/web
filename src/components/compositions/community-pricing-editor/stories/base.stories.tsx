import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { CommunityPricingEditorPage } from "@/components/compositions/community-pricing-editor/community-pricing-editor-page";
import type { PricingTier, CountryAssignment } from "@/components/compositions/community-pricing-editor/community-pricing-editor-page";

const meta = {
  title: "Compositions/Moderation/Pricing",
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

const baseArgs = {
  countryAssignments: [],
  defaultTierKey: "standard",
  regionalPricingEnabled: false,
  tiers: defaultTiers,
  verificationProviderRequirement: null,
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
  const [defaultKey, setDefaultKey] = React.useState(initialTiers[0]?.tier_key ?? "standard");
  const [verificationProviderRequirement, setVerificationProviderRequirement] = React.useState<"self" | null>(
    initialEnabled ? "self" : null,
  );

  return (
    <CommunityPricingEditorPage
      countryAssignments={assignments}
      defaultTierKey={defaultKey}
      onCountryAssignmentsChange={setAssignments}
      onDefaultTierKeyChange={setDefaultKey}
      onRegionalPricingEnabledChange={setEnabled}
      onSave={() => undefined}
      onVerificationProviderRequirementChange={setVerificationProviderRequirement}
      onTiersChange={setTiers}
      regionalPricingEnabled={enabled}
      tiers={tiers}
      verificationProviderRequirement={verificationProviderRequirement}
    />
  );
}

export const Disabled: Story = {
  args: baseArgs,
  render: () => <InteractiveStory initialAssignments={[]} initialEnabled={false} initialTiers={defaultTiers} />,
};

export const Enabled: Story = {
  args: {
    ...baseArgs,
    countryAssignments: defaultAssignments,
    regionalPricingEnabled: true,
    verificationProviderRequirement: "self",
  },
  render: () => <InteractiveStory initialAssignments={defaultAssignments} initialEnabled initialTiers={defaultTiers} />,
};

export const EmptyPolicy: Story = {
  args: {
    ...baseArgs,
    regionalPricingEnabled: true,
    tiers: [{ id: "t1", tier_key: "standard", display_name: "Standard", adjustment_type: "multiplier", adjustment_value: 1 }],
    verificationProviderRequirement: "self",
  },
  render: () => <InteractiveStory initialAssignments={[]} initialEnabled initialTiers={[{ id: "t1", tier_key: "standard", display_name: "Standard", adjustment_type: "multiplier", adjustment_value: 1 }]} />,
};
