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
  { tier_key: "default", adjustment_type: "fixed_price_usd", adjustment_value: 1 },
  { tier_key: "tier_a", adjustment_type: "multiplier", adjustment_value: 0.5 },
  { tier_key: "tier_b", adjustment_type: "fixed_price_usd", adjustment_value: 0.25 },
];

const defaultAssignments: CountryAssignment[] = [
  { country_code: "US", tier_key: "default" },
  { country_code: "IN", tier_key: "tier_a" },
  { country_code: "BR", tier_key: "tier_b" },
];

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
  const [defaultKey, setDefaultKey] = React.useState(initialTiers[0]?.tier_key ?? "default");
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
      onVerificationProviderRequirementChange={setVerificationProviderRequirement}
      onTiersChange={setTiers}
      regionalPricingEnabled={enabled}
      tiers={tiers}
      verificationProviderRequirement={verificationProviderRequirement}
    />
  );
}

export const Disabled: Story = {
  args: {
    countryAssignments: [],
    defaultTierKey: "default",
    regionalPricingEnabled: false,
    tiers: defaultTiers,
    verificationProviderRequirement: null,
  },
  render: () => <InteractiveStory initialAssignments={[]} initialEnabled={false} initialTiers={defaultTiers} />,
};

export const Enabled: Story = {
  args: {
    countryAssignments: defaultAssignments,
    defaultTierKey: "default",
    regionalPricingEnabled: true,
    tiers: defaultTiers,
    verificationProviderRequirement: "self",
  },
  render: () => <InteractiveStory initialAssignments={defaultAssignments} initialEnabled initialTiers={defaultTiers} />,
};

export const EmptyPolicy: Story = {
  args: {
    countryAssignments: [],
    defaultTierKey: "default",
    regionalPricingEnabled: true,
    tiers: [{ tier_key: "default", adjustment_type: "fixed_price_usd", adjustment_value: 1 }],
    verificationProviderRequirement: "self",
  },
  render: () => <InteractiveStory initialAssignments={[]} initialEnabled initialTiers={[{ tier_key: "default", adjustment_type: "fixed_price_usd", adjustment_value: 1 }]} />,
};
