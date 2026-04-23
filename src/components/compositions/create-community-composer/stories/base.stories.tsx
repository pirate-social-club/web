import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { CreateCommunityComposer } from "../create-community-composer";
import type { CreateCommunityComposerProps, IdentityGateDraft } from "../create-community-composer.types";
import type { CourtyardWalletInventoryGroup } from "@/lib/courtyard-inventory-gates";

const baseComposer: CreateCommunityComposerProps = {
  displayName: "American Voices",
  description:
    "A national-interest community where verified context matters, but moderation still needs a safe anonymous layer.",
  databaseRegion: "auto",
  membershipMode: "open",
  defaultAgeGatePolicy: "none",
  allowAnonymousIdentity: true,
  creatorVerificationState: {
    uniqueHumanVerified: true,
    ageOver18Verified: true,
  },
};

const nationalityGateDrafts: IdentityGateDraft[] = [
  { gateType: "nationality", provider: "self", requiredValues: ["USA"] },
];

const meta = {
  title: "Compositions/CreateCommunityComposer",
  component: CreateCommunityComposer,
  args: baseComposer,
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ width: "min(100vw - 32px, 1120px)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CreateCommunityComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "Flow / Default",
  render: () => <CreateCommunityComposer {...baseComposer} />,
};

export const PublicOnly: Story = {
  name: "Flow / Public Only",
  render: () => (
    <CreateCommunityComposer {...baseComposer} allowAnonymousIdentity={false} />
  ),
};

export const AdultOnly: Story = {
  name: "Flow / Adult Only",
  render: () => <CreateCommunityComposer {...baseComposer} defaultAgeGatePolicy="18_plus" initialStep={2} />,
};

export const AccessStep: Story = {
  name: "Flow / Access Step",
  render: () => <CreateCommunityComposer {...baseComposer} initialStep={2} />,
};

export const AccessStepWithNationalityGate: Story = {
  name: "Flow / Access Step With Nationality Gate",
  render: () => (
    <CreateCommunityComposer
      {...baseComposer}
      gateDrafts={[...nationalityGateDrafts]}
      initialStep={2}
      membershipMode="gated"
    />
  ),
};

export const ReviewWithNationalityGate: Story = {
  name: "Flow / Review With Nationality Gate",
  render: () => (
    <CreateCommunityComposer
      {...baseComposer}
      gateDrafts={[...nationalityGateDrafts]}
      initialStep={3}
      membershipMode="gated"
    />
  ),
};

export const ReviewStep: Story = {
  name: "Flow / Review",
  render: () => <CreateCommunityComposer {...baseComposer} initialStep={3} />,
};

export const ReviewWithIndiaRegion: Story = {
  name: "Flow / Review With India Region",
  render: () => (
    <CreateCommunityComposer
      {...baseComposer}
      databaseRegion="aws-ap-south-1"
      initialStep={3}
    />
  ),
};

export const CreatorNotEligible: Story = {
  name: "Flow / Creator Not Eligible",
  render: () => (
    <CreateCommunityComposer
      {...baseComposer}
      creatorVerificationState={{
        uniqueHumanVerified: false,
        ageOver18Verified: false,
      }}
    />
  ),
};

export const AccessStepWithCourtyardWalletLoading: Story = {
  name: "Flow / Courtyard Wallet Loading",
  render: () => (
    <CreateCommunityComposer
      {...baseComposer}
      courtyardInventoryGroups={null}
      courtyardInventoryLoading
      gateDrafts={[]}
      initialStep={2}
      membershipMode="gated"
    />
  ),
};

export const AccessStepWithCourtyardWalletEmpty: Story = {
  name: "Flow / Courtyard Wallet Empty",
  render: () => (
    <CreateCommunityComposer
      {...baseComposer}
      courtyardInventoryGroups={[]}
      gateDrafts={[]}
      initialStep={2}
      membershipMode="gated"
    />
  ),
};

const cardInventory: CourtyardWalletInventoryGroup[] = [
  { category: "trading_card", franchise: "pokemon", subject: "charizard", displayLabel: "Pokemon Charizard", displayDetail: "4 in wallet", count: 4 },
  { category: "trading_card", franchise: "pokemon", subject: "pikachu", displayLabel: "Pokemon Pikachu", displayDetail: "2 in wallet", count: 2 },
  { category: "trading_card", franchise: "magic", subject: "black lotus", displayLabel: "Magic Black Lotus", displayDetail: "1 in wallet", count: 1 },
];

export const AccessStepWithCourtyardWalletCards: Story = {
  name: "Flow / Courtyard Wallet Cards",
  render: () => (
    <CreateCommunityComposer
      {...baseComposer}
      courtyardInventoryGroups={cardInventory}
      gateDrafts={[]}
      initialStep={2}
      membershipMode="gated"
    />
  ),
};

const watchInventory: CourtyardWalletInventoryGroup[] = [
  { category: "watch", brand: "rolex", model: "submariner", reference: "124060", displayLabel: "Rolex Submariner", displayDetail: "2 in wallet", count: 2 },
  { category: "watch", brand: "rolex", model: "gmt-master", displayLabel: "Rolex GMT-Master", displayDetail: "1 in wallet", count: 1 },
  { category: "watch", brand: "omega", model: "speedmaster", displayLabel: "Omega Speedmaster", displayDetail: "1 in wallet", count: 1 },
];

export const AccessStepWithCourtyardWalletWatches: Story = {
  name: "Flow / Courtyard Wallet Watches",
  render: () => (
    <CreateCommunityComposer
      {...baseComposer}
      courtyardInventoryGroups={watchInventory}
      gateDrafts={[]}
      initialStep={2}
      membershipMode="gated"
    />
  ),
};

const courtyardCardGateDrafts: IdentityGateDraft[] = [
  {
    gateType: "erc721_inventory_match",
    chainNamespace: "eip155:137",
    contractAddress: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
    inventoryProvider: "courtyard",
    minQuantity: 3,
    assetFilter: { category: "trading_card", franchise: "Pokemon", subject: "Charizard" },
  },
];

export const ReviewWithCourtyardGate: Story = {
  name: "Flow / Review With Courtyard Gate",
  render: () => (
    <CreateCommunityComposer
      {...baseComposer}
      courtyardInventoryGroups={cardInventory}
      gateDrafts={[...courtyardCardGateDrafts]}
      initialStep={3}
      membershipMode="gated"
    />
  ),
};

export const AdultOnlyMissingAgeProof: Story = {
  name: "Flow / Adult Only Missing Age Proof",
  render: () => (
    <CreateCommunityComposer
      {...baseComposer}
      defaultAgeGatePolicy="18_plus"
      creatorVerificationState={{
        uniqueHumanVerified: true,
        ageOver18Verified: false,
      }}
      initialStep={2}
    />
  ),
};
