import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommunityGatesEditorPage } from "@/components/compositions/community-gates-editor/community-gates-editor-page";

const meta = {
  title: "Compositions/Moderation/Gates",
  component: CommunityGatesEditorPage,
  args: {
    allowAnonymousIdentity: true,
    anonymousIdentityScope: "community_stable",
    defaultAgeGatePolicy: "18_plus",
    gateDrafts: [],
    membershipMode: "open",
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CommunityGatesEditorPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <CommunityGatesEditorPage
      allowAnonymousIdentity
      anonymousIdentityScope="community_stable"
      defaultAgeGatePolicy="18_plus"
      gateDrafts={[{ gateType: "gender", provider: "self", requiredValue: "F" }]}
      membershipMode="gated"
    />
  ),
};
